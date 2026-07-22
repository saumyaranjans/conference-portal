import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignTrackEditor } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
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
        .select("*, tracks(name)")
        .neq("status", "draft")
        .order("updated_at", { ascending: false }),
      supabase.from("tracks").select("*, profiles(full_name, email)").order("name"),
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

      {/* ---- Track editor assignment ---- */}
      <Section title="Tracks & editors">
        <div className="card divide-y divide-slate-100">
          {((tracks ?? []) as (Track & { profiles: any })[]).map((t) => (
            <div key={t.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.profiles
                      ? `Editor: ${t.profiles.full_name || t.profiles.email}`
                      : "No editor assigned"}
                  </p>
                </div>
                <ActionForm action={assignTrackEditor} className="flex gap-2">
                  <input type="hidden" name="track_id" value={t.id} />
                  <select
                    name="editor_id"
                    defaultValue={t.editor_id ?? ""}
                    className="input py-1.5 text-sm"
                  >
                    <option value="">— Unassigned —</option>
                    {editors.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name || e.email}
                      </option>
                    ))}
                  </select>
                  <SubmitButton variant="secondary" className="text-sm py-1.5">
                    Save
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          ))}
        </div>
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
