import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { removeTrackChair } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ChairInviteComposer } from "@/components/ChairInviteComposer";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { AssignPaperEditor } from "@/components/AssignPaperEditor";
import { RemindTrackEditor } from "@/components/RemindTrackEditor";
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

  // Registration collections recorded by the Editorial Office. That evidence
  // table is admin-only, so read it with the service client after the chief
  // check. Defensive: if the certificate migration isn't applied yet the query
  // returns nothing and the section simply doesn't show.
  const { data: feeEvidence } = await createAdminClient()
    .from("participant_certificate_evidence")
    .select("amount_paid, currency, registration_fee_paid, glogift_member");
  const collectionsByCurrency = new Map<string, number>();
  let memberCount = 0;
  for (const e of (feeEvidence ?? []) as any[]) {
    if (e.glogift_member) memberCount += 1;
    if (e.registration_fee_paid && e.amount_paid) {
      const cur = e.currency ?? "INR";
      collectionsByCurrency.set(cur, (collectionsByCurrency.get(cur) ?? 0) + Number(e.amount_paid));
    }
  }
  const collections = [...collectionsByCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount, tax: amount * 0.18, total: amount * 1.18 }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
  const money = (cur: string, n: number) =>
    `${cur === "INR" ? "₹" : cur === "USD" ? "$" : cur + " "}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

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

  const [{ data: statsRows }] = await Promise.all([
    submissions.length
      ? supabase
          .from("submission_review_stats")
          .select("*")
          .in("submission_id", submissions.map((s) => s.id))
      : Promise.resolve({ data: [] }),
  ]);

  const { data: overdueRows } = await supabase
    .from("assignments")
    .select("submission_id, due_date, status")
    .not("due_date", "is", null)
    .lt("due_date", new Date().toISOString())
    .neq("status", "submitted");

  const stats = new Map<string, ReviewStats>(
    ((statsRows ?? []) as ReviewStats[]).map((r) => [r.submission_id, r])
  );

  const totals = ((confStats ?? []) as any[])[0] ?? {};

  // Live papers with nobody handling them — the Convener's first job.
  const LIVE = ["submitted", "under_review", "revisions_requested", "abstract_accepted"];
  const pendingAssignment = submissions.filter(
    (s) => !(s as any).assigned_editor_id && LIVE.includes(s.status)
  ).length;

  const overdueBySubmission = new Set(
    ((overdueRows as any[]) ?? []).map((r) => r.submission_id)
  );

  // What each Track Editor is holding, and how it is going.
  type EditorRow = {
    id: string;
    name: string;
    abstracts: number;
    aUnder: number;
    aAccepted: number;
    aRejected: number;
    papers: number;
    mUnder: number;
    mAccepted: number;
    mRejected: number;
    missed: number;
  };
  const summary = new Map<string, EditorRow>();
  const rowFor = (id: string): EditorRow => {
    if (!summary.has(id)) {
      summary.set(id, {
        id,
        name: editorNames.get(id) ?? "—",
        abstracts: 0,
        aUnder: 0,
        aAccepted: 0,
        aRejected: 0,
        papers: 0,
        mUnder: 0,
        mAccepted: 0,
        mRejected: 0,
        missed: 0,
      });
    }
    return summary.get(id)!;
  };

  // Everyone who holds a track appears, even with nothing assigned yet.
  for (const t of ((tracks ?? []) as any[])) {
    for (const te of t.track_editors ?? []) {
      if (te.status === "accepted" && te.profiles?.id) rowFor(te.profiles.id);
    }
  }

  for (const sub of submissions) {
    const owner = (sub as any).assigned_editor_id as string | null;
    if (!owner) continue;
    const r = rowFor(owner);
    const isAbstract = (sub as any).stage !== "full_paper";
    const decided =
      sub.status === "accepted"
        ? "accepted"
        : sub.status === "rejected"
          ? "rejected"
          : "under";
    if (isAbstract) {
      r.abstracts += 1;
      if (decided === "accepted") r.aAccepted += 1;
      else if (decided === "rejected") r.aRejected += 1;
      else r.aUnder += 1;
    } else {
      r.papers += 1;
      if (decided === "accepted") r.mAccepted += 1;
      else if (decided === "rejected") r.mRejected += 1;
      else r.mUnder += 1;
    }
    if (overdueBySubmission.has(sub.id)) r.missed += 1;
  }

  const editorSummary = [...summary.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
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
        <StatCard
          label="Pending Track Editor assignment"
          value={pendingAssignment}
        />
        <StatCard label="Submissions" value={totals.total_submissions ?? 0} />
        <StatCard label="Under review" value={totals.under_review ?? 0} />
        <StatCard label="Accepted" value={totals.accepted ?? 0} />
        <StatCard label="Rejected" value={totals.rejected ?? 0} />
      </div>

      {/* ---- Registration collections (from Editorial Office amounts) ---- */}
      {collections.length > 0 && (
        <Section title="Registration collections">
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {collections.map((c) => (
              <div
                key={c.currency}
                className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
              >
                <div>
                  <span className="block text-xs text-slate-500">Currency</span>
                  {c.currency}
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Total tax (18%)</span>
                  {money(c.currency, c.tax)}
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Total amount</span>
                  {money(c.currency, c.amount)}
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Grand total (incl. tax)</span>
                  <span className="font-medium">{money(c.currency, c.total)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Based on amounts recorded by the Editorial Office; tax is 18% of the
            amount. {memberCount} GLOGIFT member
            {memberCount === 1 ? "" : "s"} recorded.
          </p>
        </Section>
      )}

      {/* Stage-wise analytics now lives on its own sidebar page: /chief/analytics */}

      {/* ---- What each Track Editor is holding ---- */}
      <Section title="Decisions taken">
        {editorSummary.length === 0 ? (
          <EmptyState
            title="No Track Editors yet"
            description="Assign Track Editors to tracks below, then hand them papers from the list at the foot of this page."
          />
        ) : (
          <DataTable
            headers={[
              "Track Editor",
              "Abstracts",
              "Abstract decisions",
              "Manuscripts",
              "Manuscript decisions",
              "Missed deadline",
              "",
            ]}
          >
            {editorSummary.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-900">{e.name}</td>
                <td className="td">{e.abstracts}</td>
                <td className="td text-xs text-slate-600">
                  {e.abstracts === 0 ? (
                    "—"
                  ) : (
                    <>
                      {e.aUnder} under review · {e.aAccepted} accepted ·{" "}
                      {e.aRejected} rejected
                    </>
                  )}
                </td>
                <td className="td">{e.papers}</td>
                <td className="td text-xs text-slate-600">
                  {e.papers === 0 ? (
                    "—"
                  ) : (
                    <>
                      {e.mUnder} under review · {e.mAccepted} accepted ·{" "}
                      {e.mRejected} rejected
                    </>
                  )}
                </td>
                <td className="td">
                  {e.missed > 0 ? (
                    <span className="badge bg-amber-100 text-amber-900">
                      {e.missed}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="td text-right">
                  <RemindTrackEditor
                    editorId={e.id}
                    name={e.name}
                    pending={e.aUnder + e.mUnder}
                    missed={e.missed}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
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
