import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import { findConflicts } from "@/lib/programmeAllocator";
import {
  ProgrammeBoard,
  type BoardSession,
  type ChairCandidate,
} from "@/components/ProgrammeBoard";

/**
 * Convener's programme board: the whole conference schedule in one place, from
 * generated draft through approval to publication.
 */
export async function ProgrammeBoardView({
  basePath = "/chief/programme",
}: {
  basePath?: string;
} = {}) {
  const admin = createAdminClient();

  const { data: conference } = await admin
    .from("conferences")
    .select("id")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  const conferenceId = (conference as any)?.id ?? null;

  const { data: rawSessions } = conferenceId
    ? await admin
        .from("conference_sessions")
        .select(
          "id, title, mode, session_date, time_slot, academic_block, classroom, meeting_link, " +
            "status, has_unpublished_changes, published_at, approved_at, max_papers, sort_order, " +
            "tracks(code, name), " +
            "session_papers(id, sort_order, submissions!inner(id, paper_id, title, submission_authors(full_name, email, affiliation, designation, is_corresponding, author_order))), " +
            "session_chairs(id, bio, profiles!inner(id, full_name, designation, affiliation)), " +
            "session_volunteers(id, full_name, email, mobile)"
        )
        .eq("conference_id", conferenceId)
        .order("session_date")
        .order("sort_order")
    : { data: [] as any[] };

  const sessions: BoardSession[] = ((rawSessions ?? []) as any[]).map((s) => ({
    id: s.id,
    title: s.title,
    mode: s.mode,
    sessionDate: s.session_date,
    timeSlot: s.time_slot,
    academicBlock: s.academic_block,
    classroom: s.classroom,
    meetingLink: s.meeting_link,
    status: s.status,
    hasUnpublishedChanges: Boolean(s.has_unpublished_changes),
    publishedAt: s.published_at,
    approvedAt: s.approved_at,
    trackCode: s.tracks?.code ?? null,
    trackName: s.tracks?.name ?? null,
    papers: (s.session_papers ?? [])
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((sp: any, i: number) => ({
        rowId: sp.id,
        sequence: i + 1,
        submissionId: sp.submissions.id,
        paperId: sp.submissions.paper_id ?? "—",
        title: sp.submissions.title ?? "",
        authors: (sp.submissions.submission_authors ?? [])
          .slice()
          .sort((a: any, b: any) => (a.author_order ?? 99) - (b.author_order ?? 99))
          .map((a: any) => ({
            name: a.full_name ?? a.email ?? "—",
            email: a.email ?? null,
            affiliation: a.affiliation ?? null,
            designation: a.designation ?? null,
            corresponding: Boolean(a.is_corresponding),
          })),
      })),
    chairs: (s.session_chairs ?? []).map((c: any) => ({
      id: c.id,
      name: c.profiles?.full_name ?? "—",
      designation: c.profiles?.designation ?? null,
      affiliation: c.profiles?.affiliation ?? null,
      bio: c.bio ?? null,
    })),
    volunteers: (s.session_volunteers ?? []).map((v: any) => ({
      id: v.id,
      name: v.full_name,
      email: v.email ?? null,
      mobile: v.mobile ?? null,
    })),
  }));

  // A chair judges the work, so the pool is faculty-level only: delegates
  // registered as Faculty / Academician, plus Track Editors who are faculty by
  // appointment. Research scholars and students are deliberately excluded.
  const { data: facultyRows } = await admin
    .from("profiles")
    .select("id, full_name, email, designation, affiliation, participant_category, roles")
    .eq("is_active", true);

  const chairCandidates: ChairCandidate[] = ((facultyRows ?? []) as any[])
    .filter(
      (p) =>
        p.participant_category === "Faculty / Academician" ||
        (p.roles ?? []).includes("editor")
    )
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? "—",
      designation: p.designation ?? null,
      affiliation: p.affiliation ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Papers eligible but not yet in any session — the gap between what is paid
  // for and what is scheduled.
  const { data: scheduled } = await admin.from("session_papers").select("submission_id");
  const scheduledIds = new Set(((scheduled ?? []) as any[]).map((r) => r.submission_id));

  const { data: eligibleRows } = conferenceId
    ? await admin
        .from("submissions")
        .select("id, paper_id, submission_authors(is_corresponding, registration_fee_paid)")
        .eq("conference_id", conferenceId)
        .eq("status", "accepted")
    : { data: [] as any[] };

  const unscheduled = ((eligibleRows ?? []) as any[]).filter((s) => {
    if (scheduledIds.has(s.id)) return false;
    const corr = (s.submission_authors ?? []).find((a: any) => a.is_corresponding);
    return Boolean(corr?.registration_fee_paid);
  }).length;

  // Run the clash check over whatever is actually on the board, generated or
  // hand-arranged — the point is to catch a clash however it arose.
  const conflicts = findConflicts(
    sessions.map((s) => ({
      id: s.id,
      title: s.title,
      sessionDate: s.sessionDate,
      timeSlot: s.timeSlot,
      papers: s.papers.map((p) => ({
        paperId: p.paperId,
        personKeys: p.authors
          .map((a) => (a.email ?? "").trim().toLowerCase())
          .filter(Boolean),
      })),
    }))
  );

  return (
    <>
      <PageHeader
        title="Conference Programme"
        subtitle="Generate the schedule, arrange sessions, name chairs and volunteers, then publish to the public schedule."
      />
      <ProgrammeBoard
        sessions={sessions}
        chairCandidates={chairCandidates}
        unscheduledCount={unscheduled}
        conflicts={conflicts}
        basePath={basePath}
      />
    </>
  );
}
