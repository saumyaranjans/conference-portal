import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addTrackChair, removeTrackChair } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ChairInviteComposer } from "@/components/ChairInviteComposer";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { AssignPaperEditor } from "@/components/AssignPaperEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import { isAuthorOf } from "@/lib/coi";
import {
  DELETABLE_SUBMISSION_STATUSES,
  type Profile,
  type ReviewStats,
  type Submission,
  type Track,
} from "@/lib/types";

export default async function ChiefDashboard() {
  await requireRole("chief");
  const supabase = await createClient();

  const [{ data: subs }, { data: tracks }, { data: staff }, { data: confStats }] =
    await Promise.all([
      supabase
        .from("submissions")
        .select("*, tracks(name, code), submission_authors(full_name, email, affiliation), author:profiles!submissions_author_id_fkey(full_name, email, affiliation)")
        .neq("status", "draft")
        .order("updated_at", { ascending: false }),
      supabase
        .from("tracks")
        .select(
          // track_editors points at profiles twice (profile_id, invited_by),
          // so the chair embed must name its foreign key or PostgREST refuses.
          "*, track_editors(profile_id, status, profiles!track_editors_profile_id_fkey(id, full_name, email, affiliation))"
        )
        .order("name"),
      supabase.from("profiles").select("*").eq("is_active", true),
      supabase.from("conference_stats").select("*"),
    ]);

  const submissions = (subs ?? []) as (Submission & { tracks: any })[];

  // Chairs are per track, so the Convener may only hand a paper to someone who
  // already chairs its track — and never to one of its own authors.
  const chairsByTrack = new Map<string, { id: string; full_name: string | null; email: string | null }[]>();
  for (const t of ((tracks ?? []) as any[])) {
    chairsByTrack.set(
      t.id,
      (t.track_editors ?? [])
        .filter((te: any) => te.status === "accepted")
        .map((te: any) => te.profiles)
        .filter(Boolean)
    );
  }

  // Invited but not yet accepted — they cannot hold a paper, but the Convener
  // should see that someone is already being asked.
  const invitedByTrack = new Map<string, number>();
  for (const t of ((tracks ?? []) as any[])) {
    invitedByTrack.set(
      t.id,
      (t.track_editors ?? []).filter((te: any) => te.status !== "accepted").length
    );
  }

  const editorNames = new Map<string, string>();
  for (const p of ((staff ?? []) as Profile[])) {
    editorNames.set(p.id, p.full_name || p.email);
  }

  const [{ data: statsRows }, { data: pendingDecisions }] = await Promise.all([
    submissions.length
      ? supabase
          .from("submission_review_stats")
          .select("*")
          .in("submission_id", submissions.map((s) => s.id))
      : Promise.resolve({ data: [] }),
    supabase
      .from("decisions")
      .select(
        "*, submissions(id, title, status), profiles!decisions_decided_by_fkey(full_name)"
      )
      .eq("is_final", false)
      .order("created_at", { ascending: false }),
  ]);

  const stats = new Map<string, ReviewStats>(
    ((statsRows ?? []) as ReviewStats[]).map((r) => [r.submission_id, r])
  );

  // A recommendation is still awaiting the chief if the paper hasn't moved
  // to a terminal state yet.
  const awaiting = ((pendingDecisions ?? []) as any[]).filter((d) =>
    ["submitted", "under_review"].includes(d.submissions?.status)
  );

  const totals = ((confStats ?? []) as any[])[0] ?? {};
  const editors = ((staff ?? []) as Profile[]).filter((p) =>
    p.roles.includes("editor")
  );

  // Open (non-final) submission count per track, for the chair-invitation email.
  const openByTrack: Record<string, number> = {};
  for (const s of submissions) {
    if (s.track_id && ["submitted", "under_review"].includes(s.status)) {
      openByTrack[s.track_id] = (openByTrack[s.track_id] ?? 0) + 1;
    }
  }

  return (
    <>
      <PageHeader
        title="Convener"
        subtitle="Final decisions, track editors, and conference-wide progress."
        action={
          <a href="/api/reports/submissions" className="btn-secondary">
            Export submissions CSV
          </a>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Submissions" value={totals.total_submissions ?? 0} />
        <StatCard label="Under review" value={totals.under_review ?? 0} />
        <StatCard label="Awaiting your call" value={awaiting.length} />
        <StatCard label="Accepted" value={totals.accepted ?? 0} />
        <StatCard label="Rejected" value={totals.rejected ?? 0} />
      </div>

      {/* Stage-wise analytics now lives on its own sidebar page: /chief/analytics */}

      {/* ---- Recommendations awaiting ratification ---- */}
      <Section title="Awaiting your decision">
        {awaiting.length === 0 ? (
          <EmptyState
            title="Nothing pending"
            description="Editor recommendations will appear here for ratification."
          />
        ) : (
          <div className="space-y-3">
            {awaiting.map((d) => (
              <div
                key={d.id}
                className="card card-pad flex flex-wrap items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {d.submissions?.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {d.profiles?.full_name ?? "An editor"} recommends{" "}
                    <span className="font-medium capitalize">
                      {d.decision.replace("_", " ")}
                    </span>{" "}
                    · {formatDate(d.created_at)}
                  </p>
                  {d.rationale && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {d.rationale}
                    </p>
                  )}
                </div>
                <Link
                  href={`/chief/submissions/${d.submissions?.id}`}
                  className="btn-primary shrink-0"
                >
                  Review & decide
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ---- Invite a Track Editor by email ---- */}
      <Section title="Invite a Track Editor">
        <ChairInviteComposer
          editors={editors.map((e) => ({
            id: e.id,
            full_name: e.full_name,
            email: e.email,
          }))}
          tracks={((tracks ?? []) as Track[]).map((t) => ({
            id: t.id,
            name: t.name,
          }))}
          openByTrack={openByTrack}
        />
      </Section>

      {/* ---- Tracks and their Track Editors ---- */}
      <Section title="Tracks & Track Editors">
        <div className="card divide-y divide-slate-100">
          {((tracks ?? []) as (Track & { track_editors: any[] })[]).map((t) => {
            const chairs = t.track_editors ?? [];
            const chairIds = new Set(chairs.map((c) => c.profile_id));
            return (
              <div key={t.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {t.name}
                    </p>
                    {chairs.length === 0 ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        No Track Editor assigned yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {chairs.map((c) => (
                          <span
                            key={c.profile_id}
                            className={`badge inline-flex items-center gap-1.5 ${
                              c.status === "accepted"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-900"
                            }`}
                            title={
                              c.status === "accepted"
                                ? "Accepted the invitation"
                                : "Invited — not yet accepted"
                            }
                          >
                            {c.profiles?.full_name || c.profiles?.email}
                            {c.status !== "accepted" && " · invited"}
                            <ActionForm action={removeTrackChair}>
                              <input type="hidden" name="track_id" value={t.id} />
                              <input
                                type="hidden"
                                name="editor_id"
                                value={c.profile_id}
                              />
                              <button
                                type="submit"
                                className="text-blue-700 hover:text-blue-900 leading-none"
                                aria-label="Remove chair"
                                title="Remove chair"
                              >
                                ×
                              </button>
                            </ActionForm>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ActionForm action={addTrackChair} className="flex gap-2">
                    <input type="hidden" name="track_id" value={t.id} />
                    <select
                      name="editor_id"
                      defaultValue=""
                      className="input py-1.5 text-sm"
                    >
                      <option value="">Select a Track Editor…</option>
                      {editors
                        .filter((e) => !chairIds.has(e.id))
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.full_name || e.email}
                          </option>
                        ))}
                    </select>
                    <SubmitButton variant="secondary" className="text-sm py-1.5">
                      Assign
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            );
          })}
        </div>

      </Section>

      {/* ---- Full submission list ---- */}
      <Section title="All submissions">
        {submissions.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <DataTable
            headers={["Paper ID", "Title", "Track", "Status", "Track Editor", "Reviews", "Avg", "Updated", ""]}
          >
            {submissions.map((s) => {
              const st = stats.get(s.id);
              const authors = [
                ...(((s as any).submission_authors ?? []) as any[]),
                ...((s as any).author ? [(s as any).author] : []),
              ];
              // Only this track's chairs, and never one of its own authors.
              const eligible = (chairsByTrack.get((s as any).track_id) ?? [])
                .filter((c) => !isAuthorOf(c, authors))
                .map((c) => ({ id: c.id, name: c.full_name || c.email || "—" }));
              const assignedId = (s as any).assigned_editor_id ?? null;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                    {s.paper_id ?? "—"}
                  </td>
                  <td className="td font-medium text-slate-900 max-w-xs">
                    {s.title}
                  </td>
                  <td className="td text-slate-500">{s.tracks?.name ?? "—"}</td>
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="td">
                    <AssignPaperEditor
                      submissionId={s.id}
                      chairs={eligible}
                      invitedCount={invitedByTrack.get((s as any).track_id) ?? 0}
                      currentId={assignedId}
                      defaultLabel={
                        eligible.length === 1
                          ? `${eligible[0].name} (track editor)`
                          : "Any Track Editor on this track"
                      }
                    />
                    {assignedId && (
                      <span className="badge bg-blue-100 text-blue-800 mt-1 inline-block">
                        Assigned by you
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {st?.completed_count ?? 0}/{st?.assigned_count ?? 0}
                  </td>
                  <td className="td">{st?.avg_score ?? "—"}</td>
                  <td className="td text-slate-500">{formatDate(s.updated_at)}</td>
                  <td className="td text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/chief/submissions/${s.id}`}
                        className="text-blue-700 hover:underline text-sm font-medium"
                      >
                        Open
                      </Link>
                      {DELETABLE_SUBMISSION_STATUSES.includes(s.status) && (
                        <DeleteSubmissionButton id={s.id} compact />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Section>
    </>
  );
}
