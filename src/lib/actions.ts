"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { chairInviteEmail, signOffLine } from "@/lib/emailTemplates";
import {
  ABSTRACT_WORD_LIMIT,
  countWords,
  DELETABLE_SUBMISSION_STATUSES,
  FULL_PAPER_ACCEPTS_REQUIRED,
  MAX_SUBMISSIONS_PER_AUTHOR,
  MAX_TRACKS_PER_CHAIR,
  MIN_REVIEWS_PER_SUBMISSION,
  reviewOf,
} from "@/lib/types";
import type { AppRole, DecisionKind, Recommendation } from "@/lib/types";

export type ActionResult = { ok: boolean; message?: string };

/** An invitation letter drafted but not yet sent, addressed to the reviewer —
 *  their profile email when an account exists, else the address the chair
 *  typed (that letter carries a sign-up link instead). */
export type PreparedInvite = {
  to: string;
  subject: string;
  body: string;
  reviewerName: string;
  /** True when they already have an account and will be assigned on send. */
  existing: boolean;
  /** Present only for an existing account. */
  reviewerId?: string;
  /** Non-blocking conflict-of-interest note for the chair to weigh. */
  warning?: string;
};

export type PrepareResult =
  | { ok: false; message: string }
  | { ok: true; prepared: PreparedInvite };

/** Append to the audit trail. Never throws — logging must not break a flow. */
async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {}
) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId,
      detail,
    });
  } catch {
    // Swallow — the audit log is diagnostic, not load-bearing.
  }
}

/**
 * Preview-then-send: email a composed message to a single recipient via Resend.
 * Backs the "Send now" button on the ComposeEmail preview. Staff only.
 */
export async function sendComposedEmail(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief", "admin");
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!to) return { ok: false, message: "No recipient address." };
  if (!emailConfigured())
    return {
      ok: false,
      message:
        "Email sending isn't set up yet — copy the message and send it from your own email.",
    };

  // Replies go to the staff member who sent it, not the no-reply sender.
  const r = await sendEmail({
    to,
    subject,
    text: body,
    replyTo: profile.email || undefined,
  });
  return r.sent
    ? {
        ok: true,
        message: `Sent to ${to}.${
          r.id ? ` Resend id ${r.id} — check the Resend log if it does not arrive.` : ""
        }`,
      }
    : {
        ok: false,
        message: r.error ? `Send failed: ${r.error}` : "Could not send the email.",
      };
}

// =====================================================================
// PROFILE (any signed-in user edits their own)
// =====================================================================

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const first = String(formData.get("first_name") ?? "").trim();
  const last = String(formData.get("last_name") ?? "").trim();
  const fullName = `${first} ${last}`.trim();

  const dial = String(formData.get("dial_code") ?? "").trim();
  const number = String(formData.get("mobile") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      first_name: first,
      last_name: last,
      full_name: fullName || profile.full_name,
      gender: String(formData.get("gender") ?? "").trim(),
      mobile: number ? `${dial} ${number}`.trim() : "",
      country: String(formData.get("country") ?? "").trim(),
      institution,
      affiliation: institution,
      department: String(formData.get("department") ?? "").trim(),
      designation: String(formData.get("designation") ?? "").trim(),
      participant_category: String(
        formData.get("participant_category") ?? ""
      ).trim(),
      orcid: String(formData.get("orcid") ?? "").trim(),

      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) return { ok: false, message: error.message };

  // Membership arrived in migration 0039; if that has not run yet, saving the
  // rest of the profile should still work.
  const isMember = String(formData.get("glogift_member") ?? "") === "yes";
  const { error: mErr } = await supabase
    .from("profiles")
    .update({
      glogift_member: isMember,
      glogift_membership_no: isMember
        ? String(formData.get("glogift_membership_no") ?? "").trim()
        : "",
    })
    .eq("id", profile.id);

  await audit(profile.id, "profile.updated", "profile", profile.id);
  revalidatePath("/profile");
  return {
    ok: true,
    message: mErr
      ? "Profile updated. GLOGIFT membership could not be saved yet — migration 0039 is pending."
      : "Profile updated.",
  };
}

// =====================================================================
// AUTHOR
// =====================================================================

