import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import {
  SubmissionManagement,
  type SubmissionRow,
} from "@/components/SubmissionManagement";

/**
 * Submission Management — every paper in the conference on one page, with the
 * whole story of each: authors, track, pathway, the reviewers and what they
 * recommended, the decision, the integrity scores, and the files.
 *
 * The other management pages are indexed by PERSON (reviewer, track editor,
 * author). This one is indexed by PAPER, which is what the Convener and the
 * Editorial Office actually chase during the review cycle.
 */
export async function SubmissionManagementView({
  detailBase = "/chief/submissions",
  canRecordIntegrity = false,
}: {
  /** Where a paper row links to. Admins pass every role check, so the
   *  Convener's paper page serves both. */
  detailBase?: string;
  /** Editorial Office only: enter the integrity scores. */
  canRecordIntegrity?: boolean;
} = {}) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("submissions")
    .select(
      "id, paper_id, title, status, stage, submission_type, participation_mode, version, " +
        "created_at, submitted_at, updated_at, file_name, camera_ready_file_name, camera_ready_at, " +
        "similarity_index, ai_percentage, integrity_provider, integrity_checked_at, " +
        "tracks(code, name), " +
        "author:profiles!submissions_author_id_fkey(full_name, email, affiliation), " +
        "editor:profiles!submissions_assigned_editor_id_fkey(full_name, email), " +
        "submission_authors(full_name, email, affiliation, is_corresponding, author_order, registration_confirmed, registration_fee_paid), " +
        "assignments(status, round, reviewer_number, due_date, reviewer:profiles!assignments_reviewer_id_fkey(full_name, email), reviews(recommendation, is_submitted, created_at)), " +
        "decisions(decision, created_at, decided_by, profiles!decisions_decided_by_fkey(full_name))"
    )
    .neq("status", "draft")
    .order("paper_id");

  const rows: SubmissionRow[] = ((data ?? []) as any[]).map((s) => {
    const authors = (s.submission_authors ?? [])
      .slice()
      .sort((a: any, b: any) => (a.author_order ?? 99) - (b.author_order ?? 99));

    const reviewers = (s.assignments ?? []).map((a: any) => {
      // `reviews` embeds as an array here; a submitted review is the one that
      // carries the recommendation.
      const rv = Array.isArray(a.reviews) ? a.reviews : a.reviews ? [a.reviews] : [];
      const submitted = rv.find((r: any) => r?.is_submitted) ?? rv[0] ?? null;
      return {
        name: a.reviewer?.full_name ?? a.reviewer?.email ?? "—",
        number: a.reviewer_number ?? null,
        status: a.status as string,
        round: a.round ?? null,
        dueDate: a.due_date ?? null,
        recommendation: submitted?.is_submitted ? submitted.recommendation ?? null : null,
      };
    });

    const decisions = (s.decisions ?? [])
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((d: any) => ({
        decision: d.decision as string,
        at: d.created_at as string,
        by: d.profiles?.full_name ?? null,
      }));

    return {
      id: s.id,
      paperId: s.paper_id ?? "—",
      title: s.title,
      status: s.status,
      stage: s.stage,
      pathway: s.submission_type === "full_paper_presentation" ? "B" : "A",
      participationMode: s.participation_mode ?? null,
      version: s.version ?? 1,
      trackCode: s.tracks?.code ?? "—",
      trackName: s.tracks?.name ?? "Unassigned",
      corresponding:
        authors.find((a: any) => a.is_corresponding)?.full_name ??
        s.author?.full_name ??
        s.author?.email ??
        "—",
      correspondingEmail:
        authors.find((a: any) => a.is_corresponding)?.email ?? s.author?.email ?? null,
      affiliation:
        authors.find((a: any) => a.is_corresponding)?.affiliation ??
        s.author?.affiliation ??
        null,
      authors: authors.map((a: any) => ({
        name: a.full_name ?? a.email ?? "—",
        email: a.email ?? null,
        affiliation: a.affiliation ?? null,
        corresponding: Boolean(a.is_corresponding),
        registered: Boolean(a.registration_confirmed || a.registration_fee_paid),
      })),
      editor: s.editor?.full_name ?? s.editor?.email ?? null,
      reviewers,
      decisions,
      similarity: s.similarity_index ?? null,
      aiPercent: s.ai_percentage ?? null,
      integrityProvider: s.integrity_provider ?? "manual",
      integrityCheckedAt: s.integrity_checked_at ?? null,
      hasAbstractFile: Boolean(s.file_name),
      hasCameraReady: Boolean(s.camera_ready_file_name),
      submittedAt: s.submitted_at ?? s.created_at,
      updatedAt: s.updated_at,
    };
  });

  const trackMap = new Map<string, string>();
  for (const r of rows) if (r.trackCode !== "—") trackMap.set(r.trackCode, r.trackName);
  const tracks = [...trackMap.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <PageHeader
        title="Submission Management"
        subtitle="Every paper in the conference — authors, track, pathway, reviewers, decision and integrity scores."
      />
      <SubmissionManagement
        rows={rows}
        tracks={tracks}
        detailBase={detailBase}
        canRecordIntegrity={canRecordIntegrity}
      />
    </>
  );
}
