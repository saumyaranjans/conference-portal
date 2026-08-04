import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import {
  ReviewerManagement,
  type ReviewerRow,
  type ReviewerAssignment,
} from "@/components/ReviewerManagement";

/**
 * Reviewer Management — a per-reviewer directory: who they are, the papers
 * assigned to them and each assignment's state (invited / in-progress /
 * completed / declined), plus workload counts. Shared by Convener + Office.
 */
export async function ReviewerManagementView() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("assignments")
    .select(
      "id, status, due_date, round, reviewer_number, reviewer_id, reviewer:profiles!assignments_reviewer_id_fkey(id, full_name, email, mobile, affiliation, institution), submissions!inner(paper_id, submission_type, editor:profiles!submissions_assigned_editor_id_fkey(full_name), tracks(code, name)), reviews(recommendation, is_submitted)"
    );

  const list = ((data ?? []) as any[]).filter((a) => a.reviewer && a.reviewer.email);
  const today = new Date();

  const byReviewer = new Map<string, any[]>();
  for (const a of list) {
    const key = (a.reviewer.email ?? "").trim().toLowerCase();
    if (!key) continue;
    const arr = byReviewer.get(key) ?? [];
    arr.push(a);
    byReviewer.set(key, arr);
  }

  const rows: ReviewerRow[] = [...byReviewer.values()].map((items) => {
    const p = items[0].reviewer;
    const assignments: ReviewerAssignment[] = items.map((a) => {
      const rev = Array.isArray(a.reviews) ? a.reviews[0] : a.reviews;
      const overdue =
        a.status === "accepted" &&
        !!a.due_date &&
        new Date(a.due_date) < today;
      return {
        paperId: a.submissions?.paper_id ?? "—",
        trackCode: a.submissions?.tracks?.code ?? "—",
        trackName: a.submissions?.tracks?.name ?? "—",
        pathway: (a.submissions?.submission_type === "full_paper_presentation"
          ? "B"
          : "A") as "A" | "B",
        status: a.status,
        recommendation: rev?.recommendation ?? null,
        handlingEditor: a.submissions?.editor?.full_name ?? null,
        round: a.round ?? null,
        overdue,
      };
    });
    const counts = {
      assigned: assignments.length,
      invited: assignments.filter((x) => x.status === "invited").length,
      accepted: assignments.filter((x) => x.status === "accepted").length,
      completed: assignments.filter((x) => x.status === "submitted").length,
      declined: assignments.filter((x) => x.status === "declined").length,
      overdue: assignments.filter((x) => x.overdue).length,
      pathwayA: assignments.filter((x) => x.pathway === "A").length,
      pathwayB: assignments.filter((x) => x.pathway === "B").length,
    };
    // Reviewer number (stable per submission; in practice the same across a
    // reviewer's papers). Show the distinct value(s).
    const reviewerNo = [
      ...new Set(
        items.map((a) => a.reviewer_number).filter((n) => n != null)
      ),
    ]
      .sort((a, b) => a - b)
      .join(" · ");
    return {
      name: p.full_name || p.email,
      mobile: p.mobile || null,
      email: p.email,
      affiliation: p.affiliation || p.institution || null,
      reviewerNo,
      assignments,
      trackCodes: [...new Set(assignments.map((x) => x.trackCode))].filter(
        (c) => c !== "—"
      ),
      counts,
    };
  });

  const tracks = [
    ...new Map(
      list
        .filter((a) => a.submissions?.tracks?.code)
        .map((a) => [
          a.submissions.tracks.code,
          { code: a.submissions.tracks.code, name: a.submissions.tracks.name },
        ])
    ).values(),
  ].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <PageHeader
        title="Reviewer Management"
        subtitle="Every reviewer and their assignments — invitation, progress and completion status, with per-reviewer workload."
      />
      <ReviewerManagement rows={rows} tracks={tracks} />
    </>
  );
}