export async function createSubmission(formData: FormData): Promise<void> {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Enforce the per-author submission cap (withdrawn ones don't count).
  const { count: activeCount } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("author_id", profile.id)
    .neq("status", "withdrawn");

  if ((activeCount ?? 0) >= MAX_SUBMISSIONS_PER_AUTHOR) {
    redirect("/author/submissions/new?error=limit");
  }

  const conferenceId = String(formData.get("conference_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const trackId = String(formData.get("track_id") ?? "");
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      conference_id: conferenceId,
      track_id: trackId || null,
      author_id: profile.id,
      title,
      abstract,
      keywords,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create submission");

  // The submitting author is always the first, corresponding author.
  await supabase.from("submission_authors").insert({
    submission_id: data.id,
    profile_id: profile.id,
    full_name: profile.full_name || profile.email,
    email: profile.email,
    affiliation: profile.affiliation || profile.institution,
    designation: profile.designation,
    participant_category: profile.participant_category,
    mobile: profile.mobile,
    is_corresponding: true,
    author_order: 1,
  });

  await audit(profile.id, "submission.created", "submission", data.id, { title });
  revalidatePath("/author");
  redirect(`/author/submissions/${data.id}`);
}

export type CoAuthorInput = {
  full_name: string;
  designation: string;
  participant_category: string;
  affiliation: string;
  email: string;
  mobile: string;
  /** attending | not_attending */
  attendance?: string;
};

/**
 * Single-page submission: create the draft plus the corresponding author and
 * any co-authors in one call, returning the new id so the client can upload
 * the paper file and finalise. Does not redirect.
 */
export async function createSubmissionOnePage(payload: {
  conference_id: string;
  title: string;
  track_id: string;
  abstract: string;
  keywords: string[];
  /** Ordered author list; the corresponding entry is filled from the profile. */
  authors: (CoAuthorInput & { is_corresponding?: boolean })[];
  submission_type?: string;
  participation_mode?: string;
  declared_original?: boolean;
  declared_ai_assistance?: boolean;
  declared_consent_publication?: boolean;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { count: activeCount } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("author_id", profile.id)
    .neq("status", "withdrawn");
  if ((activeCount ?? 0) >= MAX_SUBMISSIONS_PER_AUTHOR) {
    return {
      ok: false,
      message: `You may hold at most ${MAX_SUBMISSIONS_PER_AUTHOR} submissions.`,
    };
  }

  if (!payload.title.trim()) return { ok: false, message: "Title is required." };
  if (!payload.track_id) return { ok: false, message: "Choose a track." };

  const words = countWords(payload.abstract);
  if (words > ABSTRACT_WORD_LIMIT) {
    return {
      ok: false,
      message: `The abstract is ${words} words; the limit is ${ABSTRACT_WORD_LIMIT}.`,
    };
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      conference_id: payload.conference_id,
      track_id: payload.track_id || null,
      author_id: profile.id,
      title: payload.title.trim(),
      abstract: payload.abstract.trim(),
      keywords: payload.keywords,
      submission_type: payload.submission_type ?? "",
      participation_mode: payload.participation_mode ?? "",
      declared_original: !!payload.declared_original,
      declared_ai_assistance: !!payload.declared_ai_assistance,
      declared_consent_publication: !!payload.declared_consent_publication,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data)
    return { ok: false, message: error?.message ?? "Could not create submission" };

  // Keep only usable rows, and make sure the submitter is in the list.
  let ordered = payload.authors.filter(
    (a) => a.is_corresponding || (a.full_name.trim() && a.email.trim())
  );
  if (!ordered.some((a) => a.is_corresponding)) {
    ordered = [
      {
        full_name: "",
        designation: "",
        participant_category: "",
        affiliation: "",
        email: "",
        mobile: "",
        attendance: "",
        is_corresponding: true,
      },
      ...ordered,
    ];
  }

  // The corresponding author's details always come from their profile, so a
  // client can't spoof them; only the ordering comes from the form.
  const rows = ordered.map((a, i) =>
    a.is_corresponding
      ? {
          submission_id: data.id,
          profile_id: profile.id,
          full_name: profile.full_name || profile.email,
          email: profile.email,
          affiliation: profile.affiliation || profile.institution,
          designation: profile.designation,
          participant_category: profile.participant_category,
          mobile: profile.mobile,
          attendance: a.attendance ?? "",
          is_corresponding: true,
          author_order: i + 1,
        }
      : {
          submission_id: data.id,
          full_name: a.full_name.trim(),
          email: a.email.trim(),
          affiliation: a.affiliation.trim(),
          designation: a.designation.trim(),
          participant_category: a.participant_category.trim(),
          mobile: a.mobile.trim(),
          attendance: a.attendance ?? "",
          is_corresponding: false,
          author_order: i + 1,
        }
  );

  await supabase.from("submission_authors").insert(rows);

  await audit(profile.id, "submission.created", "submission", data.id, {
    title: payload.title,
  });
  revalidatePath("/author");
  return { ok: true, id: data.id };
}

export async function updateSubmission(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const abstract = String(formData.get("abstract") ?? "").trim();
  const words = countWords(abstract);
  if (words > ABSTRACT_WORD_LIMIT) {
    return {
      ok: false,
      message: `The abstract is ${words} words; the limit is ${ABSTRACT_WORD_LIMIT}.`,
    };
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      abstract,
      track_id: String(formData.get("track_id") ?? "") || null,
      keywords: String(formData.get("keywords") ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "submission.updated", "submission", id);
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: "Saved." };
}

/** Move a draft (or a revision) into the editorial pipeline. */
export async function submitForReview(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { data: sub } = await supabase
    .from("submissions")
    .select("status, file_path, track_id, version")
    .eq("id", id)
    .single();

  if (!sub) return { ok: false, message: "Submission not found." };
  if (!sub.track_id)
    return { ok: false, message: "Choose a track before submitting." };

  // A resubmission after "revisions requested" bumps the version number.
  const isRevision = sub.status === "revisions_requested";

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      version: isRevision ? sub.version + 1 : sub.version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "submission.submitted", "submission", id, {
    revision: isRevision,
  });
  revalidatePath("/author");
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: isRevision ? "Revision submitted." : "Submitted." };
}

export async function withdrawSubmission(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { data: current } = await supabase
    .from("submissions")
    .select("status, author_id")
    .eq("id", id)
    .single();

  if (!current) return { ok: false, message: "Submission not found." };

  // An accepted paper is final and cannot be withdrawn by anyone.
  if (current.status === "accepted") {
    return { ok: false, message: "An accepted paper cannot be withdrawn." };
  }

  const isOrganiser =
    profile.roles.includes("chief") || profile.roles.includes("admin");

  // Authors may only withdraw an abstract they have not submitted yet.
  if (!isOrganiser) {
    if (current.author_id !== profile.id) {
      return { ok: false, message: "You cannot withdraw this submission." };
    }
    if (current.status !== "draft") {
      return {
        ok: false,
        message:
          "A submitted abstract can only be withdrawn by the Convener. Please contact the Convener.",
      };
    }
  }

  const query = supabase
    .from("submissions")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", id);

  const { error } = isOrganiser
    ? await query
    : await query.eq("author_id", profile.id);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "submission.withdrawn", "submission", id, {
    by: isOrganiser ? "organiser" : "author",
  });
  revalidatePath("/author");
  revalidatePath("/chief");
  revalidatePath(`/chief/submissions/${id}`);
  return { ok: true, message: "Withdrawn." };
}

export async function addCoAuthor(formData: FormData): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const submissionId = String(formData.get("submission_id"));

  const { count } = await supabase
    .from("submission_authors")
    .select("*", { count: "exact", head: true })
    .eq("submission_id", submissionId);

  const mobileNumber = String(formData.get("mobile") ?? "").trim();

  const { error } = await supabase.from("submission_authors").insert({
    submission_id: submissionId,
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    affiliation: String(formData.get("affiliation") ?? "").trim(),
    designation: String(formData.get("designation") ?? "").trim(),
    participant_category: String(formData.get("participant_category") ?? "").trim(),
    mobile: mobileNumber
      ? `${String(formData.get("dial_code") ?? "+91").trim()} ${mobileNumber}`.trim()
      : "",
    attendance: String(formData.get("attendance") ?? "").trim(),
    author_order: (count ?? 0) + 1,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/author/submissions/${submissionId}`);
  return { ok: true, message: "Co-author added." };
}

/** Corresponding author reorders the author list by swapping neighbours. */
export async function moveAuthor(formData: FormData): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const submissionId = String(formData.get("submission_id"));
  const direction = String(formData.get("direction"));

  const { data: authors } = await supabase
    .from("submission_authors")
    .select("id, author_order")
    .eq("submission_id", submissionId)
    .order("author_order");

  if (!authors) return { ok: false, message: "Could not load authors." };

  const idx = authors.findIndex((a) => a.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= authors.length) return { ok: true };

  const a = authors[idx];
  const b = authors[swapIdx];

  // Swap their order values (no unique constraint, so two updates are safe).
  await supabase
    .from("submission_authors")
    .update({ author_order: b.author_order })
    .eq("id", a.id);
  await supabase
    .from("submission_authors")
    .update({ author_order: a.author_order })
    .eq("id", b.id);

  revalidatePath(`/author/submissions/${submissionId}`);
  return { ok: true };
}

export async function removeCoAuthor(formData: FormData): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const submissionId = String(formData.get("submission_id"));

  const { error } = await supabase
    .from("submission_authors")
    .delete()
    .eq("id", id)
    .eq("is_corresponding", false);

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/author/submissions/${submissionId}`);
  return { ok: true };
}

// =====================================================================
// REVIEWER
// =====================================================================

export async function respondToAssignment(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("reviewer");
  const supabase = await createClient();
  const id = String(formData.get("assignment_id"));
  const accept = String(formData.get("accept")) === "true";

  const { data: assignment, error } = await supabase
    .from("assignments")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("reviewer_id", profile.id)
    .select("submission_id")
    .single();

  if (error) return { ok: false, message: error.message };

  // Accepting creates the empty review shell the reviewer then fills in.
  if (accept && assignment) {
    await supabase.from("reviews").upsert(
      {
        assignment_id: id,
        submission_id: assignment.submission_id,
        reviewer_id: profile.id,
      },
      { onConflict: "assignment_id" }
    );
  }

  await audit(profile.id, accept ? "assignment.accepted" : "assignment.declined", "assignment", id);
  revalidatePath("/reviewer");
  return { ok: true, message: accept ? "Invitation accepted." : "Invitation declined." };
}

export async function saveReview(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("reviewer");
  const supabase = await createClient();

  const assignmentId = String(formData.get("assignment_id"));
  const submissionId = String(formData.get("submission_id"));
  const finalise = String(formData.get("finalise")) === "true";

  const num = (k: string) => {
    const v = formData.get(k);
    return v ? Number(v) : null;
  };

  const recommendation = (formData.get("recommendation") ||
    null) as Recommendation | null;

  if (finalise && !recommendation)
    return { ok: false, message: "Pick a recommendation before submitting." };

  const { error } = await supabase.from("reviews").upsert(
    {
      assignment_id: assignmentId,
      submission_id: submissionId,
      reviewer_id: profile.id,
      score_originality: num("score_originality"),
      score_technical: num("score_technical"),
      score_clarity: num("score_clarity"),
      score_relevance: num("score_relevance"),
      confidence: num("confidence"),
      recommendation,
      comments_to_author: String(formData.get("comments_to_author") ?? ""),
      comments_to_editor: String(formData.get("comments_to_editor") ?? ""),
      is_submitted: finalise,
      submitted_at: finalise ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id" }
  );

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, finalise ? "review.submitted" : "review.saved", "review", assignmentId);
  revalidatePath("/reviewer");
  revalidatePath(`/reviewer/reviews/${assignmentId}`);
  return { ok: true, message: finalise ? "Review submitted." : "Draft saved." };
}

// =====================================================================
// EDITOR
// =====================================================================

/**
 * Step 1 of adding a reviewer: draft the invitation. Nothing is assigned and
 * nothing is emailed here — the chair previews the letter first.
 *
 * Takes either `reviewer_id` (someone picked from the reviewer list) or the
 * details of a new person. A typed email that turns out to belong to an
 * existing account is quietly treated as the former.
 */
export async function prepareReviewerInvite(
  formData: FormData
): Promise<PrepareResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const reviewerId = String(formData.get("reviewer_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!submissionId) return { ok: false, message: "Missing submission." };

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, title, paper_id, stage, author_id, tracks(name, conferences(name, acronym, year))"
    )
    .eq("id", submissionId)
    .single();
  if (!sub) return { ok: false, message: "Submission not found." };

  const s = sub as any;
  const track: string = s.tracks?.name ?? "";
  const conferenceName: string = s.tracks?.conferences?.name ?? "GLOGIFT 2027";
  const shortName: string = shortConf(s.tracks?.conferences);

  // Someone picked from the list, or a typed email that already has an account.
  let target: { id: string; full_name: string | null; email: string | null } | null =
    null;

  if (reviewerId) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", reviewerId)
      .maybeSingle();
    if (!data) return { ok: false, message: "That reviewer no longer exists." };
    target = data as any;
  } else {
    if (!fullName) return { ok: false, message: "Enter the reviewer's full name." };
    if (!email || !email.includes("@"))
      return { ok: false, message: "Enter a valid email address." };

    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", email)
      .maybeSingle();
    target = (data as any) ?? null;
  }

  const authors = await submissionAuthors(admin, submissionId, s.author_id);

  if (target) {
    const coi = conflictOfInterest(
      {
        full_name: target.full_name,
        email: target.email,
        affiliation: (target as any).affiliation,
      },
      authors
    );
    if (coi.block) return { ok: false, message: coi.block };

    const { data: dupe } = await admin
      .from("assignments")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("reviewer_id", target.id)
      .maybeSingle();
    if (dupe)
      return {
        ok: false,
        message: "That reviewer is already assigned to this submission.",
      };

    const { subject, body } = buildAssignmentEmail({
      paperId: s.paper_id,
      title: s.title,
      stage: s.stage,
      track,
      conferenceName,
      shortName,
      reviewerName: target.full_name,
      dueDate: dueDate || undefined,
      inviterName: profile.full_name,
      inviterEmail: profile.email,
    });

    return {
      ok: true,
      prepared: {
        to: target.email || email,
        subject,
        body,
        reviewerId: target.id,
        reviewerName: target.full_name || target.email || email,
        existing: true,
        warning: coi.warn,
      },
    };
  }

  const newCoi = conflictOfInterest(
    { full_name: fullName, email, affiliation },
    authors
  );
  if (newCoi.block) return { ok: false, message: newCoi.block };

  // A new person — mint the invitation now so the preview carries a real
  // sign-up link. They are assigned only once they complete sign-up.
  const token = randomBytes(24).toString("hex");
  const { error: iErr } = await admin.from("reviewer_invitations").insert({
    submission_id: submissionId,
    invited_by: profile.id,
    token,
    full_name: fullName,
    designation,
    affiliation,
    email,
  });
  if (iErr) return { ok: false, message: iErr.message };

  const link = `${siteUrl()}/reviewer-invite/${token}`;
  const { subject, body } = buildInviteEmail({
    paperId: s.paper_id,
    title: s.title,
    stage: s.stage,
    track,
    conferenceName,
    shortName,
    fullName,
    link,
    dueDate: dueDate || undefined,
    inviterName: profile.full_name || undefined,
    inviterEmail: profile.email || undefined,
  });

  await audit(profile.id, "reviewer.invited", "submission", submissionId, { email });
  return {
    ok: true,
    prepared: {
      to: email,
      subject,
      body,
      reviewerName: fullName,
      existing: false,
      warning: newCoi.warn,
    },
  };
}

