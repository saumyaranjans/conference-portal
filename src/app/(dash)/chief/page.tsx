import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addTrackChair, removeTrackChair } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ChairInviteComposer } from "@/components/ChairInviteComposer";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
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
        .select("*, tracks(name, code)")
        .neq("status", "draft")
        .order("updated_at", { ascending: false }),
      supabase
        .from("tracks")
        .select(
          "*, track_editors(profile_id, profiles(id, full_name, email))"
        )
        .order("name"),
      supabase.from("profiles").select("*").eq("is_active", true),
      supabase.from("conference_stats").select("*"),
    ]);

  const submissions = (subs ?? []) as (Submission & { tracks: any })[];

  const [{ data: statsRows }, { data: pendingDecisions }] = await Promise.all([
    submissions.length
      ? supabase
          .from("submission_review_stats")
          .select("*")
          .in("submission_id", submissions.map((s) => s.id))
      : Promise.resolve({ data: [] }),
    supabase
      .from("decisions")
      .select("*, submissions(id, title, status), profiles(full_name)")
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

      {/* ---- Track chairs (multiple per track) ---- */}
      <Section title="Tracks & chairs">
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
                        No chair assigned
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {chairs.map((c) => (
                          <span
                            key={c.profile_id}
                            className="badge bg-blue-100 text-blue-800 inline-flex items-center gap-1.5"
                          >
                            {c.profiles?.full_name || c.profiles?.email}
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
                      <option value="">Add a chair…</option>
                      {editors
                        .filter((e) => !chairIds.has(e.id))
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.full_name || e.email}
                          </option>
                        ))}
                    </select>
                    <SubmitButton variant="secondary" className="text-sm py-1.5">
                      Add
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            );
          })}
        </div>

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

      {/* ---- Full submission list ---- */}
      <Section title="All submissions">
        {submissions.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <DataTable
            headers={["Paper ID", "Title", "Track", "Status", "Reviews", "Avg", "Updated", ""]}
          >
            {submissions.map((s) => {
              const st = stats.get(s.id);
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
