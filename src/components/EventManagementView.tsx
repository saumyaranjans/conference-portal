import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import {
  EventManagement,
  type EventSession,
  type PickPaper,
  type TrackOpt,
} from "@/components/EventManagement";

const PRESENTABLE_EXCLUDE = ["draft", "rejected", "withdrawn"];

/**
 * Event Management — organise on-site (classroom) and online (meeting-link)
 * sessions and slot accepted papers into them. Shared by Convener + Editorial
 * Office. The managed sessions surface on the public Conference Schedule.
 */
export async function EventManagementView() {
  const admin = createAdminClient();

  const { data: conf } = await admin
    .from("conferences")
    .select("id, name, acronym, year")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conf) {
    return (
      <>
        <PageHeader title="Event Management" subtitle="Sessions and paper scheduling." />
        <div className="card card-pad">Create the conference first.</div>
      </>
    );
  }

  const [{ data: sessData }, { data: subsData }, { data: tracksData }] =
    await Promise.all([
      admin
        .from("conference_sessions")
        .select(
          "id, title, mode, track_id, session_date, time_slot, classroom, meeting_link, sort_order, tracks(code), session_papers(id, submissions(paper_id, title))"
        )
        .eq("conference_id", (conf as any).id)
        .order("session_date", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true }),
      admin
        .from("submissions")
        .select("id, paper_id, title, status, tracks(code)")
        .eq("conference_id", (conf as any).id),
      admin
        .from("tracks")
        .select("id, code, name")
        .eq("conference_id", (conf as any).id)
        .order("code"),
    ]);

  const sessions: EventSession[] = ((sessData ?? []) as any[]).map((s) => ({
    id: s.id,
    title: s.title,
    mode: s.mode,
    trackId: s.track_id ?? null,
    trackCode: s.tracks?.code ?? null,
    sessionDate: s.session_date ?? null,
    timeSlot: s.time_slot ?? null,
    classroom: s.classroom ?? null,
    meetingLink: s.meeting_link ?? null,
    papers: ((s.session_papers ?? []) as any[])
      .filter((p) => p.submissions)
      .map((p) => ({
        id: p.id as string,
        paperId: p.submissions.paper_id ?? "—",
        title: p.submissions.title ?? "",
      })),
  }));

  const pickPapers: PickPaper[] = ((subsData ?? []) as any[])
    .filter(
      (s) => s.paper_id && !PRESENTABLE_EXCLUDE.includes(s.status)
    )
    .map((s) => ({
      id: s.id as string,
      paperId: s.paper_id as string,
      title: (s.title ?? "") as string,
      trackCode: (s.tracks?.code ?? "—") as string,
    }))
    .sort((a, b) => a.paperId.localeCompare(b.paperId));

  const tracks: TrackOpt[] = ((tracksData ?? []) as any[]).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
  }));

  return (
    <>
      <PageHeader
        title="Event Management"
        subtitle={`${(conf as any).acronym} · organise on-site and online sessions and slot accepted papers into them. Rooms and links appear on the public Conference Schedule.`}
      />
      <EventManagement sessions={sessions} papers={pickPapers} tracks={tracks} />
    </>
  );
}