/**
 * Step 2: send the previewed invitation. An existing reviewer is assigned here
 * — not at preview time — so an abandoned draft leaves nothing behind. A new
 * invitee is assigned when they complete sign-up instead.
 */
export async function sendReviewerInvite(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const reviewerId = String(formData.get("reviewer_id") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!to) return { ok: false, message: "No recipient address." };

  let assigned = false;
  if (reviewerId) {
    const { data: target } = await admin
      .from("profiles")
      .select("id, roles")
      .eq("id", reviewerId)
      .maybeSingle();
    if (!target) return { ok: false, message: "That reviewer no longer exists." };

    const roles: string[] = (target as any).roles ?? [];
    if (!roles.includes("reviewer")) {
      await admin
        .from("profiles")
        .update({
          roles: [...roles, "reviewer"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewerId);
    }

    const { error } = await admin.from("assignments").insert({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      assigned_by: profile.id,
      due_date: dueDate || null,
    });
    if (error && error.code !== "23505")
      return { ok: false, message: error.message };

    assigned = true;
    await audit(profile.id, "assignment.created", "submission", submissionId, {
      reviewer_id: reviewerId,
    });
    revalidatePath(`/editor/submissions/${submissionId}`);
  }

  if (!emailConfigured())
    return {
      ok: false,
      message: assigned
        ? "Reviewer assigned, but email sending isn't set up — copy the message and send it from your own email."
        : "Email sending isn't set up yet — copy the message and send it from your own email.",
    };

  const r = await sendEmail({
    to,
    subject,
    text: body,
    replyTo: profile.email || undefined,
  });

  if (!r.sent)
    return {
      ok: false,
      message: `${assigned ? "Reviewer assigned, but the " : "The "}email failed: ${
        r.error ?? "unknown error"
      }`,
    };

  return {
    ok: true,
    message: `Invitation sent to ${to}.${
      assigned ? " They are now assigned to this paper." : ""
    }`,
  };
}

/**
 * Draft a nudge for a reviewer who has run past their deadline. The chair says
 * how many extra days to allow; the new date goes in the letter and is applied
 * to the assignment only when they send it.
 */
export async function prepareReviewerReminder(
  formData: FormData
): Promise<PrepareResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const extraDays = Number(formData.get("extra_days") ?? 0);
  if (!assignmentId) return { ok: false, message: "Missing assignment." };

  const { data: a } = await admin
    .from("assignments")
    .select(
      "id, due_date, submission_id, profiles!assignments_reviewer_id_fkey(full_name, email), submissions(title, paper_id, stage, tracks(name, conferences(name, acronym, year)))"
    )
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return { ok: false, message: "Assignment not found." };

  const row = a as any;
  const reviewer = row.profiles ?? {};
  const s = row.submissions ?? {};
  const to = reviewer.email;
  if (!to) return { ok: false, message: "No email address for that reviewer." };

  const newDue = extraDays > 0 ? addDays(new Date(), extraDays) : null;
  const { subject, body } = buildReminderEmail({
    paperId: s.paper_id ?? null,
    title: s.title ?? "",
    stage: s.stage ?? null,
    track: s.tracks?.name ?? "",
    conferenceName: s.tracks?.conferences?.name ?? "GLOGIFT 2027",
    shortName: shortConf(s.tracks?.conferences),
    reviewerName: reviewer.full_name,
    originalDue: row.due_date,
    newDue,
    inviterName: profile.full_name,
    inviterEmail: profile.email,
  });

  return {
    ok: true,
    prepared: {
      to,
      subject,
      body,
      reviewerName: reviewer.full_name || to,
      existing: true,
    },
  };
}

/** Send the previewed reminder and, if days were granted, extend the deadline. */
export async function sendReviewerReminder(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const submissionId = String(formData.get("submission_id") ?? "");
  const extraDays = Number(formData.get("extra_days") ?? 0);
  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!assignmentId) return { ok: false, message: "Missing assignment." };
  if (!to) return { ok: false, message: "No recipient address." };

  if (!emailConfigured())
    return {
      ok: false,
      message:
        "Email sending isn't set up yet — copy the message and send it from your own email.",
    };

  const r = await sendEmail({
    to,
    subject,
    text: body,
    replyTo: profile.email || undefined,
  });
  if (!r.sent)
    return {
      ok: false,
      message: `The reminder failed to send: ${r.error ?? "unknown error"}`,
    };

  // Only move the deadline once the reviewer has actually been told.
  const { data: current } = await admin
    .from("assignments")
    .select("reminder_count")
    .eq("id", assignmentId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    last_reminded_at: new Date().toISOString(),
    reminder_count: ((current as any)?.reminder_count ?? 0) + 1,
  };
  if (extraDays > 0) patch.due_date = addDays(new Date(), extraDays).toISOString();
  await admin.from("assignments").update(patch).eq("id", assignmentId);

  await audit(profile.id, "assignment.reminded", "assignment", assignmentId, {
    extra_days: extraDays,
  });
  revalidatePath(`/editor/submissions/${submissionId}`);

  return {
    ok: true,
    message: `Reminder sent to ${to}.${
      extraDays > 0
        ? ` The deadline now falls on ${prettyDate(
            addDays(new Date(), extraDays).toISOString().slice(0, 10)
          )}.`
        : ""
    }`,
  };
}

export async function removeAssignment(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();
  const id = String(formData.get("assignment_id"));
  const submissionId = String(formData.get("submission_id"));

  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "assignment.removed", "assignment", id);
  revalidatePath(`/editor/submissions/${submissionId}`);
  return { ok: true, message: "Assignment removed." };
}

// =====================================================================
// REVIEWER INVITATIONS (chair invites an outside expert by details)
// =====================================================================

/** Base URL for invitation links. Falls back to the branded domain. */
function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.vercel.app"
  ).replace(/\/$/, "");
}

