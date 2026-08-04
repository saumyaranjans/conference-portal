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
      "id, status, due_date, round, reviewer_number, reviewer_id, reviewer:profiles!assignments_reviewer_id_fkey(id, full_name, email, mobile, affiliation, institution), submissions!inner(paper_id, title, submitted_at, created_at, submission_type, editor:profiles!submissions_assigned_editor_id_fkey(full_name), tracks(code, name), submission_authors(full_name, is_corresponding, author_order)), reviews(recommendation, is_submitted)"
    );

  const list = ((data ?? []) as any[]).filter((a) => a.reviewer && a.reviewer.email);
  const today = new Date();

  // Which reviewers already have a generated certificate.
  const reviewerIds = [
    ...new Set(list.map((a) => a.reviewer?.id).filter(Boolean)),
  ];
  const { data: certs } = reviewerIds.length
    ? await admin
        .from("reviewer_certificates")
        .select("recipient_profile_id")
        .in("recipient_profile_id", reviewerIds)
    : { data: [] as any[] };
  const certSet = new Set(
    ((certs ?? []) as any[]).map((c) => c.recipient_profile_id)
  );

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
      const authors = [...(a.submissions?.submission_authors ?? [])].sort(
        (x: any, y: any) => (x.author_order ?? 0) - (y.author_order ?? 0)
      );
      const corresponding =
        authors.find((x: any) => x.is_corresponding)?.full_name ?? null;
      const coAuthors = authors
        .filter((x: any) => !x.is_corresponding)
        .map((x: any) => x.full_name);
      return {
        paperId: a.submissions?.paper_id ?? "—",
        reviewerNumber: a.reviewer_number ?? null,
        title: a.submissions?.title ?? "",
        trackCode: a.submissions?.tracks?.code ?? "—",
        trackName: a.submissions?.tracks?.name ?? "—",
        submittedAt: a.submissions?.submitted_at ?? a.submissions?.created_at ?? null,
        corresponding,
        coAuthors,
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
      certGenerated: certSet.has(p.id),
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
