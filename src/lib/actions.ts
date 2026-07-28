"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import {
  abstractDecisionEmail,
  chairInviteEmail,
  fullPaperDecisionEmail,
} from "@/lib/emailTemplates";
import {
  ABSTRACT_WORD_LIMIT,
  countWords,
  DELETABLE_SUBMISSION_STATUSES,
  MAX_SUBMISSIONS_PER_AUTHOR,
  MIN_REVIEWS_PER_SUBMISSION,
} from "@/lib/types";
import type { AppRole, DecisionKind, Recommendation } from "@/lib/types";

export type ActionResult = { ok: boolean; message?: string };

/** Result of inviting a reviewer — either they already had an account (assigned
 *  directly) or we minted an invitation and generated an email for the chair. */
export type InviteResult =
  | { ok: false; message: string }
  | {
      ok: true;
      existing: true;
      message: string;
      compose?: { to: string; subject: string; body: string };
    }
  | {
      ok: true;
      existing: false;
      invite: { link: string; subject: string; body: string; to: string };
    };

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
 * Email the corresponding author their decision (abstract or full-paper),
 * best-effort. No-op unless Resend is configured; the in-app notification from
 * the decision trigger fires regardless. Never throws.
 */
async function emailAuthorDecision(
  submissionId: string,
  decision: string,
  rationale: string
) {
  if (!emailConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("submissions")
      .select(
        "title, paper_id, stage, author:profiles!submissions_author_id_fkey(full_name, email), tracks(name, conferences(name))"
      )
      .eq("id", submissionId)
      .single();
    const s = data as any;
    const to = s?.author?.email;
    if (!to) return;
    const build =
      s.stage === "full_paper" ? fullPaperDecisionEmail : abstractDecisionEmail;
    const { subject, body } = build({
      paperId: s.paper_id,
      title: s.title,
      track: s.tracks?.name,
      decision,
      message: rationale,
      name: s.author?.full_name,
      conferenceName: s.tracks?.conferences?.name,
    });
    await sendEmail({ to, subject, text: body });
  } catch {
    // best-effort — a mail failure must not break the decision flow
  }
}

/**
 * Preview-then-send: email a composed message to a single recipient via Resend.
 * Backs the "Send now" button on the ComposeEmail preview. Staff only.
 */
