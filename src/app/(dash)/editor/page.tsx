import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import type { ReviewStats, Submission, Track } from "@/lib/types";

export default async function EditorDashboard() {
  const profile = await requireRole("editor");
  const supabase = await createClient();

  // The tracks this person chairs define their whole queue.
  const { data: chairRows } = await supabase
    .from("track_editors")
    .select("track_id, tracks(id, name)")
    .eq("profile_id", profile.id);

  const tracks = ((chairRows ?? []) as any[])
    .map((r) => r.tracks)
    .filter(Boolean) as Track[];
  const trackIds = tracks.map((t) => t.id);

  const { data: subs } = trackIds.length
    ? await supabase
        .from("submissions")
        .select("*, tracks(name)")
        .in("track_id", trackIds)
        .neq("status", "draft")
        .order("submitted_at", { ascending: true })
    : { data: [] };

  // Conflict of interest: a chair does not handle a paper they authored.
  const submissions = ((subs ?? []) as (Submission & {
    tracks: { name: string } | null;
  })[]).filter((s) => s.author_id !== profile.id);

  const { data: statsRows } = submissions.length
    ? await supabase
        .from("submission_review_stats")
        .select("*")
        .in(
          "submission_id",
          submissions.map((s) => s.id)
        )
    : { data: [] };

  const stats = new Map<string, ReviewStats>(
    ((statsRows ?? []) as ReviewStats[]).map((r) => [r.submission_id, r])
  );

  const needsReviewers = submissions.filter(
    (s) =>
      ["submitted", "under_review"].includes(s.status) &&
      (stats.get(s.id)?.assigned_count ?? 0) < 3
  ).length;

  const readyToDecide = submissions.filter((s) => {
    const st = stats.get(s.id);
    return (
      s.status === "under_review" &&
      st &&
      st.completed_count >= 2 &&
      st.completed_count >= st.accepted_count
    );
  }).length;

  if (trackIds.length === 0) {
    return (
      <>
        <PageHeader title="Track Queue" />
        <EmptyState
          title="You are not assigned to a track yet"
          description="The Convener assigns track editors to tracks. Once assigned, submissions will appear here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Track Queue"
        subtitle={`Editing: ${((tracks ?? []) as Track[])
          .map((t) => t.name)
          .join(", ")}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="In queue" value={submissions.length} />
        <StatCard
          label="Need reviewers"
          value={needsReviewers}
          hint="Fewer than 3 assigned"
        />
        <StatCard
          label="Ready to decide"
          value={readyToDecide}
          hint="2+ reviews complete"
        />
        <StatCard
          label="Decided"
          value={
            submissions.filter((s) =>
              ["accepted", "rejected", "revisions_requested"].includes(s.status)
            ).length
          }
        />
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions in your track yet"
          description="Papers appear here as soon as authors submit them."
        />
      ) : (
        <DataTable
          headers={[
            "Paper ID",
            "Title",
            "Status",
            "Reviews",
            "Avg score",
            "Submitted",
            "",
          ]}
        >
          {submissions.map((s) => {
            const st = stats.get(s.id);
            const complete = st?.completed_count ?? 0;
            const assigned = st?.assigned_count ?? 0;
            return (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                  {s.paper_id ?? "—"}
                </td>
                <td className="td font-medium text-slate-900 max-w-sm">
                  {s.title}
                  <span className="block text-xs font-normal text-slate-400">
                    v{s.version}
                  </span>
                </td>
                <td className="td">
                  <StatusBadge status={s.status} />
                </td>
                <td className="td">
                  <span
                    className={
                      assigned === 0
                        ? "text-red-600 font-medium"
                        : complete < 2
                          ? "text-amber-600"
                          : "text-emerald-700"
                    }
                  >
                    {complete}/{assigned}
                  </span>
                </td>
                <td className="td">{st?.avg_score ?? "—"}</td>
                <td className="td text-slate-500">
                  {formatDate(s.submitted_at)}
                </td>
                <td className="td text-right">
                  <Link
                    href={`/editor/submissions/${s.id}`}
                    className="text-blue-700 hover:underline text-sm font-medium"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