/** Human label for a submission stage. */
function stageLabel(stage: string | null): string {
  return stage === "full_paper" ? "Full Paper" : "Abstract";
}

/** Format a yyyy-mm-dd date for prose, e.g. "15 January 2027". */
function prettyDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

// =====================================================================
// CONFLICT OF INTEREST
// =====================================================================

/** Loose comparison key — case, spacing and punctuation are noise here. */
function coiKey(v?: string | null): string {
  return (v ?? "")
    .toLowerCase()
    .replace(/[.,()&'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Person = { full_name?: string | null; email?: string | null; affiliation?: string | null };

/**
 * Everyone who owns a submission: the submitting author plus every listed
 * co-author. Used to keep authors off their own paper's review.
 */
async function submissionAuthors(
  admin: ReturnType<typeof createAdminClient>,
  submissionId: string,
  authorId?: string | null
): Promise<Person[]> {
  const [{ data: listed }, { data: submitter }] = await Promise.all([
    admin
      .from("submission_authors")
      .select("full_name, email, affiliation")
      .eq("submission_id", submissionId),
    authorId
      ? admin
          .from("profiles")
          .select("full_name, email, affiliation")
          .eq("id", authorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return [...((listed as Person[]) ?? []), ...(submitter ? [submitter as Person] : [])];
}

/**
 * Is this candidate conflicted on this paper? A person is the same person if
 * their email matches, or if both their name and affiliation match — that
 * catches an author who signed up under a second address. Sharing only an
 * affiliation is not disqualifying on its own, but the chair should know.
 */
function conflictOfInterest(
  candidate: Person,
  authors: Person[]
): { block?: string; warn?: string } {
  const email = coiKey(candidate.email);
  const name = coiKey(candidate.full_name);
  const affil = coiKey(candidate.affiliation);

  for (const a of authors) {
    if (email && email === coiKey(a.email))
      return {
        block: `${
          candidate.full_name || candidate.email
        } is an author of this paper (same email address) and cannot review it.`,
      };
    if (name && affil && name === coiKey(a.full_name) && affil === coiKey(a.affiliation))
      return {
        block: `${
          candidate.full_name || candidate.email
        } appears to be an author of this paper — same name and affiliation (${
          a.affiliation
        }). They cannot review it.`,
      };
  }

  if (affil) {
    const shared = authors.find((a) => coiKey(a.affiliation) === affil);
    if (shared)
      return {
        warn: `Possible conflict: they share an affiliation with an author of this paper (${shared.affiliation}). Invite them only if you are satisfied there is no conflict.`,
      };
  }
  return {};
}

/**
 * The short brand — "GLOGIFT 2027". The full conference title is far too long
 * for a subject line or a sign-off, so it appears only in the body.
 */
function shortConf(conference?: { acronym?: string | null; year?: number | null }): string {
  const acronym = conference?.acronym?.trim();
  const year = conference?.year;
  return acronym && year ? `${acronym} ${year}` : "GLOGIFT 2027";
}

/** `n` days from `from`, as a new Date. */
function addDays(from: Date, n: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
}

/** The two organiser help contacts, shown at the foot of reviewer emails. */
const REVIEW_HELP = [
  "For further help, please contact:",
  "1. glogift27.chair@iimsambalpur.ac.in",
  "2. glogift27.coordinator@iimsambalpur.ac.in",
].join("\n");

/**
 * Build the reviewer invitation letter (for someone without an account yet).
 * A warm letter: greeting, the article, thanks, deadline, sign-up link, help
 * contacts, and the chair's sign-off — never the submitting author.
 */
function buildInviteEmail(opts: {
  paperId: string | null;
  title: string;
  stage: string | null;
  track: string;
  conferenceName: string;
  shortName: string;
  fullName: string;
  link: string;
  dueDate?: string;
  inviterName?: string;
  inviterEmail?: string;
}): { subject: string; body: string } {
  const conf = opts.conferenceName || "GLOGIFT 2027";
  const brand = opts.shortName || "GLOGIFT 2027";
  const item = opts.stage === "full_paper" ? "manuscript" : "abstract";
  const pid = opts.paperId ? opts.paperId : "(to be assigned)";
  const name = opts.fullName?.trim() || "Reviewer";

  const subject = `${brand} — Invitation to review ${item}${
    opts.paperId ? ` (${opts.paperId})` : ""
  }`;

  const lines: string[] = [
    `Dear ${name},`,
    "",
    "Greetings of the Day!",
    "",
    `We are pleased to invite you to review the ${item} titled "${opts.title}" (Paper ID: ${pid})${
      opts.track ? `, submitted to the ${opts.track} track` : ""
    } of ${conf}.`,
    "",
    "We would be truly grateful for your expertise, and we thank you in advance for your time and valuable contribution to the review process.",
  ];
  if (opts.dueDate)
    lines.push(
      "",
      `We kindly request that you complete your review by ${prettyDate(
        opts.dueDate
      )}.`
    );
  lines.push(
    "",
    `To begin, please complete the reviewer sign-up on the conference website using the link below. Once registered, the ${item} will appear in your reviewer dashboard:`,
    opts.link,
    "",
    REVIEW_HELP,
    "",
    "With warm regards,"
  );
  lines.push(
    ...chairSignOff({
      name: opts.inviterName,
      track: opts.track,
      conf,
      brand,
      email: opts.inviterEmail,
    })
  );

  return { subject, body: lines.join("\n") };
}

/**
 * Sign-off block — the chair's name, "Track Editor, <track>,
 * <conference>", then their email so the recipient can reply directly.
 */
function chairSignOff(opts: {
  name?: string | null;
  track: string;
  /** Full conference title. */
  conf: string;
  /** Short brand, e.g. "GLOGIFT 2027". */
  brand: string;
  email?: string | null;
}): string[] {
  const lines: string[] = [];
  if (opts.name) lines.push(opts.name);
  lines.push(
    signOffLine({
      role: "Track Editor",
      track: opts.track,
      conf: opts.conf,
      brand: opts.brand,
    })
  );
  if (opts.email) lines.push(opts.email);
  return lines;
}

/**
 * Build the invitation letter for a reviewer who already has a portal account
 * (no sign-up link — they simply sign in). Same warm shape as the letter for
 * an outside expert.
 */
function buildAssignmentEmail(opts: {
  paperId: string | null;
  title: string;
  stage: string | null;
  track: string;
  conferenceName: string;
  shortName: string;
  reviewerName?: string | null;
  dueDate?: string;
  inviterName?: string | null;
  inviterEmail?: string | null;
}): { subject: string; body: string } {
  const conf = opts.conferenceName || "GLOGIFT 2027";
  const brand = opts.shortName || "GLOGIFT 2027";
  const item = opts.stage === "full_paper" ? "manuscript" : "abstract";

  const subject = `${brand} — Invitation to review ${item}${
    opts.paperId ? ` (${opts.paperId})` : ""
  }`;

  const lines: string[] = [
    `Dear ${opts.reviewerName?.trim() || "Reviewer"},`,
    "",
    "Greetings of the Day!",
    "",
    `We are pleased to assign you to review the ${item} titled "${opts.title}" (Paper ID: ${
      opts.paperId ?? "pending"
    })${opts.track ? `, in the ${opts.track} track` : ""} of ${conf}.`,
    "",
    "We thank you in advance for your time and valuable contribution to the review process.",
  ];
  if (opts.dueDate)
    lines.push(
      "",
      `We kindly request that you complete your review by ${prettyDate(opts.dueDate)}.`
    );
  lines.push(
    "",
    `Please sign in to your reviewer dashboard to begin: ${siteUrl()}/reviewer`,
    "",
    REVIEW_HELP,
    "",
    "With warm regards,"
  );
  lines.push(
    ...chairSignOff({
      name: opts.inviterName,
      track: opts.track,
      conf,
      brand,
      email: opts.inviterEmail,
    })
  );

  return { subject, body: lines.join("\n") };
}

/**
 * Build the deadline reminder — courteous, never accusatory. States the paper,
 * the date that passed, and the new date if the chair has granted more time.
 */
function buildReminderEmail(opts: {
  paperId: string | null;
  title: string;
  stage: string | null;
  track: string;
  conferenceName: string;
  shortName: string;
  reviewerName?: string | null;
  originalDue?: string | null;
  newDue: Date | null;
  inviterName?: string | null;
  inviterEmail?: string | null;
}): { subject: string; body: string } {
  const conf = opts.conferenceName || "GLOGIFT 2027";
  const brand = opts.shortName || "GLOGIFT 2027";
  const item = opts.stage === "full_paper" ? "manuscript" : "abstract";

  const subject = `${brand} — Gentle reminder: review pending${
    opts.paperId ? ` (${opts.paperId})` : ""
  }`;

  const lines: string[] = [
    `Dear ${opts.reviewerName?.trim() || "Reviewer"},`,
    "",
    "Greetings of the Day!",
    "",
    `We write regarding the ${item} titled "${opts.title}" (Paper ID: ${
      opts.paperId ?? "pending"
    })${opts.track ? `, in the ${opts.track} track` : ""} of ${conf}, which you kindly agreed to review.`,
  ];

  if (opts.originalDue)
    lines.push(
      "",
      `The review was due on ${prettyDate(
        String(opts.originalDue).slice(0, 10)
      )}, and we have not yet received it.`
    );
  else lines.push("", "We have not yet received your review.");

  if (opts.newDue)
    lines.push(
      "",
      `We understand that competing commitments are unavoidable, and we are pleased to extend your deadline to ${prettyDate(
        opts.newDue.toISOString().slice(0, 10)
      )}.`
    );
  else
    lines.push(
      "",
      "We would be grateful if you could complete it at the earliest opportunity."
    );

  lines.push(
    "",
    "If you are no longer able to review this submission, please do let us know so that we may make alternative arrangements.",
    "",
    `You can submit your review here: ${siteUrl()}/reviewer`,
    "",
    "We thank you sincerely for your time and support.",
    "",
    REVIEW_HELP,
    "",
    "With warm regards,"
  );
  lines.push(
    ...chairSignOff({
      name: opts.inviterName,
      track: opts.track,
      conf,
      brand,
      email: opts.inviterEmail,
    })
  );

  return { subject, body: lines.join("\n") };
}

/**
 * Called after an invited reviewer signs up through the token link. Grants the
 * reviewer role and assigns them to the invitation's submission. Idempotent.
 */
export async function acceptReviewerInvite(token: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("reviewer_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  if (inv.status === "revoked")
    return { ok: false, message: "This invitation has been revoked." };

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id")
    .eq("id", inv.submission_id)
    .single();
  if (sub && sub.author_id === profile.id)
    return {
      ok: false,
      message: "You are the submitting author and cannot review this paper.",
    };

  const roles: string[] = profile.roles ?? [];
  if (!roles.includes("reviewer")) {
    await admin
      .from("profiles")
      .update({
        roles: [...roles, "reviewer"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  const { error: aErr } = await admin.from("assignments").insert({
    submission_id: inv.submission_id,
    reviewer_id: profile.id,
    assigned_by: inv.invited_by,
  });
  if (aErr && aErr.code !== "23505")
    return { ok: false, message: aErr.message };

  if (inv.status !== "accepted") {
    await admin
      .from("reviewer_invitations")
      .update({
        status: "accepted",
        accepted_by: profile.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", inv.id);
  }

  await audit(profile.id, "reviewer.invite_accepted", "submission", inv.submission_id, {
    invitation_id: inv.id,
  });
  revalidatePath("/reviewer");
  return { ok: true, message: "You are now a reviewer for this paper." };
}

/**
 * The chair declares how an abstract will be judged before any decision form
 * opens: on their own expertise, or through reviewers they invite because the
 * topic falls outside it. Recorded on the submission and reversible — a chair
 * who starts down one route may switch.
 */
export async function setAbstractReviewRoute(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const route = String(formData.get("route") ?? "");

  if (!submissionId) return { ok: false, message: "Missing submission." };
  if (route !== "self" && route !== "facilitated")
    return { ok: false, message: "Choose how this abstract will be reviewed." };

  const { error } = await admin
    .from("submissions")
    .update({
      abstract_review_route: route,
      abstract_review_route_by: profile.id,
      abstract_review_route_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "abstract.route_set", "submission", submissionId, {
    route,
  });
  revalidatePath(`/editor/submissions/${submissionId}`);
  return {
    ok: true,
    message:
      route === "self"
        ? "Recorded: you will evaluate this abstract yourself. The decision form is now open."
        : "Recorded: this abstract goes out for review. Invite reviewers above.",
  };
}

/**
 * Track chair (or Convener) records a final decision. Stage-aware status
 * change is handled by the on_decision_created trigger.
 *
 * Two rules are enforced here rather than merely advised: a chair who is an
 * author of the paper cannot decide on it, and accepting a full paper takes
 * two reviewers recommending accept. The abstract stage stays at the chair's
 * discretion — they may decide with no reviews at all.
 *
 * Nothing is emailed here; the chair sends the decision letter from the
 * "Email the author" card after previewing it.
 */
export async function recordRecommendation(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id"));
  const decision = String(formData.get("decision")) as DecisionKind;

  const { data: sub } = await admin
    .from("submissions")
    .select("stage, author_id, abstract_review_route")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };

  if (sub.stage !== "full_paper" && !sub.abstract_review_route)
    return {
      ok: false,
      message:
        "First say how this abstract will be reviewed — within your expertise, or through reviewers you invite.",
    };

  const authors = await submissionAuthors(admin, submissionId, sub.author_id);
  const coi = conflictOfInterest(
    {
      full_name: profile.full_name,
      email: profile.email,
      affiliation: profile.affiliation,
    },
    authors
  );
  if (coi.block)
    return {
      ok: false,
      message:
        "You are an author of this paper and cannot decide on it. Ask the Convener to reassign it.",
    };

  if (sub.stage === "full_paper" && decision === "accept") {
    const { data: rows } = await admin
      .from("assignments")
      .select("reviews(recommendation, is_submitted)")
      .eq("submission_id", submissionId);
    const accepts = ((rows as any[]) ?? []).filter(
      (a) => reviewOf(a)?.is_submitted && reviewOf(a).recommendation === "accept"
    ).length;
    if (accepts < FULL_PAPER_ACCEPTS_REQUIRED)
      return {
        ok: false,
        message: `A full paper needs ${FULL_PAPER_ACCEPTS_REQUIRED} reviewers recommending Accept before it can move to the publication stage — ${accepts} so far. Invite another reviewer, or record a revision decision instead.`,
      };
  }

  const { error } = await supabase.from("decisions").insert({
    submission_id: submissionId,
    decided_by: profile.id,
    decision,
    rationale: String(formData.get("rationale") ?? ""),
    is_final: true,
  });

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "decision.recorded", "submission", submissionId, {
    decision,
  });
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/chief");
  return {
    ok: true,
    message: "Decision recorded. Send the author the decision letter below.",
  };
}

/** Track chair / Convener highlights a publication outlet for an accepted paper. */
export async function setSuggestedOutlet(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();
  const submissionId = String(formData.get("submission_id"));
  const outletId = String(formData.get("outlet_id") ?? "");

  const { data: sub } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .single();
  if (sub?.status !== "accepted") {
    return {
      ok: false,
      message: "An outlet can only be highlighted once the paper is accepted.",
    };
  }

  const { error } = await supabase
    .from("submissions")
    .update({ suggested_outlet_id: outletId || null })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "outlet.suggested", "submission", submissionId, {
    outlet_id: outletId,
  });
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/author/submissions/${submissionId}`);
  return { ok: true, message: "Publication outlet highlighted." };
}

// =====================================================================
// EDITOR-IN-CHIEF
// =====================================================================

/**
 * The Convener hands one paper to a different Track Editor — used when
 * the assigned chair has a conflict, or their handling of it was found
 * inappropriate. Overrides the track's Track Editor for this paper alone; the new
 * chair gains editing rights and the previous one loses them.
 */
export async function reassignTrackEditor(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const editorId = String(formData.get("editor_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!submissionId) return { ok: false, message: "Missing submission." };

  const { data: sub } = await admin
    .from("submissions")
    .select("paper_id, title, author_id, track_id, tracks(name)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };

  // Clearing the override hands the paper back to the track's own Track Editor.
  if (!editorId) {
    const { error } = await admin
      .from("submissions")
      .update({
        assigned_editor_id: null,
        assigned_editor_at: null,
        assigned_editor_by: profile.id,
      })
      .eq("id", submissionId);
    if (error) return { ok: false, message: error.message };

    await audit(profile.id, "submission.editor_reset", "submission", submissionId);
    revalidatePath(`/chief/submissions/${submissionId}`);
    return { ok: true, message: "Handed back to the track's own Track Editor." };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, email, affiliation, roles")
    .eq("id", editorId)
    .maybeSingle();
  if (!target) return { ok: false, message: "That editor no longer exists." };

  // A paper may only go to someone who already chairs its track.
  const { data: chairs } = await admin
    .from("track_editors")
    .select("profile_id")
    .eq("track_id", (sub as any).track_id);
  if (!((chairs as any[]) ?? []).some((c) => c.profile_id === editorId))
    return {
      ok: false,
      message: `${
        target.full_name || target.email
      } does not chair this paper's track. Add them to the track first, under Tracks & Track Editors.`,
    };

  if (target.id === (sub as any).author_id)
    return {
      ok: false,
      message: "That person is the author of this paper and cannot handle it.",
    };

  const authors = await submissionAuthors(admin, submissionId, (sub as any).author_id);
  const coi = conflictOfInterest(
    {
      full_name: target.full_name,
      email: target.email,
      affiliation: (target as any).affiliation,
    },
    authors
  );
  if (coi.block) return { ok: false, message: coi.block };

  const roles: string[] = (target as any).roles ?? [];
  if (!roles.includes("editor")) {
    await admin
      .from("profiles")
      .update({ roles: [...roles, "editor"], updated_at: new Date().toISOString() })
      .eq("id", editorId);
  }

  const { error } = await admin
    .from("submissions")
    .update({
      assigned_editor_id: editorId,
      assigned_editor_at: new Date().toISOString(),
      assigned_editor_by: profile.id,
    })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  // Handing the paper to someone else overrides whatever the previous Track
  // Editor decided: the record is voided (Convener-only from here) and the
  // paper returns to review so the new editor decides afresh.
  const { data: voided, error: vErr } = await admin
    .from("decisions")
    .update({ superseded_at: new Date().toISOString(), superseded_by: profile.id })
    .eq("submission_id", submissionId)
    .is("superseded_at", null)
    .select("id");

  // Say so rather than half-doing it: the editor has changed, but any earlier
  // decision still stands until this succeeds.
  if (vErr)
    return {
      ok: false,
      message: `${
        target.full_name || target.email
      } now handles this paper, but the previous decision could NOT be overridden: ${
        vErr.message
      }`,
    };

  const overridden = ((voided as any[]) ?? []).length;
  if (overridden > 0) {
    await admin
      .from("submissions")
      .update({
        status: "under_review",
        // The incoming editor declares how they will review it themselves.
        abstract_review_route: null,
        abstract_review_route_by: null,
        abstract_review_route_at: null,
      })
      .eq("id", submissionId);
  }

  const s = sub as any;
  await admin.from("notifications").insert({
    profile_id: editorId,
    title: "A submission has been assigned to you",
    body: `The Convener has asked you to handle "${s.title}"${
      s.paper_id ? ` (${s.paper_id})` : ""
    }${s.tracks?.name ? ` in the ${s.tracks.name} track` : ""}.${
      note ? ` Note: ${note}` : ""
    }`,
    link: `/editor/submissions/${submissionId}`,
  });

  await audit(profile.id, "submission.editor_reassigned", "submission", submissionId, {
    editor_id: editorId,
    note,
  });
  revalidatePath(`/chief/submissions/${submissionId}`);
  revalidatePath("/editor");
  return {
    ok: true,
    message: `${target.full_name || target.email} now handles this paper${
      overridden > 0
        ? `. The previous decision has been overridden and the paper is back under review — only you can still see the overridden record.`
        : " and has been notified."
    }`,
  };
}


/** Convener/admin deletes a submitted or withdrawn paper (and its files). */
export async function deleteSubmission(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("chief");
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { data: sub } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", id)
    .single();

  if (!sub) return { ok: false, message: "Submission not found." };
  if (!DELETABLE_SUBMISSION_STATUSES.includes(sub.status)) {
    return {
      ok: false,
      message: "Only submitted, withdrawn or rejected papers can be deleted.",
    };
  }

  // Remove paper + camera-ready files (best effort) with the admin client.
  try {
    const admin = createAdminClient();
    for (const prefix of [id, `${id}/camera-ready`]) {
      const { data: files } = await admin.storage.from("papers").list(prefix);
      if (files?.length) {
        await admin.storage
          .from("papers")
          .remove(files.map((f: { name: string }) => `${prefix}/${f.name}`));
      }
    }
  } catch {
    // storage cleanup is non-critical
  }

  await audit(profile.id, "submission.deleted", "submission", id, {
    status: sub.status,
  });

  const { error } = await supabase.from("submissions").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/chief");
  return { ok: true, message: "Paper deleted." };
}

export async function addTrackChair(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("chief");
  const admin = createAdminClient();

  const trackId = String(formData.get("track_id"));
  const editorId = String(formData.get("editor_id") ?? "");
  if (!editorId) return { ok: false, message: "Choose a track editor to invite." };

  // Rule: nobody chairs more than two tracks.
  const { data: held } = await admin
    .from("track_editors")
    .select("track_id")
    .eq("profile_id", editorId)
    .eq("status", "accepted");
  const other = ((held as any[]) ?? []).filter((h) => h.track_id !== trackId);
  if (other.length >= MAX_TRACKS_PER_CHAIR)
    return {
      ok: false,
      message: `A Track Editor may chair at most ${MAX_TRACKS_PER_CHAIR} tracks, and they already chair ${other.length}.`,
    };

  const token = randomBytes(24).toString("hex");
  const { error } = await admin.from("track_editors").insert({
    track_id: trackId,
    profile_id: editorId,
    status: "invited",
    token,
    invited_by: profile.id,
    invited_at: new Date().toISOString(),
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "That person has already been invited to chair this track."
          : error.message,
    };
  }

  const [{ data: track }, { data: target }] = await Promise.all([
    admin.from("tracks").select("name").eq("id", trackId).single(),
    admin.from("profiles").select("roles, full_name, email").eq("id", editorId).single(),
  ]);

  // They need the role to reach the acceptance page; it grants no papers.
  const roles: string[] = (target as any)?.roles ?? [];
  if (!roles.includes("editor")) {
    await admin
      .from("profiles")
      .update({ roles: [...roles, "editor"], updated_at: new Date().toISOString() })
      .eq("id", editorId);
  }

  const link = `${siteUrl()}/chair-invite/${token}`;
  await admin.from("notifications").insert({
    profile_id: editorId,
    title: "Invitation to chair a track",
    body: `You have been invited to serve as Track Editor for the ${
      track?.name ?? "selected"
    } track. Open the invitation to accept.`,
    link: `/chair-invite/${token}`,
  });

  await audit(profile.id, "track.chair_invited", "track", trackId, {
    editor_id: editorId,
  });
  revalidatePath("/chief");
  revalidatePath("/admin/tracks");
  return {
    ok: true,
    message: `${
      (target as any)?.full_name || "They"
    } is assigned to this track and has been notified. They appear as invited until they accept.`,
  };
}

/**
 * Draft the Track Editor invitation. Two shapes: someone already on the
 * portal (picked from the list) gets an acceptance link; someone new gets a
 * sign-up link carrying their details, so the form is pre-filled and the
 * Track Editor dashboard opens the moment they finish.
 *
 * Nothing is emailed here - the Convener previews first.
 */
export async function prepareChairInvite(
  formData: FormData
): Promise<PrepareResult> {
  const profile = await requireRole("chief");
  const admin = createAdminClient();

  const trackId = String(formData.get("track_id") ?? "");
  const editorId = String(formData.get("editor_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!trackId) return { ok: false, message: "Choose a track." };

  const { data: track } = await admin
    .from("tracks")
    .select("id, name, conferences(name, acronym, year)")
    .eq("id", trackId)
    .maybeSingle();
  if (!track) return { ok: false, message: "Track not found." };

  const t = track as any;
  const conferenceName: string = t.conferences?.name ?? "GLOGIFT 2027";
  const brand = shortConf(t.conferences);

  const { count: openCount } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("track_id", trackId)
    .in("status", ["submitted", "under_review"]);

  let target:
    | { id: string; full_name: string | null; email: string | null; roles?: string[] }
    | null = null;
  if (editorId) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email, roles")
      .eq("id", editorId)
      .maybeSingle();
    target = (data as any) ?? null;
  } else if (email) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email, roles")
      .ilike("email", email)
      .maybeSingle();
    target = (data as any) ?? null;
  }

  if (!target) {
    if (!fullName)
      return { ok: false, message: "Enter the Track Editor's full name." };
    if (!email || !email.includes("@"))
      return { ok: false, message: "Enter a valid email address." };
  }

  let link: string;
  let needsSignup: boolean;
  let recipient: string;
  let recipientName: string;

  if (target) {
    const { data: held } = await admin
      .from("track_editors")
      .select("track_id, status, token")
      .eq("profile_id", target.id);
    const rows = ((held as any[]) ?? []);
    const already = rows.find((h) => h.track_id === trackId);
    const otherAccepted = rows.filter(
      (h) => h.status === "accepted" && h.track_id !== trackId
    );
    if (otherAccepted.length >= MAX_TRACKS_PER_CHAIR)
      return {
        ok: false,
        message: `A Track Editor may chair at most ${MAX_TRACKS_PER_CHAIR} tracks, and they already chair ${otherAccepted.length}.`,
      };

    let token: string = already?.token ?? randomBytes(24).toString("hex");
    if (!already) {
      const { error } = await admin.from("track_editors").insert({
        track_id: trackId,
        profile_id: target.id,
        status: "invited",
        token,
        invited_by: profile.id,
        invited_at: new Date().toISOString(),
      });
      if (error) return { ok: false, message: error.message };
    } else if (!already.token) {
      await admin
        .from("track_editors")
        .update({ token })
        .eq("track_id", trackId)
        .eq("profile_id", target.id);
    }

    const roles: string[] = target.roles ?? [];
    if (!roles.includes("editor")) {
      await admin
        .from("profiles")
        .update({
          roles: [...roles, "editor"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id);
    }

    link = `${siteUrl()}/chair-invite/${token}`;
    needsSignup = false;
    recipient = target.email ?? email;
    recipientName = target.full_name || recipient;
  } else {
    const token = randomBytes(24).toString("hex");
    const { error } = await admin.from("track_editor_invitations").insert({
      track_id: trackId,
      invited_by: profile.id,
      token,
      full_name: fullName,
      designation,
      affiliation,
      email,
    });
    if (error) return { ok: false, message: error.message };

    link = `${siteUrl()}/track-editor-invite/${token}`;
    needsSignup = true;
    recipient = email;
    recipientName = fullName;
  }

  const { subject, body } = chairInviteEmail({
    name: recipientName,
    track: t.name,
    openCount: openCount ?? 0,
    conferenceName,
    brand,
    siteUrl: siteUrl(),
    link,
    needsSignup,
    convenerName: profile.full_name,
    convenerEmail: profile.email,
  });

  await audit(profile.id, "track.editor_invite_prepared", "track", trackId, {
    email: recipient,
  });

  return {
    ok: true,
    prepared: {
      to: recipient,
      subject,
      body,
      reviewerName: recipientName,
      existing: !needsSignup,
    },
  };
}

/** A reminder drafted for a Track Editor, ready to preview and send. */
export type ReminderResult =
  | { ok: false; message: string }
  | { ok: true; draft: { to: string; subject: string; body: string } };

/**
 * Draft a nudge for a Track Editor still holding undecided papers. Lists what
 * is outstanding, so the reminder is specific rather than a generic prod.
 */
export async function remindTrackEditor(
  formData: FormData
): Promise<ReminderResult> {
  const profile = await requireRole("chief");
  const admin = createAdminClient();

  const editorId = String(formData.get("editor_id") ?? "").trim();
  if (!editorId) return { ok: false, message: "Missing Track Editor." };

  const { data: editor } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", editorId)
    .maybeSingle();
  if (!editor?.email)
    return { ok: false, message: "No email address for that Track Editor." };

  const { data: subs } = await admin
    .from("submissions")
    .select("id, paper_id, title, stage, status, tracks(name, conferences(name, acronym, year))")
    .eq("assigned_editor_id", editorId)
    .in("status", ["submitted", "under_review", "revisions_requested", "abstract_accepted"]);

  const open = ((subs as any[]) ?? []);
  if (open.length === 0)
    return { ok: false, message: "They have nothing outstanding." };

  const conf = open[0]?.tracks?.conferences;
  const conferenceName: string = conf?.name ?? "GLOGIFT 2027";
  const brand = shortConf(conf);

  const { data: overdue } = await admin
    .from("assignments")
    .select("submission_id")
    .in("submission_id", open.map((o) => o.id))
    .not("due_date", "is", null)
    .lt("due_date", new Date().toISOString())
    .neq("status", "submitted");
  const late = new Set(((overdue as any[]) ?? []).map((o) => o.submission_id));

  const lines: string[] = [
    `Dear ${editor.full_name || "Track Editor"},`,
    "",
    "Greetings of the Day!",
    "",
    `You are currently handling ${open.length} submission${
      open.length === 1 ? "" : "s"
    } for ${brand} that ${open.length === 1 ? "is" : "are"} still awaiting your decision:`,
    "",
  ];
  for (const o of open) {
    lines.push(
      `  • ${o.paper_id ?? "(no ID)"} — ${o.title} (${
        o.stage === "full_paper" ? "manuscript" : "abstract"
      })${late.has(o.id) ? " — a reviewer is past their deadline" : ""}`
    );
  }
  lines.push(
    "",
    "We would be grateful if you could move these forward at your earliest convenience. If you need another Track Editor to take any of them on, please let me know and I will reassign.",
    "",
    `Your Track Queue: ${siteUrl()}/editor`,
    "",
    "With regards,"
  );
  if (profile.full_name) lines.push(profile.full_name);
  lines.push(signOffLine({ role: "Convener", conf: conferenceName, brand }));
  if (profile.email) lines.push(profile.email);

  return {
    ok: true,
    draft: {
      to: editor.email,
      subject: `${brand} — ${open.length} submission${
        open.length === 1 ? "" : "s"
      } awaiting your decision`,
      body: lines.join("\n"),
    },
  };
}

/** Send the previewed Track Editor invitation through the portal. */
export async function sendChairInvite(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief");

  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!to) return { ok: false, message: "No recipient address." };

  if (!emailConfigured())
    return {
      ok: false,
      message:
        "Email sending isn't set up yet - copy the message and send it from your own email.",
    };

  const r = await sendEmail({
    to,
    subject,
    text: body,
    replyTo: profile.email || undefined,
  });
  if (!r.sent)
    return { ok: false, message: `Send failed: ${r.error ?? "unknown error"}` };

  revalidatePath("/chief");
  return { ok: true, message: `Invitation sent to ${to}.` };
}

/**
 * A newly signed-up Track Editor accepts their invitation: grants the editor
 * role and makes them a Track Editor for the invited track. Idempotent.
 */
export async function acceptTrackEditorInvite(
  token: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("track_editor_invitations")
    .select("id, track_id, status, invited_by, tracks(name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  const row = inv as any;
  if (row.status === "revoked")
    return { ok: false, message: "This invitation has been withdrawn." };

  const { data: held } = await admin
    .from("track_editors")
    .select("track_id")
    .eq("profile_id", profile.id)
    .eq("status", "accepted");
  const other = ((held as any[]) ?? []).filter((h) => h.track_id !== row.track_id);
  if (other.length >= MAX_TRACKS_PER_CHAIR)
    return {
      ok: false,
      message: `You already chair ${other.length} tracks, which is the maximum.`,
    };

  const roles: string[] = profile.roles ?? [];
  if (!roles.includes("editor")) {
    await admin
      .from("profiles")
      .update({
        roles: [...roles, "editor"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  const { error } = await admin.from("track_editors").upsert(
    {
      track_id: row.track_id,
      profile_id: profile.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      invited_by: row.invited_by ?? null,
    },
    { onConflict: "track_id,profile_id" }
  );
  if (error && error.code !== "23505")
    return { ok: false, message: error.message };

  if (row.status !== "accepted") {
    await admin
      .from("track_editor_invitations")
      .update({
        status: "accepted",
        accepted_by: profile.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  await audit(profile.id, "track.editor_invite_accepted", "track", row.track_id);
  revalidatePath("/editor");
  revalidatePath("/chief");
  return {
    ok: true,
    message: `You are now the Track Editor for ${row.tracks?.name ?? "your track"}.`,
  };
}

/**
 * The invited chair accepts. Only then do they chair the track — and even
 * then they see nothing until the Convener assigns them a specific paper.
 */
export async function acceptTrackChairInvite(token: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("track_editors")
    .select("id, track_id, profile_id, status, tracks(name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  if ((inv as any).profile_id !== profile.id)
    return { ok: false, message: "This invitation belongs to a different account." };
  if ((inv as any).status === "accepted")
    return { ok: true, message: "You already chair this track." };

  const { data: held } = await admin
    .from("track_editors")
    .select("track_id")
    .eq("profile_id", profile.id)
    .eq("status", "accepted");
  const other = ((held as any[]) ?? []).filter(
    (h) => h.track_id !== (inv as any).track_id
  );
  if (other.length >= MAX_TRACKS_PER_CHAIR)
    return {
      ok: false,
      message: `You already chair ${other.length} tracks, which is the maximum. Ask the Convener to release one first.`,
    };

  const { error } = await admin
    .from("track_editors")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", (inv as any).id);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "track.chair_accepted", "track", (inv as any).track_id);
  revalidatePath("/chief");
  revalidatePath("/editor");
  return {
    ok: true,
    message: `You now chair the ${
      (inv as any).tracks?.name ?? "selected"
    } track. Papers will appear here as the Convener assigns them to you.`,
  };
}

export async function removeTrackChair(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("chief");
  const supabase = await createClient();

  const trackId = String(formData.get("track_id"));
  const editorId = String(formData.get("editor_id"));

  const { error } = await supabase
    .from("track_editors")
    .delete()
    .eq("track_id", trackId)
    .eq("profile_id", editorId);

  if (error) return { ok: false, message: error.message };

  // Re-point (or clear) the legacy single column.
  const { data: remaining } = await supabase
    .from("track_editors")
    .select("profile_id")
    .eq("track_id", trackId)
    .limit(1);
  await supabase
    .from("tracks")
    .update({ editor_id: remaining?.[0]?.profile_id ?? null })
    .eq("id", trackId);

  await audit(profile.id, "track.chair_removed", "track", trackId, {
    editor_id: editorId,
  });
  revalidatePath("/chief");
  revalidatePath("/admin/tracks");
  return { ok: true, message: "Track chair removed." };
}

/**
 * Editorial Office / Convener posts an announcement as an in-app notification
 * to a chosen audience. Reliable, no email needed. Recipients are resolved
 * server-side with the admin client (authoritative), then a notification row
 * is inserted per recipient.
 */
export async function broadcastAnnouncement(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const admin = createAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");
  if (!title) return { ok: false, message: "Enter an announcement title." };

  let ids: string[] = [];
  if (audience.startsWith("track:")) {
    const trackId = audience.slice(6);
    const { data } = await admin
      .from("submissions")
      .select("author_id")
      .eq("track_id", trackId)
      .neq("status", "draft");
    ids = [...new Set(((data ?? []) as any[]).map((r) => r.author_id))];
  } else if (audience === "reviewers") {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .contains("roles", ["reviewer"])
      .eq("is_active", true);
    ids = ((data ?? []) as any[]).map((r) => r.id);
  } else if (audience === "authors") {
    const { data } = await admin
      .from("submissions")
      .select("author_id")
      .neq("status", "draft");
    ids = [...new Set(((data ?? []) as any[]).map((r) => r.author_id))];
  } else {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("is_active", true);
    ids = ((data ?? []) as any[]).map((r) => r.id);
  }

  if (ids.length === 0)
    return { ok: false, message: "No recipients for that audience." };

  const rows = ids.map((pid) => ({
    profile_id: pid,
    title,
    body,
    link: "/",
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "announcement.broadcast", "notification", null, {
    audience,
    count: ids.length,
  });
  return {
    ok: true,
    message: `Posted to ${ids.length} recipient${ids.length === 1 ? "" : "s"}.`,
  };
}

// =====================================================================
// ADMIN
// =====================================================================

export async function updateUserRoles(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();

  const userId = String(formData.get("user_id"));
  const roles = formData.getAll("roles").map(String) as AppRole[];

  if (roles.length === 0)
    return { ok: false, message: "A user needs at least one role." };

  // Guard against an admin removing their own admin role and locking
  // themselves out of user management.
  if (userId === profile.id && !roles.includes("admin"))
    return { ok: false, message: "You cannot remove your own admin role." };

  const { error } = await admin
    .from("profiles")
    .update({ roles, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "user.roles_updated", "profile", userId, { roles });
  revalidatePath("/admin/users");
  return { ok: true, message: "Roles updated." };
}

export async function setUserActive(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();

  const userId = String(formData.get("user_id"));
  const active = String(formData.get("active")) === "true";

  if (userId === profile.id && !active)
    return { ok: false, message: "You cannot deactivate your own account." };

  const { error } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, active ? "user.activated" : "user.deactivated", "profile", userId);
  revalidatePath("/admin/users");
  return { ok: true, message: active ? "User activated." : "User deactivated." };
}

export async function upsertTrack(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const payload = {
    conference_id: String(formData.get("conference_id")),
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    description: String(formData.get("description") ?? "").trim(),
  };

  const { error } = id
    ? await supabase.from("tracks").update(payload).eq("id", id)
    : await supabase.from("tracks").insert(payload);

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "That track code is already used in this conference."
          : error.message,
    };
  }

  await audit(profile.id, id ? "track.updated" : "track.created", "track", id || null);
  revalidatePath("/admin/tracks");
  return { ok: true, message: "Track saved." };
}

export async function createConference(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const supabase = await createClient();

  const { error } = await supabase.from("conferences").insert({
    name: String(formData.get("name") ?? "").trim(),
    acronym: String(formData.get("acronym") ?? "").trim().toUpperCase(),
    year: Number(formData.get("year")) || new Date().getFullYear(),
    description: String(formData.get("description") ?? "").trim(),
    is_open: true,
  });

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "conference.created", "conference", null);
  revalidatePath("/admin/tracks");
  return { ok: true, message: "Conference created." };
}

/** Editorial Office / Convener records whether an author actually attended. */
export async function confirmAuthorAttendance(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief");
  // Staff write: RLS on submission_authors only lets the paper's author update
  // it, so use the admin client after the role check.
  const supabase = createAdminClient();

  const id = String(formData.get("author_id"));
  const confirmed = String(formData.get("confirmed")) === "true";

  const { error } = await supabase
    .from("submission_authors")
    .update({
      attended_confirmed: confirmed,
      attendance_confirmed_at: confirmed ? new Date().toISOString() : null,
      attendance_confirmed_by: confirmed ? profile.id : null,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(
    profile.id,
    confirmed ? "attendance.confirmed" : "attendance.cleared",
    "submission_author",
    id
  );
  revalidatePath("/admin/attendance");
  revalidatePath("/chief/attendance");
  return {
    ok: true,
    message: confirmed ? "Marked as attended." : "Attendance cleared.",
  };
}

/** Editorial Office / Convener records that a listed author paid the
 *  registration fee, alongside attendance. */
export async function markRegistrationFee(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief");
  // Staff write (see confirmAuthorAttendance) — use the admin client.
  const supabase = createAdminClient();

  const id = String(formData.get("author_id"));
  const paid = String(formData.get("paid")) === "true";

  const { error } = await supabase
    .from("submission_authors")
    .update({
      registration_fee_paid: paid,
      registration_fee_paid_at: paid ? new Date().toISOString() : null,
      registration_fee_paid_by: paid ? profile.id : null,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(
    profile.id,
    paid ? "registration.paid" : "registration.cleared",
    "submission_author",
    id
  );
  revalidatePath("/admin/attendance");
  revalidatePath("/chief/attendance");
  return {
    ok: true,
    message: paid ? "Registration fee marked paid." : "Registration fee cleared.",
  };
}

// ---- Publication opportunities (Editorial Office / Convener) ----------

export async function upsertPublicationOpportunity(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    image_url: String(formData.get("image_url") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    sort_order: Number(formData.get("sort_order")) || 0,
    is_active: String(formData.get("is_active") ?? "true") === "true",
  };

  if (!payload.title) return { ok: false, message: "Title is required." };

  const { error } = id
    ? await supabase.from("publication_opportunities").update(payload).eq("id", id)
    : await supabase.from("publication_opportunities").insert(payload);

  if (error) return { ok: false, message: error.message };

  await audit(
    profile.id,
    id ? "opportunity.updated" : "opportunity.created",
    "publication_opportunity",
    id || null
  );
  revalidatePath("/admin/publications");
  return { ok: true, message: "Saved." };
}

export async function deletePublicationOpportunity(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("publication_opportunities")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "opportunity.deleted", "publication_opportunity", id);
  revalidatePath("/admin/publications");
  return { ok: true, message: "Removed." };
}

export async function updateConference(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("admin", "chief");
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const dateOrNull = (k: string) => {
    const v = String(formData.get(k) ?? "");
    return v ? new Date(v).toISOString() : null;
  };

  const { error } = await supabase
    .from("conferences")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      acronym: String(formData.get("acronym") ?? "").trim(),
      year: Number(formData.get("year")),
      description: String(formData.get("description") ?? ""),
      submission_deadline: dateOrNull("submission_deadline"),
      review_deadline: dateOrNull("review_deadline"),
      notification_date: dateOrNull("notification_date"),
      is_open: String(formData.get("is_open")) === "true",
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "conference.updated", "conference", id);
  revalidatePath("/admin/tracks");
  return { ok: true, message: "Conference updated." };
}