export async function sendComposedEmail(
  formData: FormData
): Promise<ActionResult> {
  await requireRole("editor", "chief", "admin");
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

  const r = await sendEmail({ to, subject, text: body });
  return r.sent
    ? { ok: true, message: `Sent to ${to}.` }
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

  await audit(profile.id, "profile.updated", "profile", profile.id);
  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
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

export async function assignReviewer(formData: FormData): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const reviewerId = String(formData.get("reviewer_id"));
  const dueDate = String(formData.get("due_date") ?? "");

  const { error } = await supabase.from("assignments").insert({
    submission_id: submissionId,
    reviewer_id: reviewerId,
    assigned_by: profile.id,
    due_date: dueDate || null,
  });

  if (error) {
    return {
      ok: false,
      message: error.code === "23505"
        ? "That reviewer is already assigned to this submission."
        : error.message,
    };
  }

  await audit(profile.id, "assignment.created", "submission", submissionId, {
    reviewer_id: reviewerId,
  });

  // Email the assigned reviewer (best-effort; no-op unless Resend is set up).
  if (emailConfigured()) {
    try {
      const admin = createAdminClient();
      const [{ data: rev }, { data: sub }] = await Promise.all([
        admin.from("profiles").select("full_name, email").eq("id", reviewerId).single(),
        admin
          .from("submissions")
          .select("paper_id, title, stage, tracks(name, conferences(name))")
          .eq("id", submissionId)
          .single(),
      ]);
      const to = (rev as any)?.email;
      if (to) {
        const s = sub as any;
        const conf = s?.tracks?.conferences?.name ?? "GLOGIFT 2027";
        const item = s?.stage === "full_paper" ? "manuscript" : "abstract";
        const subject = `${conf} — Review assignment${
          s?.paper_id ? ` (${s.paper_id})` : ""
        }`;
        const lines: string[] = [
          `Dear ${(rev as any).full_name || "Reviewer"},`,
          "",
          "Greetings of the Day!",
          "",
          `We are pleased to assign you to review the ${item} titled "${
            s?.title ?? ""
          }" (Paper ID: ${s?.paper_id ?? "pending"})${
            s?.tracks?.name ? `, in the ${s.tracks.name} track` : ""
          } of ${conf}.`,
          "",
          "We thank you in advance for your time and valuable contribution to the review process.",
        ];
        if (dueDate)
          lines.push(
            "",
            `We kindly request that you complete your review by ${prettyDate(dueDate)}.`
          );
        lines.push(
          "",
          `Please sign in to your reviewer dashboard to accept and begin: ${siteUrl()}/reviewer`,
          "",
          REVIEW_HELP,
          "",
          "With warm regards,"
        );
        if (profile.full_name) lines.push(profile.full_name);
        lines.push(`Track Session Chair, ${conf}`);
        const init = initialsOf(profile.full_name);
        if (init) lines.push(init);
        await sendEmail({ to, subject, text: lines.join("\n") });
      }
    } catch {
      // best-effort — an email failure must not undo the assignment
    }
  }

  revalidatePath(`/editor/submissions/${submissionId}`);
  return {
    ok: true,
    message: emailConfigured()
      ? "Reviewer invited and emailed."
      : "Reviewer invited.",
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

/** Sender initials, e.g. "Saumyaranjan Sahoo" -> "S. S.". */
function initialsOf(name?: string): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + ".")
    .join(" ");
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
 * contacts, and the chair's initials — never the submitting author.
 */
function buildInviteEmail(opts: {
  paperId: string | null;
  title: string;
  stage: string | null;
  track: string;
  conferenceName: string;
  fullName: string;
  link: string;
  dueDate?: string;
  inviterName?: string;
}): { subject: string; body: string } {
  const conf = opts.conferenceName || "GLOGIFT 2027";
  const item = opts.stage === "full_paper" ? "manuscript" : "abstract";
  const pid = opts.paperId ? opts.paperId : "(to be assigned)";
  const name = opts.fullName?.trim() || "Reviewer";
  const init = initialsOf(opts.inviterName);

  const subject = `${conf} — Invitation to review ${item}${
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
  if (opts.inviterName) lines.push(opts.inviterName);
  lines.push(`Track Session Chair, ${conf}`);
  if (init) lines.push(init);

  return { subject, body: lines.join("\n") };
}

/**
 * Chair invites a reviewer by their details. If a portal account already
 * exists for that email, the reviewer role is granted and the paper assigned
 * immediately. Otherwise an invitation token is minted and a ready-to-send
 * email is generated for the chair to copy into their own mail client.
 */
export async function inviteReviewer(formData: FormData): Promise<InviteResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!submissionId) return { ok: false, message: "Missing submission." };
  if (!fullName) return { ok: false, message: "Enter the reviewer's full name." };
  if (!email || !email.includes("@"))
    return { ok: false, message: "Enter a valid email address." };

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, title, paper_id, stage, author_id, tracks(name, conferences(name))"
    )
    .eq("id", submissionId)
    .single();
  if (!sub) return { ok: false, message: "Submission not found." };

  const s = sub as any;
  const track: string = s.tracks?.name ?? "";
  const conferenceName: string = s.tracks?.conferences?.name ?? "GLOGIFT 2027";

  // If they already have an account, add the role and assign the paper now.
  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, email, roles")
    .ilike("email", email)
    .maybeSingle();

  if (target) {
    if (target.id === s.author_id)
      return {
        ok: false,
        message:
          "That person is the submitting author and cannot review this paper.",
      };

    const roles: string[] = target.roles ?? [];
    if (!roles.includes("reviewer")) {
      await admin
        .from("profiles")
        .update({
          roles: [...roles, "reviewer"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id);
    }

    const { error: aErr } = await admin.from("assignments").insert({
      submission_id: submissionId,
      reviewer_id: target.id,
      assigned_by: profile.id,
    });
    if (aErr && aErr.code !== "23505")
      return { ok: false, message: aErr.message };

    await audit(profile.id, "reviewer.invited_existing", "submission", submissionId, {
      email,
    });
    revalidatePath(`/editor/submissions/${submissionId}`);

    // Heads-up email (the account already exists — no sign-up needed).
    const item = s.stage === "full_paper" ? "manuscript" : "abstract";
    const composeSubject = `${conferenceName} — Review assignment${
      s.paper_id ? ` (${s.paper_id})` : ""
    }`;
    const composeLines: string[] = [
      `Dear ${target.full_name || "Reviewer"},`,
      "",
      "Greetings of the Day!",
      "",
      `We are pleased to assign you to review the ${item} titled "${s.title}" (Paper ID: ${
        s.paper_id ?? "pending"
      })${track ? `, in the ${track} track` : ""} of ${conferenceName}.`,
      "",
      "We thank you in advance for your time and valuable contribution to the review process.",
    ];
    if (dueDate)
      composeLines.push(
        "",
        `We kindly request that you complete your review by ${prettyDate(dueDate)}.`
      );
    composeLines.push(
      "",
      `Please sign in to your reviewer dashboard to begin: ${siteUrl()}/reviewer`,
      "",
      REVIEW_HELP,
      "",
      "With warm regards,"
    );
    if (profile.full_name) composeLines.push(profile.full_name);
    composeLines.push(`Track Session Chair, ${conferenceName}`);
    const compInit = initialsOf(profile.full_name);
    if (compInit) composeLines.push(compInit);
    const composeBody = composeLines.join("\n");

    return {
      ok: true,
      existing: true,
      message: `${
        target.full_name || email
      } already has an account — added as a reviewer and assigned to this paper.`,
      compose: { to: email, subject: composeSubject, body: composeBody },
    };
  }

  // New person — mint an invitation token and generate the email.
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
    fullName,
    link,
    dueDate: dueDate || undefined,
    inviterName: profile.full_name || undefined,
  });

  await audit(profile.id, "reviewer.invited", "submission", submissionId, { email });
  return { ok: true, existing: false, invite: { link, subject, body, to: email } };
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

/** An editor's recommendation — advisory until the chief ratifies it. */
/**
 * Track chair (or Convener) records a final decision. Stage-aware status
 * change is handled by the on_decision_created trigger. There is no hard
 * review-count gate — the abstract stage is at the chair's discretion, and
 * at the full-paper stage the UI advises two accepts but the chair may
 * still finalize with one.
 */
export async function recordRecommendation(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const decision = String(formData.get("decision")) as DecisionKind;

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
  await emailAuthorDecision(
    submissionId,
    decision,
    String(formData.get("rationale") ?? "")
  );
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/chief");
  return { ok: true, message: "Decision recorded." };
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

/** The final call. The DB trigger moves the paper and notifies the author. */
export async function recordFinalDecision(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief");
  const supabase = await createClient();

  const submissionId = String(formData.get("submission_id"));
  const decision = String(formData.get("decision")) as DecisionKind;

  const { error } = await supabase.from("decisions").insert({
    submission_id: submissionId,
    decided_by: profile.id,
    decision,
    rationale: String(formData.get("rationale") ?? ""),
    is_final: true,
  });

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "decision.final", "submission", submissionId, {
    decision,
  });
  await emailAuthorDecision(
    submissionId,
    decision,
    String(formData.get("rationale") ?? "")
  );
  revalidatePath("/chief");
  revalidatePath(`/chief/submissions/${submissionId}`);
  return { ok: true, message: "Final decision recorded." };
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
  const supabase = await createClient();

  const trackId = String(formData.get("track_id"));
  const editorId = String(formData.get("editor_id") ?? "");
  if (!editorId) return { ok: false, message: "Choose a track editor to add." };

  const { error } = await supabase
    .from("track_editors")
    .insert({ track_id: trackId, profile_id: editorId });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "That person already chairs this track."
          : error.message,
    };
  }

  // Keep the legacy single column pointing at a current chair for any
  // remaining references.
  await supabase.from("tracks").update({ editor_id: editorId }).eq("id", trackId);

  // Grant the editor role if missing, and notify the new chair in-app.
  const admin = createAdminClient();
  const { data: track } = await admin
    .from("tracks")
    .select("name")
    .eq("id", trackId)
    .single();
  const { data: target } = await admin
    .from("profiles")
    .select("roles, full_name, email")
    .eq("id", editorId)
    .single();
  const roles: string[] = target?.roles ?? [];
  if (!roles.includes("editor")) {
    await admin
      .from("profiles")
      .update({ roles: [...roles, "editor"], updated_at: new Date().toISOString() })
      .eq("id", editorId);
  }
  await admin.from("notifications").insert({
    profile_id: editorId,
    title: "You are now a Track Session Chair",
    body: `You have been assigned as Track Session Chair for the ${
      track?.name ?? "selected"
    } track. Sign in and open the Track Queue to begin.`,
    link: "/editor",
  });

  // Auto-send the Track Editor invitation if email is configured (best-effort).
  if (target?.email) {
    const { subject, body } = chairInviteEmail({
      name: target.full_name || undefined,
      track: track?.name ?? "your assigned",
    });
    await sendEmail({ to: target.email, subject, text: body });
  }

  await audit(profile.id, "track.chair_added", "track", trackId, {
    editor_id: editorId,
  });
  revalidatePath("/chief");
  revalidatePath("/admin/tracks");
  return { ok: true, message: "Track chair added and notified." };
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
