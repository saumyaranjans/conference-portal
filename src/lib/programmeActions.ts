"use server";

import { revalidatePath } from "next/cache";

import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import {
  buildProgramme,
  MAX_PAPERS_PER_SESSION,
  ABSOLUTE_MAX_PAPERS,
  type AllocPaper,
} from "@/lib/programmeAllocator";

function revalidateProgramme() {
  revalidatePath("/chief/programme");
  revalidatePath("/admin/programme");
  revalidatePath("/schedule");
}

async function currentConferenceId(
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const { data } = await admin
    .from("conferences")
    .select("id")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/* ------------------------------------------------------------ generation --- */

/**
 * Papers that belong in the programme: accepted, and with the corresponding
 * author's registration fee received. A paper nobody has paid to present is not
 * scheduled — the fee is what turns an acceptance into an appearance.
 *
 * Co-authors' fees are not checked: the corresponding author carries the
 * paper, and a co-author who does not attend simply does not present.
 */
async function eligiblePapers(
  admin: ReturnType<typeof createAdminClient>,
  conferenceId: string
): Promise<AllocPaper[]> {
  const { data } = await admin
    .from("submissions")
    .select(
      "id, paper_id, title, keywords, participation_mode, track_id, " +
        "tracks!inner(id, code, name), " +
        "submission_authors(email, is_corresponding, registration_fee_paid, participation_mode_actual)"
    )
    .eq("conference_id", conferenceId)
    .eq("status", "accepted");

  const out: AllocPaper[] = [];
  for (const s of (data ?? []) as any[]) {
    const authors = (s.submission_authors ?? []) as any[];
    const corresponding = authors.find((a) => a.is_corresponding);
    if (!corresponding?.registration_fee_paid) continue;

    // The corresponding author's confirmed mode wins; the paper's declared mode
    // is the fallback. On-site and online are scheduled strictly separately —
    // they are different rooms and never merge.
    const declared = String(
      corresponding.participation_mode_actual ?? s.participation_mode ?? ""
    ).toLowerCase();
    const mode: "onsite" | "online" =
      declared.includes("online") || declared.includes("virtual")
        ? "online"
        : "onsite";

    out.push({
      submissionId: s.id,
      paperId: s.paper_id ?? "—",
      title: s.title ?? "",
      keywords: Array.isArray(s.keywords) ? s.keywords : [],
      trackId: s.tracks.id,
      trackCode: s.tracks.code,
      trackName: s.tracks.name,
      mode,
      // Email identifies a person across papers — the same human may be a
      // corresponding author on one and a co-author on another.
      personKeys: authors
        .map((a) => String(a.email ?? "").trim().toLowerCase())
        .filter(Boolean),
    });
  }
  return out;
}

/**
 * Build (or rebuild) the draft programme.
 *
 * Only ever replaces sessions the allocator itself generated and which are
 * still drafts. A session the Convener approved, published, or built by hand is
 * left exactly where it is — regenerating must never silently undo a decision
 * someone has already taken.
 */
export async function generateProgramme(formData: FormData): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief");
  const admin = createAdminClient();

  const conferenceId = await currentConferenceId(admin);
  if (!conferenceId) return { ok: false, message: "No conference found." };

  const maxPerSession = Math.min(
    Math.max(Number(formData.get("max_per_session")) || MAX_PAPERS_PER_SESSION, 1),
    ABSOLUTE_MAX_PAPERS
  );

  const papers = await eligiblePapers(admin, conferenceId);
  if (papers.length === 0) {
    return {
      ok: false,
      message:
        "No papers are eligible yet — a paper is scheduled once it is accepted and its corresponding author's fee is recorded.",
    };
  }

  // Papers already fixed into a session the Convener has committed to.
  const { data: committed } = await admin
    .from("session_papers")
    .select("submission_id, conference_sessions!inner(status, generated_at)")
    .neq("conference_sessions.status", "draft");
  const spokenFor = new Set(
    ((committed ?? []) as any[]).map((r) => r.submission_id)
  );

  const { data: handMade } = await admin
    .from("session_papers")
    .select("submission_id, conference_sessions!inner(generated_at)")
    .is("conference_sessions.generated_at", null);
  for (const r of (handMade ?? []) as any[]) spokenFor.add(r.submission_id);

  const toPlace = papers.filter((p) => !spokenFor.has(p.submissionId));
  if (toPlace.length === 0) {
    return {
      ok: false,
      message: "Every eligible paper is already in a session you have committed to.",
    };
  }

  // Clear only our own untouched drafts, then lay out afresh.
  const { data: oldDrafts } = await admin
    .from("conference_sessions")
    .select("id")
    .eq("conference_id", conferenceId)
    .eq("status", "draft")
    .not("generated_at", "is", null);
  const oldIds = ((oldDrafts ?? []) as any[]).map((r) => r.id);
  if (oldIds.length) {
    await admin.from("conference_sessions").delete().in("id", oldIds);
  }

  const plan = buildProgramme(toPlace, { maxPerSession });
  const now = new Date().toISOString();

  let created = 0;
  for (const [i, session] of [...plan.sessions, ...plan.unplaced].entries()) {
    const { data: row, error } = await admin
      .from("conference_sessions")
      .insert({
        conference_id: conferenceId,
        title: session.title,
        mode: session.mode,
        track_id: session.trackId,
        session_date: session.sessionDate,
        time_slot: session.timeSlot,
        sort_order: i,
        status: "draft",
        generated_at: now,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !row) continue;

    const papersRows = session.papers.map((p, idx) => ({
      session_id: (row as any).id,
      submission_id: p.submissionId,
      sort_order: idx,
    }));
    if (papersRows.length) await admin.from("session_papers").insert(papersRows);
    created += 1;
  }

  revalidateProgramme();
  const unplacedNote = plan.unplaced.length
    ? ` ${plan.unplaced.length} could not be given a slot without an author clash — they are listed without a time.`
    : "";
  return {
    ok: true,
    message: `Drafted ${created} session${created === 1 ? "" : "s"} from ${toPlace.length} paper${
      toPlace.length === 1 ? "" : "s"
    }.${unplacedNote}`,
  };
}

/* ---------------------------------------------------------------- venue --- */

export async function setSessionVenue(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();

  const id = String(formData.get("session_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };

  const academicBlock = String(formData.get("academic_block") ?? "").trim();
  const classroom = String(formData.get("classroom") ?? "").trim();
  const meetingLink = String(formData.get("meeting_link") ?? "").trim();

  const { error } = await admin
    .from("conference_sessions")
    .update({
      academic_block: academicBlock || null,
      classroom: classroom || null,
      meeting_link: meetingLink || null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return { ok: true, message: "Venue saved." };
}

/** Move a session, refusing a move that would put someone in two rooms at once. */
export async function moveSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();

  const id = String(formData.get("session_id") ?? "").trim();
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  const timeSlot = String(formData.get("time_slot") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };

  if (sessionDate && timeSlot) {
    const clash = await slotClash(admin, id, sessionDate, timeSlot);
    if (clash) return { ok: false, message: clash };
  }

  const { error } = await admin
    .from("conference_sessions")
    .update({
      session_date: sessionDate || null,
      time_slot: timeSlot || null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return { ok: true, message: "Session moved." };
}

/**
 * Whether moving `sessionId` into a slot would ask somebody to be in two rooms
 * at once. Two papers by one person inside the SAME session are fine.
 */
async function slotClash(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
  sessionDate: string,
  timeSlot: string
): Promise<string | null> {
  const peopleOf = async (ids: string[]) => {
    if (!ids.length) return new Map<string, string[]>();
    const { data } = await admin
      .from("session_papers")
      .select(
        "session_id, submissions!inner(paper_id, submission_authors(email, full_name))"
      )
      .in("session_id", ids);
    const map = new Map<string, string[]>();
    for (const r of (data ?? []) as any[]) {
      for (const a of r.submissions?.submission_authors ?? []) {
        const key = String(a.email ?? "").trim().toLowerCase();
        if (!key) continue;
        map.set(key, [...(map.get(key) ?? []), a.full_name ?? key]);
      }
    }
    return map;
  };

  const { data: others } = await admin
    .from("conference_sessions")
    .select("id, title")
    .eq("session_date", sessionDate)
    .eq("time_slot", timeSlot)
    .neq("id", sessionId);
  const otherIds = ((others ?? []) as any[]).map((r) => r.id);
  if (!otherIds.length) return null;

  const mine = await peopleOf([sessionId]);
  const theirs = await peopleOf(otherIds);

  for (const [key, names] of mine) {
    if (theirs.has(key)) {
      return `${names[0] ?? key} is already presenting in another session in that slot — one person cannot be in two rooms at once.`;
    }
  }
  return null;
}

/* ------------------------------------------------------- chairs & helpers --- */

export async function addSessionChair(formData: FormData): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief");
  const admin = createAdminClient();

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const chairId = String(formData.get("profile_id") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 1500);
  if (!sessionId || !chairId) return { ok: false, message: "Missing session or chair." };

  // Only faculty-level academics may chair: a chair judges the work, so
  // research scholars and students are deliberately outside the pool.
  const { data: person } = await admin
    .from("profiles")
    .select("participant_category, roles, full_name")
    .eq("id", chairId)
    .maybeSingle();
  const p = person as any;
  const isFaculty =
    p?.participant_category === "Faculty / Academician" ||
    (p?.roles ?? []).includes("editor");
  if (!isFaculty) {
    return {
      ok: false,
      message:
        "Session chairs must be faculty-level academics — a Track Editor, or a delegate registered as Faculty / Academician.",
    };
  }

  const { count } = await admin
    .from("session_chairs")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count ?? 0) >= 3) {
    return { ok: false, message: "A session takes at most three chairs." };
  }

  const { error } = await admin.from("session_chairs").insert({
    session_id: sessionId,
    profile_id: chairId,
    bio: bio || null,
    created_by: profile.id,
  });
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "Already a chair of this session." : error.message,
    };
  }

  revalidateProgramme();
  return { ok: true, message: `${p?.full_name ?? "Chair"} added.` };
}

export async function removeSessionChair(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("chair_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing chair." };
  const { error } = await admin.from("session_chairs").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateProgramme();
  return { ok: true, message: "Chair removed." };
}

export async function saveSessionVolunteer(formData: FormData): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief");
  const admin = createAdminClient();

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  if (!sessionId || !fullName)
    return { ok: false, message: "A volunteer needs a name." };

  const { error } = await admin.from("session_volunteers").insert({
    session_id: sessionId,
    full_name: fullName,
    email: email || null,
    mobile: mobile || null,
    created_by: profile.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return { ok: true, message: "Volunteer added." };
}

export async function removeSessionVolunteer(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("volunteer_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing volunteer." };
  const { error } = await admin.from("session_volunteers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateProgramme();
  return { ok: true, message: "Volunteer removed." };
}

/* ------------------------------------------------------------- lifecycle --- */

/** Freeze everything the public schedule needs, exactly as it stands now. */
async function buildSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string
): Promise<any> {
  const { data: session } = await admin
    .from("conference_sessions")
    .select(
      "id, title, mode, session_date, time_slot, academic_block, classroom, meeting_link, tracks(code, name)"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const { data: papers } = await admin
    .from("session_papers")
    .select(
      "sort_order, submissions!inner(paper_id, title, submission_authors(full_name, affiliation, designation, is_corresponding, author_order))"
    )
    .eq("session_id", sessionId)
    .order("sort_order");

  const { data: chairs } = await admin
    .from("session_chairs")
    .select("bio, profiles!inner(full_name, designation, affiliation)")
    .eq("session_id", sessionId);

  const { data: volunteers } = await admin
    .from("session_volunteers")
    .select("full_name")
    .eq("session_id", sessionId);

  const s = session as any;
  return {
    title: s.title,
    mode: s.mode,
    sessionDate: s.session_date,
    timeSlot: s.time_slot,
    trackCode: s.tracks?.code ?? null,
    trackName: s.tracks?.name ?? null,
    academicBlock: s.academic_block,
    classroom: s.classroom,
    meetingLink: s.meeting_link,
    papers: ((papers ?? []) as any[]).map((r, i) => ({
      sequence: i + 1,
      paperId: r.submissions.paper_id,
      title: r.submissions.title,
      authors: (r.submissions.submission_authors ?? [])
        .slice()
        .sort((a: any, b: any) => (a.author_order ?? 99) - (b.author_order ?? 99))
        .map((a: any) => ({
          name: a.full_name,
          affiliation: a.affiliation,
          designation: a.designation,
          corresponding: Boolean(a.is_corresponding),
        })),
    })),
    chairs: ((chairs ?? []) as any[]).map((c) => ({
      name: c.profiles?.full_name,
      designation: c.profiles?.designation,
      affiliation: c.profiles?.affiliation,
      bio: c.bio,
    })),
    volunteers: ((volunteers ?? []) as any[]).map((v) => v.full_name),
    frozenAt: new Date().toISOString(),
  };
}

export async function approveSession(formData: FormData): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("session_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };

  const { error } = await admin
    .from("conference_sessions")
    .update({
      status: "approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return {
    ok: true,
    message: "Session approved. You can now notify participants and publish it.",
  };
}

/**
 * Publish, or re-publish after edits: take a fresh snapshot and mark the
 * session clean. Until this runs, the public keeps seeing the previous
 * snapshot — a half-finished rearrangement never reaches delegates.
 */
export async function publishSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("session_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };

  const snapshot = await buildSnapshot(admin, id);
  if (!snapshot) return { ok: false, message: "Session not found." };
  if (!snapshot.sessionDate || !snapshot.timeSlot) {
    return { ok: false, message: "Give the session a day and time slot before publishing." };
  }
  if (snapshot.mode === "onsite" && !snapshot.classroom) {
    return { ok: false, message: "An on-site session needs a classroom before publishing." };
  }
  if (snapshot.mode === "online" && !snapshot.meetingLink) {
    return { ok: false, message: "An online session needs a meeting link before publishing." };
  }

  const { error } = await admin
    .from("conference_sessions")
    .update({
      status: "published",
      published_snapshot: snapshot,
      published_at: new Date().toISOString(),
      has_unpublished_changes: false,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return { ok: true, message: "Published to the conference schedule." };
}

export async function unpublishSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("session_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };

  const { error } = await admin
    .from("conference_sessions")
    .update({ status: "approved", published_at: null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateProgramme();
  return { ok: true, message: "Removed from the public schedule." };
}

export async function deleteProgrammeSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief");
  const admin = createAdminClient();
  const id = String(formData.get("session_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };
  const { error } = await admin.from("conference_sessions").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateProgramme();
  return { ok: true, message: "Session deleted." };
}
