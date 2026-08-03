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
  convenerDecisionOverrideEmail,
  fullPaperCancelledEmail,
  fullPaperDecisionEmail,
  fullPaperReviewFacilitationEmail,
  fullPaperSubmittedAuthorEmail,
  manuscriptNeedsEditorEmail,
  manuscriptReturnedEmail,
  paperAssignmentEmail,
  reviewThankYouEmail,
  signOffLine,
  submissionAcknowledgementEmail,
} from "@/lib/emailTemplates";
import {
  ABSTRACT_WORD_LIMIT,
  countWords,
  DELETABLE_SUBMISSION_STATUSES,
  FULL_PAPER_ACCEPTS_REQUIRED,
  MANUSCRIPT_MAX_PAGES,
  MAX_SUBMISSIONS_PER_AUTHOR,
  MAX_TRACKS_PER_CHAIR,
  MAX_REVIEWS_PER_REVIEWER,
  MIN_REVIEWS_PER_SUBMISSION,
  reviewOf,
  FULL_PAPER_OPTIONS,
  fullPaperSlotLabel,
  textSimilarity,
  MANUSCRIPT_MIN_SIMILARITY,
} from "@/lib/types";
import type { AppRole, DecisionKind, Recommendation } from "@/lib/types";
import { buildCameraReadyPdf } from "@/lib/cameraReadyPdf";

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
  /** One-time token behind the Agree/Reject links; stored on the assignment at send. */
  inviteToken?: string;
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
  // Decision letters CC the Convener (chief) so they always have a copy.
  const ccConvener = String(formData.get("cc_convener") ?? "") === "1";

  if (!to) return { ok: false, message: "No recipient address." };
  if (!emailConfigured())
    return {
      ok: false,
      message:
        "Email sending isn't set up yet — copy the message and send it from your own email.",
    };

  const cc = ccConvener
    ? (await convenerEmails(createAdminClient())).filter(
        (e) => e.toLowerCase() !== to.toLowerCase()
      )
    : undefined;

  // Replies go to the staff member who sent it, not the no-reply sender.
  const r = await sendEmail({
    to,
    subject,
    text: body,
    cc,
    replyTo: profile.email || undefined,
    kind: "composed",
    sentBy: profile.id,
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

  // The 2-submission rule counts both roles — papers you submit and papers you
  // co-author (excluding withdrawn ones).
  const { count: ownedActive } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("author_id", profile.id)
    .neq("status", "withdrawn");
  const { data: coRows } = await createAdminClient()
    .from("submission_authors")
    .select("submissions(status)")
    .eq("profile_id", profile.id)
    .eq("is_corresponding", false);
  const coActive = (coRows ?? []).filter((r) => {
    const s = r.submissions as
      | { status?: string }
      | { status?: string }[]
      | null;
    const status = Array.isArray(s) ? s[0]?.status : s?.status;
    return status && status !== "withdrawn";
  }).length;
  if ((ownedActive ?? 0) + coActive >= MAX_SUBMISSIONS_PER_AUTHOR) {
    return {
      ok: false,
      message: `You may hold at most ${MAX_SUBMISSIONS_PER_AUTHOR} submissions, counting papers you submit and papers you co-author.`,
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
    .select(
      "status, file_path, track_id, version, declared_original, declared_ai_assistance, declared_consent_publication"
    )
    .eq("id", id)
    .single();

  if (!sub) return { ok: false, message: "Submission not found." };
  if (!sub.track_id)
    return { ok: false, message: "Choose a track before submitting." };

  // All three author declarations must be accepted to submit (or resubmit a
  // revision) — the same rule the submission form enforces on the client.
  if (
    !(sub as any).declared_original ||
    !(sub as any).declared_ai_assistance ||
    !(sub as any).declared_consent_publication
  )
    return {
      ok: false,
      message: "Please accept all three declarations before submitting.",
    };

  // A resubmission after "revisions requested" bumps the version number.
  const isRevision = sub.status === "revisions_requested";

  // Abstract revision only: the author's short "Response to Track Editor &
  // Reviewer" (<= 300 words). Ignored on a first submission.
  let revisionResponse: string | null = null;
  if (isRevision) {
    const raw = String(formData.get("revision_response") ?? "").trim();
    if (raw) {
      const words = raw.split(/\s+/).length;
      if (words > 300)
        return {
          ok: false,
          message: `Your response is ${words} words — please keep it within 300.`,
        };
      revisionResponse = raw;
    }
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      version: isRevision ? sub.version + 1 : sub.version,
      ...(isRevision ? { revision_response: revisionResponse } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "submission.submitted", "submission", id, {
    revision: isRevision,
  });

  // Acknowledge the submission by email to the corresponding author and every
  // co-author who has an address — best-effort, first submission only (not a
  // revision resubmit). Each send is logged to email_log, so it appears in the
  // Convener's email counter. A mail failure never breaks the submission.
  if (!isRevision && emailConfigured()) {
    try {
      const { data: full } = await supabase
        .from("submissions")
        .select(
          "paper_id, title, submission_type, participation_mode, tracks(name)"
        )
        .eq("id", id)
        .single();
      const { data: authors } = await supabase
        .from("submission_authors")
        .select("id, full_name, email, is_corresponding, author_order")
        .eq("submission_id", id)
        .order("author_order");

      if (full && authors?.length) {
        const corresponding = authors.find((a) => a.is_corresponding);
        const authorsLine = authors
          .map((a) =>
            a.is_corresponding ? `${a.full_name} (corresponding)` : a.full_name
          )
          .filter(Boolean)
          .join(", ");
        const t = full.tracks as
          | { name?: string }
          | { name?: string }[]
          | null;
        const trackName = Array.isArray(t) ? t[0]?.name ?? null : t?.name ?? null;

        for (const a of authors) {
          const email = (a.email ?? "").trim();
          if (!email) continue;
          const { subject, body } = submissionAcknowledgementEmail({
            recipientName: a.full_name,
            isCorresponding: a.is_corresponding,
            correspondingName: corresponding?.full_name,
            paperId: full.paper_id,
            title: full.title,
            track: trackName,
            submissionType: full.submission_type,
            participationMode: full.participation_mode,
            authorsLine,
            // Co-authors get a personalised, pre-filled sign-up link keyed to
            // their submission_authors row id.
            signupUrl: a.is_corresponding
              ? null
              : `${siteUrl()}/co-author-invite/${a.id}`,
            conferenceName: "GLOGIFT 2027",
          });
          await sendEmail({
            to: email,
            subject,
            text: body,
            kind: "submission_ack",
            sentBy: profile.id,
          });
        }
      }
    } catch {
      // A mail failure must never break submission.
    }
  }

  revalidatePath("/author");
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: isRevision ? "Revision submitted." : "Submitted." };
}

/**
 * Pathway B, manuscript stage: the corresponding author may revise the Title,
 * Abstract and Keywords that were accepted in Stage 1. The Title+Abstract must
 * stay at least 70% similar (word overlap) to the Stage 1 accepted snapshot, so
 * the full paper stays on the accepted topic. Track is never changed here.
 */
export async function reviseManuscriptDetails(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));
  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "author_id, status, submission_type, stage1_title, stage1_abstract, title, abstract"
    )
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;
  if (s.author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can revise this." };
  if (s.submission_type !== "full_paper_presentation")
    return { ok: false, message: "This is not a full-paper (Pathway B) submission." };
  if (!["abstract_accepted", "revisions_requested"].includes(s.status))
    return { ok: false, message: "These details can be revised only at the manuscript stage." };
  if (!title || !abstract)
    return { ok: false, message: "Title and abstract are required." };

  // Compare against the Stage 1 snapshot (fall back to the current values if the
  // snapshot is somehow absent, e.g. an older acceptance).
  const baseTitle = s.stage1_title ?? s.title ?? "";
  const baseAbstract = s.stage1_abstract ?? s.abstract ?? "";
  const sim = textSimilarity(
    `${title} ${abstract}`,
    `${baseTitle} ${baseAbstract}`
  );
  if (sim < MANUSCRIPT_MIN_SIMILARITY) {
    return {
      ok: false,
      message: `Your revision retains only ${Math.round(
        sim * 100
      )}% of the accepted title & abstract. The full paper must stay on the accepted topic — please keep at least ${Math.round(
        MANUSCRIPT_MIN_SIMILARITY * 100
      )}%.`,
    };
  }

  const { error } = await admin
    .from("submissions")
    .update({
      title,
      abstract,
      keywords,
      // The title appears on the camera-ready cover — invalidate any build.
      full_paper_pdf_built_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(profile.id, "manuscript.details_revised", "submission", id, {
    similarity: Math.round(sim * 100),
  });
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: "Saved." };
}

/**
 * Pathway B: the corresponding author picks how they will package the full
 * paper (Option A separated / Option B combined). Only after their abstract
 * has been accepted, and only on their own submission.
 */
export async function setFullPaperOption(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));
  const option = String(formData.get("option"));
  if (option !== "A" && option !== "B")
    return { ok: false, message: "Choose a valid option." };

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, status, submission_type")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;
  if (s.author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can do this." };
  if (s.submission_type !== "full_paper_presentation")
    return { ok: false, message: "This is not a full-paper (Pathway B) submission." };

  await admin
    .from("submissions")
    .update({
      full_paper_option: option,
      // Option (and its file set) is on the camera-ready — invalidate any build.
      full_paper_pdf_built_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: `Option ${option} selected.` };
}

/**
 * Pathway B: the author chooses which publishing outlet(s) their full paper
 * should be considered for. They may pick several; at least one is required
 * before they can submit.
 */
export async function setRequestedOutlets(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));
  const ids = String(formData.get("outlet_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, submission_type")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  if ((sub as any).author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can do this." };

  await admin
    .from("submissions")
    .update({ requested_outlet_ids: ids, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true };
}

/**
 * Order the uploaded files as they should appear inside the camera-ready:
 * manuscript first, then figures / tables / appendices, then everything else.
 * The Title Page is dropped (its author details would break the blind), and so
 * is the reviewer response letter (private correspondence, not part of the
 * published paper).
 */
const CAMERA_READY_SLOT_ORDER = [
  "manuscript_full",
  "manuscript_anon",
  "figures",
  "tables",
  "appendices",
  "supplementary",
  "others",
];
const CAMERA_READY_EXCLUDE = new Set(["title_page", "response_letter"]);

/**
 * Pathway B camera-ready. Compiles every uploaded file except the Title Page
 * (and the reviewer response letter) behind a generated cover page carrying the
 * conference identity, the manuscript metadata and the full author list, then
 * stores it and records the build. The corresponding author previews and
 * approves this before "Submit Manuscript" becomes available. Returns the fresh
 * PDF (base64) so the browser can open the preview immediately.
 */
export async function buildCameraReady(
  formData: FormData
): Promise<ActionResult & { previewPdf?: string; fileName?: string; warning?: string }> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "author_id, submission_type, full_paper_option, paper_id, title, tracks(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;
  if (s.author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can do this." };
  if (s.submission_type !== "full_paper_presentation")
    return { ok: false, message: "This is not a full-paper (Pathway B) submission." };
  if (!s.full_paper_option)
    return { ok: false, message: "Choose Option A or Option B first." };

  // Required slots must be present before we compile anything.
  const required = FULL_PAPER_OPTIONS[s.full_paper_option as "A" | "B"].slots
    .filter((x) => x.required)
    .map((x) => x.key);
  const { data: fileRows } = await admin
    .from("submission_files")
    .select("slot, file_path, file_name, created_at")
    .eq("submission_id", id)
    .order("created_at");
  const rows = ((fileRows as any[]) ?? []);
  const have = new Set(rows.map((f) => f.slot));
  const missing = required.filter((k) => !have.has(k));
  if (missing.length)
    return {
      ok: false,
      message: `Upload all required files first: ${missing.map(fullPaperSlotLabel).join(", ")}.`,
    };

  // Parts to compile, ordered; title page + response letter excluded.
  const parts = rows
    .filter((f) => !CAMERA_READY_EXCLUDE.has(f.slot))
    .sort((a, b) => {
      const ai = CAMERA_READY_SLOT_ORDER.indexOf(a.slot);
      const bi = CAMERA_READY_SLOT_ORDER.indexOf(b.slot);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  if (!parts.length)
    return { ok: false, message: "There is nothing to compile yet." };

  // Pull each file's bytes from storage.
  const downloaded: { bytes: Uint8Array; fileName: string }[] = [];
  for (const p of parts) {
    const { data: blob, error } = await admin.storage.from("papers").download(p.file_path);
    if (error || !blob) continue;
    downloaded.push({ bytes: new Uint8Array(await blob.arrayBuffer()), fileName: p.file_name });
  }
  if (!downloaded.length)
    return { ok: false, message: "Could not read the uploaded files. Please re-upload and try again." };

  const { data: authors } = await admin
    .from("submission_authors")
    .select("full_name, affiliation, is_corresponding, author_order")
    .eq("submission_id", id)
    .order("author_order");

  let built;
  try {
    built = await buildCameraReadyPdf(
      {
        paperId: s.paper_id ?? null,
        title: s.title ?? "",
        track: s.tracks?.name ?? null,
        option: s.full_paper_option,
        compiledOn: new Date().toISOString(),
        authors: ((authors as any[]) ?? []).map((a) => ({
          full_name: a.full_name,
          affiliation: a.affiliation,
          is_corresponding: a.is_corresponding,
        })),
      },
      downloaded
    );
  } catch (e) {
    return {
      ok: false,
      message: `Could not build the camera-ready PDF: ${(e as Error)?.message ?? "unknown error"}.`,
    };
  }

  // Every required manuscript slot is PDF, so at least the manuscript should
  // have merged. If nothing merged, the files aren't PDFs — stop.
  if (!built.merged.length)
    return {
      ok: false,
      message:
        "The manuscript must be a PDF so it can be compiled. Please upload a PDF manuscript and try again.",
    };

  // Page ceiling on the compiled content (all merged files, excluding the cover).
  if (built.contentPages > MANUSCRIPT_MAX_PAGES)
    return {
      ok: false,
      message: `Your compiled manuscript is ${built.contentPages} pages (excluding the cover). The limit is ${MANUSCRIPT_MAX_PAGES} compiled pages — please shorten it and rebuild.`,
    };

  const safeId = (s.paper_id ?? "manuscript").replace(/[^\w.-]/g, "_");
  const path = `${id}/camera-ready/${safeId}-camera-ready.pdf`;
  const reviewPath = `${id}/camera-ready/${safeId}-review-copy.pdf`;
  const { error: upErr } = await admin.storage
    .from("papers")
    .upload(path, built.bytes, { upsert: true, contentType: "application/pdf", cacheControl: "0" });
  if (upErr) return { ok: false, message: `Could not store the camera-ready: ${upErr.message}` };
  // Blinded review copy (cover without authors) for single-blind reviewers.
  const { error: rvErr } = await admin.storage
    .from("papers")
    .upload(reviewPath, built.blindedBytes, {
      upsert: true,
      contentType: "application/pdf",
      cacheControl: "0",
    });
  if (rvErr) return { ok: false, message: `Could not store the review copy: ${rvErr.message}` };

  await admin
    .from("submissions")
    .update({
      full_paper_pdf_path: path,
      full_paper_review_pdf_path: reviewPath,
      full_paper_pdf_built_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await audit(profile.id, "full_paper.camera_ready_built", "submission", id, {
    merged: built.merged.length,
    skipped: built.skipped.length,
  });

  revalidatePath(`/author/submissions/${id}`);
  const warning = built.skipped.length
    ? `Not compiled (not a PDF): ${built.skipped.join(", ")}. These files stay attached and are submitted separately.`
    : undefined;
  return {
    ok: true,
    message: "Camera-ready PDF built. Please preview and approve it.",
    previewPdf: Buffer.from(built.bytes).toString("base64"),
    fileName: `${s.paper_id ?? "manuscript"}-camera-ready.pdf`,
    warning,
  };
}

/**
 * Any change to the uploaded files invalidates a previously built camera-ready,
 * so the author must rebuild (and re-preview) before submitting. Called by the
 * upload window after a file is added or removed.
 */
export async function clearCameraReadyBuild(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));
  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, full_paper_pdf_built_at")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  if ((sub as any).author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can do this." };
  if (!(sub as any).full_paper_pdf_built_at) return { ok: true };
  await admin
    .from("submissions")
    .update({ full_paper_pdf_built_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true };
}

/**
 * Pathway B: submit the packaged full paper for review. Enforces the chosen
 * option's required slots, at least one publishing outlet, and that the
 * deadline (the Track Editor's per-paper date, capped by the conference
 * full-paper deadline) has not passed.
 */
export async function submitFullPaper(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "author_id, status, submission_type, full_paper_option, full_paper_deadline, conference_id, version, requested_outlet_ids, full_paper_pdf_built_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;
  if (s.author_id !== profile.id)
    return { ok: false, message: "Only the corresponding author can submit." };
  if (s.submission_type !== "full_paper_presentation")
    return { ok: false, message: "This is not a full-paper (Pathway B) submission." };
  if (!((s.requested_outlet_ids ?? []).length))
    return {
      ok: false,
      message: "Select at least one publishing outlet before submitting.",
    };
  if (String(formData.get("declared")) !== "true")
    return {
      ok: false,
      message: "Please accept all declarations (on behalf of all authors) before submitting.",
    };
  if (!["abstract_accepted", "revisions_requested"].includes(s.status))
    return { ok: false, message: "The full paper cannot be submitted at this stage." };
  if (!s.full_paper_option)
    return { ok: false, message: "Choose Option A or Option B first." };
  if (!s.full_paper_pdf_built_at)
    return {
      ok: false,
      message: "Build and preview the camera-ready PDF before submitting.",
    };

  // Deadline: the per-paper date if set, otherwise the conference ceiling.
  const { data: conf } = await admin
    .from("conferences")
    .select("full_paper_deadline")
    .eq("id", s.conference_id)
    .maybeSingle();
  const deadline = s.full_paper_deadline ?? (conf as any)?.full_paper_deadline ?? null;
  if (deadline && new Date() > new Date(`${deadline}T23:59:59`))
    return {
      ok: false,
      message: `The full-paper deadline (${prettyDate(deadline)}) has passed. Please contact your Track Editor.`,
    };

  const required = FULL_PAPER_OPTIONS[s.full_paper_option as "A" | "B"].slots
    .filter((x) => x.required)
    .map((x) => x.key);
  const { data: files } = await admin
    .from("submission_files")
    .select("slot")
    .eq("submission_id", id);
  const have = new Set(((files as any[]) ?? []).map((f) => f.slot));
  const missing = required.filter((k) => !have.has(k));
  if (missing.length)
    return {
      ok: false,
      message: `Please upload all required files first: ${missing
        .map(fullPaperSlotLabel)
        .join(", ")}.`,
    };

  const isRevision = s.status === "revisions_requested";
  await admin
    .from("submissions")
    .update({
      status: "submitted",
      stage: "full_paper",
      full_paper_submitted_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      version: isRevision ? (s.version ?? 1) + 1 : s.version ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await audit(profile.id, "full_paper.submitted", "submission", id, {
    option: s.full_paper_option,
    revision: isRevision,
  });

  // Two system-generated emails on submit (both Option A and B):
  //   1) every author (corresponding + co-authors) — acknowledgement + Manuscript ID;
  //   2) the handling Track Editor — please facilitate the review.
  if (emailConfigured()) {
    const { data: full } = await admin
      .from("submissions")
      .select("paper_id, title, assigned_editor_id, tracks(name)")
      .eq("id", id)
      .maybeSingle();
    const f = full as any;
    const track = f?.tracks?.name ?? null;

    // (1) authors
    const { data: authors } = await admin
      .from("submission_authors")
      .select("email")
      .eq("submission_id", id);
    const authEmail = fullPaperSubmittedAuthorEmail({
      paperId: f?.paper_id,
      title: f?.title ?? "",
      track,
      option: s.full_paper_option,
      conferenceName: "GLOGIFT 2027",
    });
    for (const a of (authors as any[]) ?? []) {
      if (!a.email) continue;
      try {
        await sendEmail({
          to: a.email,
          subject: authEmail.subject,
          text: authEmail.body,
          kind: "full_paper_submitted",
          sentBy: profile.id,
        });
      } catch {
        // Mail failure must never break the submission.
      }
    }

    // (2) The Track Editor normally carries over from Pathway A. If one is
    // assigned, ask them to facilitate the review; if not, ask the Convener to
    // assign a Track Editor for the manuscript (same flow, manuscript wording).
    if (f?.assigned_editor_id) {
      const { data: te } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", f.assigned_editor_id)
        .maybeSingle();
      const editor = te as any;
      if (editor?.email) {
        const teEmail = fullPaperReviewFacilitationEmail({
          editorName: editor.full_name,
          paperId: f?.paper_id,
          title: f?.title ?? "",
          track,
          reviewLink: `${siteUrl()}/editor/submissions/${id}`,
          minAccepts: FULL_PAPER_ACCEPTS_REQUIRED,
          conferenceName: "GLOGIFT 2027",
        });
        try {
          await sendEmail({
            to: editor.email,
            subject: teEmail.subject,
            text: teEmail.body,
            kind: "full_paper_facilitate",
            sentBy: profile.id,
          });
        } catch {
          // Mail failure must never break the submission.
        }
      }
    } else {
      const { data: conveners } = await admin
        .from("profiles")
        .select("full_name, email")
        .contains("roles", ["chief"]);
      for (const c of (conveners as any[]) ?? []) {
        if (!c.email) continue;
        const cEmail = manuscriptNeedsEditorEmail({
          convenerName: c.full_name,
          paperId: f?.paper_id,
          title: f?.title ?? "",
          track,
          assignLink: `${siteUrl()}/chief`,
          minAccepts: FULL_PAPER_ACCEPTS_REQUIRED,
          conferenceName: "GLOGIFT 2027",
        });
        try {
          await sendEmail({
            to: c.email,
            subject: cEmail.subject,
            text: cEmail.body,
            kind: "manuscript_needs_editor",
            sentBy: profile.id,
          });
        } catch {
          // Mail failure must never break the submission.
        }
      }
    }
  }

  revalidatePath("/author");
  revalidatePath(`/author/submissions/${id}`);
  return { ok: true, message: "Full paper submitted for review." };
}

/**
 * Pathway B → Pathway A. The corresponding author cancels the full-paper track
 * and reverts the paper to an accepted Pathway A abstract — the state the
 * authors were in when first told to register. This is deliberate and covered
 * by the double confirmation in the UI. Allowed only while the paper is an
 * accepted abstract that has NOT yet had its manuscript submitted — once the
 * manuscript is under review it can only be withdrawn by the Convener.
 *
 * All authors are notified (in-app + email); the handling Track Editor and the
 * Convener are CC'd on the email for their records.
 */
export async function cancelFullPaper(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("submission_id"));

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "author_id, status, submission_type, title, paper_id, assigned_editor_id, tracks(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;
  if (s.author_id !== profile.id)
    return {
      ok: false,
      message: "Only the corresponding author can cancel the full paper.",
    };
  if (s.submission_type !== "full_paper_presentation")
    return { ok: false, message: "This is not a full-paper (Pathway B) submission." };
  // Only before the manuscript has ever been submitted. Once it is under review
  // (submitted / under_review / revisions_requested / decided) it can no longer
  // be self-cancelled — the author must ask the Convener to withdraw it.
  if (s.status !== "abstract_accepted")
    return {
      ok: false,
      message:
        "The full paper can only be cancelled before the manuscript is submitted. Please contact the Convener to withdraw a manuscript that is under review.",
    };

  // Revert to an accepted Pathway A abstract and strip everything full-paper.
  const { error } = await admin
    .from("submissions")
    .update({
      submission_type: "abstract_presentation",
      stage: "abstract",
      status: "accepted",
      full_paper_option: null,
      full_paper_deadline: null,
      full_paper_submitted_at: null,
      requested_outlet_ids: [],
      pathway_reverted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  // Drop any uploaded manuscript files — they no longer apply.
  await admin.from("submission_files").delete().eq("submission_id", id);

  // Who to tell: every author on the paper.
  const { data: authors } = await admin
    .from("submission_authors")
    .select("full_name, email, is_corresponding, profile_id")
    .eq("submission_id", id);
  const authorList = (authors as any[]) ?? [];
  const corresponding = authorList.find((a) => a.is_corresponding);

  // In-app notification for every linked author.
  for (const a of authorList) {
    if (!a.profile_id) continue;
    await admin.from("notifications").insert({
      profile_id: a.profile_id,
      title: "Full paper cancelled — reverted to Pathway A",
      body: `The corresponding author cancelled the full-paper submission for "${
        s.title
      }"${
        s.paper_id ? ` (${s.paper_id})` : ""
      }. Your abstract remains accepted (Pathway A) — please proceed to register for the conference.`,
      link: `/author/submissions/${id}`,
    });
  }

  // Email all authors; CC the handling Track Editor and the Convener(s).
  if (emailConfigured()) {
    const ccEmails: string[] = [];
    if (s.assigned_editor_id) {
      const { data: te } = await admin
        .from("profiles")
        .select("email")
        .eq("id", s.assigned_editor_id)
        .maybeSingle();
      if ((te as any)?.email) ccEmails.push((te as any).email);
    }
    const { data: conveners } = await admin
      .from("profiles")
      .select("email")
      .contains("roles", ["chief"]);
    for (const c of (conveners as any[]) ?? [])
      if (c.email) ccEmails.push(c.email);

    const { subject, body } = fullPaperCancelledEmail({
      correspondingName: corresponding?.full_name ?? profile.full_name,
      paperId: s.paper_id,
      title: s.title,
      track: s.tracks?.name,
      conferenceName: "GLOGIFT 2027",
    });
    for (const a of authorList) {
      if (!a.email) continue;
      try {
        await sendEmail({
          to: a.email,
          cc: ccEmails,
          subject,
          text: body,
          kind: "full_paper_cancelled",
          sentBy: profile.id,
        });
      } catch {
        // A mail failure must never leave the cancellation half-done.
      }
    }
  }

  await audit(profile.id, "full_paper.cancelled", "submission", id, {
    reverted_to: "abstract_presentation",
  });
  revalidatePath("/author");
  revalidatePath(`/author/submissions/${id}`);
  return {
    ok: true,
    message:
      "Full paper cancelled. The paper is now an accepted abstract (Pathway A) — please proceed to register.",
  };
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

  // Author order appears on the camera-ready cover — invalidate any build.
  await createAdminClient()
    .from("submissions")
    .update({ full_paper_pdf_built_at: null })
    .eq("id", submissionId);

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

  // Accepting creates the empty review shell the reviewer then fills in, and
  // ensures they also hold the author role (two dashboards). Declining changes
  // no roles.
  if (accept && assignment) {
    await supabase.from("reviews").upsert(
      {
        assignment_id: id,
        submission_id: assignment.submission_id,
        reviewer_id: profile.id,
      },
      { onConflict: "assignment_id" }
    );
    const roles: string[] = (profile as any).roles ?? [];
    if (!roles.includes("author")) {
      await createAdminClient()
        .from("profiles")
        .update({ roles: [...roles, "author"], updated_at: new Date().toISOString() })
        .eq("id", profile.id);
    }
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

  // On submit: mark the assignment complete (so the review page locks) and send
  // the reviewer a system-generated thank-you.
  if (finalise) {
    const admin = createAdminClient();
    await admin
      .from("assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);

    if (emailConfigured() && profile.email) {
      const { data: sub } = await admin
        .from("submissions")
        .select(
          "paper_id, title, stage, assigned_editor_id, tracks(name, conferences(name, acronym, year))"
        )
        .eq("id", submissionId)
        .maybeSingle();
      const t = sub as any;
      const conf = t?.tracks?.conferences;
      const brand =
        conf?.acronym && conf?.year ? `${conf.acronym} ${conf.year}` : "GLOGIFT 2027";
      // The handling Track Editor signs the thank-you and is CC'd on it.
      let chairName: string | null = null;
      let chairEmail: string | null = null;
      if (t?.assigned_editor_id) {
        const { data: te } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", t.assigned_editor_id)
          .maybeSingle();
        chairName = (te as any)?.full_name ?? null;
        chairEmail = (te as any)?.email ?? null;
      }
      const letter = reviewThankYouEmail({
        reviewerName: profile.full_name,
        paperId: t?.paper_id,
        title: t?.title,
        track: t?.tracks?.name,
        itemLabel: t?.stage === "full_paper" ? "manuscript" : "abstract",
        chairName,
        chairEmail,
        signerRole: "Track Editor",
        conferenceName: conf?.name,
        brand,
      });
      try {
        await sendEmail({
          to: profile.email,
          subject: letter.subject,
          text: letter.body,
          cc: chairEmail ? [chairEmail] : undefined,
          kind: "review_thanks",
          sentBy: profile.id,
        });
      } catch {
        // Mail failure must never block the review submission.
      }
    }
  }

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

    // A reviewer may hold at most MAX_REVIEWS_PER_REVIEWER papers. Declined
    // invitations don't count against the cap.
    const { count: heldCount } = await admin
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("reviewer_id", target.id)
      .neq("status", "declined");
    if ((heldCount ?? 0) >= MAX_REVIEWS_PER_REVIEWER)
      return {
        ok: false,
        message: `A reviewer may be allocated at most ${MAX_REVIEWS_PER_REVIEWER} papers, and this reviewer already holds ${heldCount}.`,
      };

    // A one-time token backs the Agree/Reject links. It is minted here so the
    // preview carries real links; it is stored on the assignment only at send.
    const inviteToken = randomBytes(24).toString("hex");
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
      agreeLink: `${siteUrl()}/review-invite/${inviteToken}/agree`,
      rejectLink: `${siteUrl()}/review-invite/${inviteToken}/reject`,
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
        inviteToken,
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

  const { subject, body } = buildInviteEmail({
    paperId: s.paper_id,
    title: s.title,
    stage: s.stage,
    track,
    conferenceName,
    shortName,
    fullName,
    agreeLink: `${siteUrl()}/reviewer-invite/${token}/agree`,
    rejectLink: `${siteUrl()}/reviewer-invite/${token}/decline`,
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
  const inviteToken = String(formData.get("invite_token") ?? "").trim();
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

    // No role is granted here: sending an invitation must not, by itself, make
    // someone a reviewer. The reviewer (and author) role is granted only when
    // they ACCEPT — see agreeReviewAssignment. A reject leaves their roles
    // untouched, so someone invited but declining never gains the dashboard.

    const { error } = await admin.from("assignments").insert({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      assigned_by: profile.id,
      due_date: dueDate || null,
      invite_token: inviteToken || null,
    });
    if (error && error.code !== "23505")
      return { ok: false, message: error.message };

    assigned = true;

    // The invitation also lands in their notification bell, so a signed-up
    // reviewer can Accept / Decline from the dashboard as well as the email.
    // The token-backed link works even before they hold the reviewer role.
    if (error?.code !== "23505") {
      const { data: sInfo } = await admin
        .from("submissions")
        .select("title, paper_id")
        .eq("id", submissionId)
        .maybeSingle();
      const si = sInfo as { title?: string; paper_id?: string } | null;
      await admin.from("notifications").insert({
        profile_id: reviewerId,
        title: "Invitation to review a paper",
        body: `You have been invited to review "${si?.title ?? "a submission"}"${
          si?.paper_id ? ` (${si.paper_id})` : ""
        }. Open to accept or decline.`,
        link: inviteToken ? `/review-invite/${inviteToken}` : "/reviewer",
      });
    }

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
    kind: "reviewer_invitation",
    sentBy: profile.id,
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
    kind: "reviewer_reminder",
    sentBy: profile.id,
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
    process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.in"
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
  agreeLink: string;
  rejectLink: string;
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
    "Kindly let us know whether you are able to take up this review:",
    "",
    `• To ACCEPT, please click here: ${opts.agreeLink}`,
    `• To DECLINE, please click here: ${opts.rejectLink}`,
    "",
    `If you accept, you will be guided through a short sign-up (your details are pre-filled). Once registered, the ${item} will appear in your reviewer dashboard.`,
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
  agreeLink?: string;
  rejectLink?: string;
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
    `We are pleased to invite you to review the ${item} titled "${opts.title}" (Paper ID: ${
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
  if (opts.agreeLink && opts.rejectLink) {
    lines.push(
      "",
      "Kindly let us know whether you are able to take up this review:",
      "",
      `• To ACCEPT, please click here: ${opts.agreeLink}`,
      `• To DECLINE, please click here: ${opts.rejectLink}`,
      "",
      "Once you accept, the paper will appear in your reviewer dashboard, where you can begin your assessment."
    );
  } else {
    lines.push(
      "",
      `Please sign in to your reviewer dashboard to begin: ${siteUrl()}/reviewer`
    );
  }
  lines.push(
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
  if (new Date(inv.expires_at).getTime() <= Date.now())
    return { ok: false, message: "This invitation has expired. Ask the Track Editor for a new link." };
  if ((inv.email ?? "").trim().toLowerCase() !== (profile.email ?? "").trim().toLowerCase())
    return {
      ok: false,
      message: "This invitation belongs to a different email address.",
    };

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

  // Ensure both author and reviewer, so on sign-in they see two dashboards.
  const roles: string[] = profile.roles ?? [];
  const need = ["author", "reviewer"].filter((r) => !roles.includes(r));
  if (need.length) {
    await admin
      .from("profiles")
      .update({
        roles: [...roles, ...need],
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  // They agreed via the email link and have now signed up, so the paper is
  // active straight away — it lands under "Awaiting your review", not as a
  // fresh invitation to accept again.
  const { error: aErr } = await admin.from("assignments").insert({
    submission_id: inv.submission_id,
    reviewer_id: profile.id,
    assigned_by: inv.invited_by,
    status: "accepted",
    responded_at: new Date().toISOString(),
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
 * A co-author, invited by the corresponding author's submission, has just
 * registered from their personalised /co-author-invite/[token] link (the token
 * is their submission_authors row id). Link every co-author row that carries
 * their email to the new profile: RLS grants a co-author read access by
 * profile_id, so this is what lets them see the submission(s) on their author
 * dashboard and makes their co-authorships count toward the 2-submission rule.
 * They can view but never edit — editing stays owner-only.
 */
export async function acceptCoAuthorInvite(
  token: string
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("submission_authors")
    .select("id, submission_id, is_corresponding, profile_id")
    .eq("id", token)
    .maybeSingle();

  if (!row) return { ok: false, message: "This co-author link is invalid." };
  if (row.is_corresponding)
    return { ok: false, message: "This link is not a co-author invitation." };
  if (row.profile_id && row.profile_id !== profile.id)
    return {
      ok: false,
      message: "This invitation has already been used by another account.",
    };

  const myEmail = (profile.email ?? "").trim();

  // The link (its token) is the authorisation, so we link by row id rather than
  // by matching email — the co-author may have corrected a wrong address during
  // sign-up. Adopt the email they actually registered with.
  await admin
    .from("submission_authors")
    .update({ profile_id: profile.id, email: myEmail })
    .eq("id", row.id);

  // Also link any other not-yet-linked co-author rows carrying this email, so
  // all of the person's co-authored submissions become visible and countable.
  await admin
    .from("submission_authors")
    .update({ profile_id: profile.id })
    .eq("is_corresponding", false)
    .is("profile_id", null)
    .ilike("email", myEmail);

  // Ensure the author role so they land on the author dashboard.
  const roles: string[] = profile.roles ?? [];
  if (!roles.includes("author")) {
    await admin
      .from("profiles")
      .update({
        roles: [...roles, "author"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  await audit(
    profile.id,
    "coauthor.invite_accepted",
    "submission",
    row.submission_id,
    { submission_author_id: row.id }
  );
  revalidatePath("/author");
  return { ok: true, message: "You are now linked to this submission." };
}

/**
 * The corresponding author fixes a co-author's email when the original bounced
 * or was wrong. Only the submitting author may do this, and only while that
 * co-author is still unregistered (once they have an account, the email is
 * their own to manage). Updating re-sends the acknowledgement / invitation to
 * the corrected address.
 */
/**
 * Manuscript stage: correct a co-author's designation / affiliation (and, if
 * they are still unregistered, email). The name is never changed here, and no
 * author can be added or removed — the set is carried from the abstract.
 */
export async function updateCoAuthorDetails(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const submissionId = String(formData.get("submission_id") ?? "");
  const designation = String(formData.get("designation") ?? "").trim();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub || (sub as any).author_id !== profile.id)
    return { ok: false, message: "You can only edit your own submission." };

  const { data: row } = await admin
    .from("submission_authors")
    .select("id, submission_id, is_corresponding, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || (row as any).submission_id !== submissionId || (row as any).is_corresponding)
    return { ok: false, message: "Co-author not found." };

  const patch: Record<string, string | null> = {
    designation: designation || null,
    affiliation: affiliation || null,
  };
  // Email is editable only while the co-author is still unregistered; once they
  // sign in they own their address.
  if (!(row as any).profile_id && email) {
    const EMAIL_RE = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
    if (!EMAIL_RE.test(email))
      return { ok: false, message: "Enter a valid email address." };
    patch.email = email;
  }

  await admin.from("submission_authors").update(patch).eq("id", id);
  // Author affiliations appear on the camera-ready cover — invalidate any build.
  await admin
    .from("submissions")
    .update({ full_paper_pdf_built_at: null })
    .eq("id", submissionId);
  revalidatePath(`/author/submissions/${submissionId}`);
  return { ok: true, message: "Author details updated." };
}

export async function updateCoAuthorEmail(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const submissionId = String(formData.get("submission_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  const EMAIL_RE = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  if (!EMAIL_RE.test(email))
    return { ok: false, message: "Enter a valid email address." };

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, author_id, paper_id, title, submission_type, participation_mode, tracks(name)"
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub || sub.author_id !== profile.id)
    return { ok: false, message: "You can only edit your own submission." };

  const { data: row } = await admin
    .from("submission_authors")
    .select("id, full_name, is_corresponding, profile_id, submission_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.submission_id !== submissionId || row.is_corresponding)
    return { ok: false, message: "Co-author not found." };
  if (row.profile_id)
    return {
      ok: false,
      message:
        "This co-author has already registered; their email can no longer be changed here.",
    };

  await admin.from("submission_authors").update({ email }).eq("id", id);

  // Re-send the acknowledgement / invitation to the corrected address.
  let sent = false;
  if (emailConfigured()) {
    const { data: authors } = await admin
      .from("submission_authors")
      .select("full_name, is_corresponding")
      .eq("submission_id", submissionId)
      .order("author_order");
    const correspondingName = authors?.find((a) => a.is_corresponding)?.full_name;
    const authorsLine = (authors ?? [])
      .map((a) =>
        a.is_corresponding ? `${a.full_name} (corresponding)` : a.full_name
      )
      .filter(Boolean)
      .join(", ");
    const t = sub.tracks as { name?: string } | { name?: string }[] | null;
    const trackName = Array.isArray(t) ? t[0]?.name ?? null : t?.name ?? null;
    const { subject, body } = submissionAcknowledgementEmail({
      recipientName: row.full_name,
      isCorresponding: false,
      correspondingName,
      paperId: sub.paper_id,
      title: sub.title,
      track: trackName,
      submissionType: sub.submission_type,
      participationMode: sub.participation_mode,
      authorsLine,
      signupUrl: `${siteUrl()}/co-author-invite/${row.id}`,
      conferenceName: "GLOGIFT 2027",
    });
    const r = await sendEmail({
      to: email,
      subject,
      text: body,
      kind: "submission_ack",
      sentBy: profile.id,
    });
    sent = r.sent;
  }

  await audit(profile.id, "coauthor.email_updated", "submission", submissionId, {
    submission_author_id: id,
  });
  revalidatePath(`/author/submissions/${submissionId}`);
  return {
    ok: true,
    message: sent
      ? "Email updated and the invitation was re-sent."
      : "Email updated.",
  };
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
/** Convener (chief-role) email addresses — CC'd on decision letters. */
async function convenerEmails(
  admin: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data } = await admin
    .from("profiles")
    .select("email")
    .contains("roles", ["chief"]);
  return ((data as any[]) ?? [])
    .map((p) => (p.email ?? "").trim())
    .filter(Boolean);
}

export async function recordRecommendation(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const supabase = await createClient();
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id"));
  // Free-text decision value: accept | minor_revision | major_revision | reject
  // | sent_back. The status-mapping trigger interprets it.
  const decision = String(formData.get("decision"));
  // The editor may preview + tailor the exact author email; when both are
  // present the (edited) letter is sent verbatim instead of the generated one.
  const editedSubject = String(formData.get("letter_subject") ?? "").trim();
  const editedBody = String(formData.get("letter_body") ?? "").trim();
  const hasEditedLetter = Boolean(editedSubject && editedBody);

  const { data: sub } = await admin
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };

  if (
    (sub as any).assigned_editor_id === profile.id &&
    (sub as any).editor_accepted_at === null
  )
    return {
      ok: false,
      message: "Accept this paper first — it is still an unanswered assignment.",
    };

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

  // Manuscript revisions (minor/major) require a completed review round — at
  // least FULL_PAPER_ACCEPTS_REQUIRED reviewers must have submitted a review.
  // Before that, only "send back" (guidelines) and reject are available.
  if (
    sub.stage === "full_paper" &&
    (decision === "minor_revision" || decision === "major_revision")
  ) {
    const { data: rows } = await admin
      .from("assignments")
      .select("reviews(is_submitted)")
      .eq("submission_id", submissionId);
    const done = ((rows as any[]) ?? []).filter((a) => reviewOf(a)?.is_submitted).length;
    if (done < FULL_PAPER_ACCEPTS_REQUIRED)
      return {
        ok: false,
        message: `A revision can be requested only after a review round — at least ${FULL_PAPER_ACCEPTS_REQUIRED} reviewers must have completed their review (${done} so far). Use "Send back to author" for guideline issues, or Reject.`,
      };
  }

  // "Send back to author" applies only to a submitted manuscript.
  if (decision === "sent_back" && sub.stage !== "full_paper")
    return {
      ok: false,
      message: "Send back applies only to a submitted manuscript.",
    };

  // Pathway B: accepting the abstract opens the full-paper stage, so the Track
  // Editor must set a full-paper deadline — required, in the future, and no
  // later than the conference-wide full-paper ceiling.
  let fullPaperDeadline: string | null = null;
  if (
    decision === "accept" &&
    sub.stage === "abstract" &&
    (sub as any).submission_type === "full_paper_presentation"
  ) {
    fullPaperDeadline = String(formData.get("full_paper_deadline") ?? "").trim();
    if (!fullPaperDeadline)
      return {
        ok: false,
        message: "Set a full-paper submission deadline for the author.",
      };
    const { data: conf } = await admin
      .from("conferences")
      .select("full_paper_deadline")
      .eq("id", (sub as any).conference_id)
      .maybeSingle();
    const ceiling = (conf as any)?.full_paper_deadline ?? null;
    if (ceiling && fullPaperDeadline > ceiling)
      return {
        ok: false,
        message: `The deadline must be on or before the conference full-paper deadline (${prettyDate(ceiling)}).`,
      };
    if (new Date(`${fullPaperDeadline}T23:59:59`) < new Date())
      return { ok: false, message: "The full-paper deadline must be in the future." };
  }

  const { error } = await supabase.from("decisions").insert({
    submission_id: submissionId,
    decided_by: profile.id,
    decision,
    rationale: String(formData.get("rationale") ?? ""),
    is_final: true,
  });

  if (error) return { ok: false, message: error.message };

  // "Send back to author" — the trigger has moved the paper to abstract_accepted
  // / full_paper. Restart it from scratch: clear the submitted + built state and
  // remove reviewer assignments so the author re-packages and re-submits, and
  // email them why.
  if (decision === "sent_back") {
    await admin
      .from("submissions")
      .update({
        full_paper_submitted_at: null,
        full_paper_pdf_built_at: null,
        full_paper_pdf_path: null,
        full_paper_review_pdf_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    await admin.from("assignments").delete().eq("submission_id", submissionId);

    if (emailConfigured()) {
      const { data: meta } = await admin
        .from("submissions")
        .select("tracks(name, conferences(name, acronym, year))")
        .eq("id", submissionId)
        .maybeSingle();
      const trackName = (meta as any)?.tracks?.name ?? null;
      const conf = (meta as any)?.tracks?.conferences;
      const brand =
        conf?.acronym && conf?.year ? `${conf.acronym} ${conf.year}` : "GLOGIFT 2027";
      const signerRole =
        (sub as any).assigned_editor_id === profile.id ? "Track Editor" : "Convener";
      const cc = await convenerEmails(admin);

      const authorRows = await submissionAuthors(admin, submissionId, sub.author_id);
      const seen = new Set<string>();
      for (const a of authorRows) {
        const rawEmail = (a.email ?? "").trim();
        const email = rawEmail.toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);
        const letter = hasEditedLetter
          ? { subject: editedSubject, body: editedBody }
          : manuscriptReturnedEmail({
              paperId: (sub as any).paper_id,
              title: sub.title ?? "",
              track: trackName,
              message: String(formData.get("rationale") ?? ""),
              name: a.full_name,
              chairName: profile.full_name,
              chairEmail: profile.email,
              signerRole,
              conferenceName: conf?.name ?? null,
              brand,
            });
        try {
          await sendEmail({
            to: rawEmail,
            subject: letter.subject,
            text: letter.body,
            cc,
            kind: "manuscript_returned",
            sentBy: profile.id,
          });
        } catch {
          // Mail failure must never break the decision.
        }
      }
    }

    await audit(profile.id, "manuscript.sent_back", "submission", submissionId, {});
    revalidatePath(`/editor/submissions/${submissionId}`);
    revalidatePath(`/author/submissions/${submissionId}`);
    revalidatePath("/chief");
    return {
      ok: true,
      message:
        "Manuscript sent back to the author to restart. They must re-package and re-submit.",
    };
  }

  // The trigger has moved a Pathway B abstract to abstract_accepted; record the
  // deadline, and snapshot the accepted Title/Abstract/Keywords as the Stage 1
  // baseline the manuscript-stage revision must stay ≥70% similar to.
  if (fullPaperDeadline) {
    await admin
      .from("submissions")
      .update({
        full_paper_deadline: fullPaperDeadline,
        stage1_title: (sub as any).title,
        stage1_abstract: (sub as any).abstract,
        stage1_keywords: (sub as any).keywords,
      })
      .eq("id", submissionId);
  }

  // Always email the author the decision letter (CC the Convener) so a recorded
  // decision is never left un-communicated. The Track Editor can still send a
  // customised or repeat letter from the submission page. Pre-trigger sub.stage
  // picks the template: a Pathway B abstract accept is an abstract letter ("now
  // submit your full paper"); a manuscript decision is a full-paper letter.
  if (emailConfigured()) {
    const { data: dmeta } = await admin
      .from("submissions")
      .select("tracks(name, conferences(name, acronym, year))")
      .eq("id", submissionId)
      .maybeSingle();
    const dTrack = (dmeta as any)?.tracks?.name ?? null;
    const dConf = (dmeta as any)?.tracks?.conferences;
    const dBrand =
      dConf?.acronym && dConf?.year ? `${dConf.acronym} ${dConf.year}` : "GLOGIFT 2027";
    const dSignerRole =
      (sub as any).assigned_editor_id === profile.id ? "Track Editor" : "Convener";

    const { data: asg } = await admin
      .from("assignments")
      .select("reviewer_number, reviews(is_submitted, recommendation, comments_to_author)")
      .eq("submission_id", submissionId);
    const reviews = ((asg as any[]) ?? [])
      .filter((a) => reviewOf(a)?.is_submitted)
      .map((a, i) => ({
        label: `Reviewer ${a.reviewer_number ?? i + 1}`,
        recommendation: reviewOf(a)?.recommendation,
        comments: reviewOf(a)?.comments_to_author,
      }));

    const build =
      sub.stage === "full_paper" ? fullPaperDecisionEmail : abstractDecisionEmail;
    const dcc = await convenerEmails(admin);
    const authorRows = await submissionAuthors(admin, submissionId, sub.author_id);
    const seenD = new Set<string>();
    for (const a of authorRows) {
      const raw = (a.email ?? "").trim();
      const key = raw.toLowerCase();
      if (!key || seenD.has(key)) continue;
      seenD.add(key);
      const letter = hasEditedLetter
        ? { subject: editedSubject, body: editedBody }
        : build({
            paperId: (sub as any).paper_id,
            title: sub.title ?? "",
            track: dTrack,
            decision,
            submissionType: (sub as any).submission_type,
            fullPaperDeadline,
            message: String(formData.get("rationale") ?? ""),
            name: a.full_name ?? undefined,
            reviews,
            chairName: profile.full_name,
            chairEmail: profile.email,
            signerRole: dSignerRole,
            conferenceName: dConf?.name ?? null,
            brand: dBrand,
          });
      try {
        await sendEmail({
          to: raw,
          subject: letter.subject,
          text: letter.body,
          cc: dcc,
          kind: "decision",
          sentBy: profile.id,
        });
      } catch {
        // Mail failure must never break the decision.
      }
    }
  }

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
 * Convener override — the Convener is the final authority and may set/overturn
 * the decision on any submission (abstract OR manuscript), regardless of the
 * Track Editor. Supersedes the current decision, lets the DB trigger move the
 * status, and emails every author that the Convener has decided. Bypasses the
 * Track-Editor-only guards (e.g. the 2-accepts rule) by design.
 */
export async function overrideDecision(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("chief", "admin");
  const admin = createAdminClient();
  const submissionId = String(formData.get("submission_id"));
  const decision = String(formData.get("decision")) as DecisionKind;
  const message = String(formData.get("message") ?? "").trim();
  if (!["accept", "revisions_requested", "reject"].includes(decision))
    return { ok: false, message: "Choose Accept, Revise or Reject." };

  const { data: sub } = await admin
    .from("submissions")
    .select("id, stage, status, submission_type, paper_id, title, tracks(name)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const s = sub as any;

  // Void the current decision, then record the Convener's — the on_decision
  // trigger maps the new decision to the paper's status, stage-aware.
  await admin
    .from("decisions")
    .update({ superseded_at: new Date().toISOString(), superseded_by: profile.id })
    .eq("submission_id", submissionId)
    .is("superseded_at", null);
  const { error } = await admin.from("decisions").insert({
    submission_id: submissionId,
    decided_by: profile.id,
    decision,
    rationale: message,
    is_final: true,
  });
  if (error) return { ok: false, message: error.message };

  // Notify every author (in-app + system email).
  const noun = s.stage === "full_paper" ? "manuscript" : "abstract";
  const { data: authors } = await admin
    .from("submission_authors")
    .select("email, profile_id")
    .eq("submission_id", submissionId);
  const authorList = (authors as any[]) ?? [];
  const verb =
    decision === "accept"
      ? "accepted"
      : decision === "reject"
        ? "not accepted"
        : "returned for revision";
  for (const a of authorList) {
    if (!a.profile_id) continue;
    await admin.from("notifications").insert({
      profile_id: a.profile_id,
      title: `Decision by the Convener — ${noun} ${verb}`,
      body: `The Convener has recorded a final decision on "${s.title}"${
        s.paper_id ? ` (${s.paper_id})` : ""
      }: your ${noun} has been ${verb}.`,
      link: `/author/submissions/${submissionId}`,
    });
  }
  if (emailConfigured()) {
    const { subject, body } = convenerDecisionOverrideEmail({
      decision,
      stage: s.stage,
      submissionType: s.submission_type,
      paperId: s.paper_id,
      title: s.title,
      track: s.tracks?.name,
      message,
      conferenceName: "GLOGIFT 2027",
    });
    for (const a of authorList) {
      if (!a.email) continue;
      try {
        await sendEmail({
          to: a.email,
          subject,
          text: body,
          kind: "decision_override",
          sentBy: profile.id,
        });
      } catch {
        // Mail failure must never leave the override half-done.
      }
    }
  }

  await audit(profile.id, "decision.overridden", "submission", submissionId, {
    decision,
    stage: s.stage,
  });
  revalidatePath(`/chief/submissions/${submissionId}`);
  revalidatePath(`/author/submissions/${submissionId}`);
  revalidatePath("/chief");
  return {
    ok: true,
    message: `Decision overridden — your ${noun} decision is recorded and the authors have been notified.`,
  };
}

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
    .select(
      "paper_id, title, abstract, submission_type, author_id, track_id, tracks(name)"
    )
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

  // No role granted here — only when they accept the paper (agreePaperAssignment).
  // Declining the assignment must not leave a Track Editor dashboard behind.

  // A fresh token backs the Agree / Reject links in the assignment email.
  const assignmentToken = randomBytes(24).toString("hex");
  const { error } = await admin
    .from("submissions")
    .update({
      assigned_editor_id: editorId,
      assigned_editor_at: new Date().toISOString(),
      assigned_editor_by: profile.id,
      editor_accepted_at: null,
      editor_assignment_token: assignmentToken,
      editor_reject_reason: null,
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

  // System-generated assignment email carrying the abstract and token-backed
  // Agree / Reject links — best-effort, never blocks the assignment.
  if (emailConfigured() && target.email) {
    try {
      const { subject, body } = paperAssignmentEmail({
        editorName: target.full_name,
        paperId: s.paper_id,
        title: s.title,
        track: s.tracks?.name,
        submissionType: s.submission_type,
        abstract: s.abstract,
        agreeLink: `${siteUrl()}/paper-assignment/${assignmentToken}/agree`,
        rejectLink: `${siteUrl()}/paper-assignment/${assignmentToken}/reject`,
        convenerName: profile.full_name,
        convenerEmail: profile.email,
        conferenceName: "GLOGIFT 2027",
      });
      await sendEmail({
        to: target.email,
        subject,
        text: body,
        kind: "paper_assignment",
        sentBy: profile.id,
      });
    } catch {
      // Mail failure must never break the assignment.
    }
  }

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
    invite_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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

  // No role is granted at invite time. The acceptance page only needs them
  // signed in (getProfile), not the editor role — and granting it here would
  // wrongly leave a Track Editor dashboard behind if they later decline. The
  // editor role is granted only on acceptance (see acceptTrackEditorInvite).

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
  let declineLink: string | undefined;
  let needsSignup: boolean;
  let recipient: string;
  let recipientName: string;

  if (target) {
    const { data: held } = await admin
      .from("track_editors")
      .select("track_id, status, token, invite_expires_at")
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

    const tokenExpired =
      already?.invite_expires_at &&
      new Date(already.invite_expires_at).getTime() <= Date.now();
    let token: string =
      !already?.token || tokenExpired
        ? randomBytes(24).toString("hex")
        : already.token;
    const inviteExpiresAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    if (!already) {
      const { error } = await admin.from("track_editors").insert({
        track_id: trackId,
        profile_id: target.id,
        status: "invited",
        token,
        invited_by: profile.id,
        invited_at: new Date().toISOString(),
        invite_expires_at: inviteExpiresAt,
      });
      if (error) return { ok: false, message: error.message };
    } else if (!already.token || tokenExpired) {
      await admin
        .from("track_editors")
        .update({ token, invite_expires_at: inviteExpiresAt })
        .eq("track_id", trackId)
        .eq("profile_id", target.id);
    }

    // No editor role at invite/email time — only on acceptance
    // (acceptTrackEditorInvite). Until then they keep just the author dashboard.

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
    declineLink = `${siteUrl()}/track-editor-invite/${token}/decline`;
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
    declineLink,
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

/**
 * Accept an invitation to chair a track from the dashboard, without needing
 * the emailed link. Same rules as the link: the two-track ceiling applies.
 */
export async function acceptTrackInvitation(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const trackId = String(formData.get("track_id") ?? "");
  if (!trackId) return { ok: false, message: "Missing track." };

  const { data: row } = await admin
    .from("track_editors")
    .select("id, status, tracks(name)")
    .eq("track_id", trackId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!row) return { ok: false, message: "No invitation for that track." };
  if ((row as any).status === "accepted")
    return { ok: true, message: "You already chair this track." };

  const { data: held } = await admin
    .from("track_editors")
    .select("track_id")
    .eq("profile_id", profile.id)
    .eq("status", "accepted");
  const other = ((held as any[]) ?? []).filter((h) => h.track_id !== trackId);
  if (other.length >= MAX_TRACKS_PER_CHAIR)
    return {
      ok: false,
      message: `You already chair ${other.length} tracks, which is the maximum.`,
    };

  const { error } = await admin
    .from("track_editors")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", (row as any).id);
  if (error) return { ok: false, message: error.message };

  await audit(profile.id, "track.chair_accepted", "track", trackId);
  revalidatePath("/editor");
  revalidatePath("/chief");
  return {
    ok: true,
    message: `You are now the Track Editor for ${
      (row as any).tracks?.name ?? "this track"
    }.`,
  };
}

/**
 * Decline an invitation to chair a track. The row is removed rather than kept
 * as a refusal, so the Convener can invite someone else — or the same person
 * again later — with a clean slate. They are notified either way.
 */
export async function declineTrackInvitation(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const trackId = String(formData.get("track_id") ?? "");
  if (!trackId) return { ok: false, message: "Missing track." };

  const { data: row } = await admin
    .from("track_editors")
    .select("id, status, invited_by, tracks(name)")
    .eq("track_id", trackId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!row) return { ok: false, message: "No invitation for that track." };
  if ((row as any).status === "accepted")
    return {
      ok: false,
      message:
        "You already chair this track. Ask the Convener to release you from it.",
    };

  const { error } = await admin
    .from("track_editors")
    .delete()
    .eq("id", (row as any).id);
  if (error) return { ok: false, message: error.message };

  const trackName = (row as any).tracks?.name ?? "a track";
  if ((row as any).invited_by) {
    await admin.from("notifications").insert({
      profile_id: (row as any).invited_by,
      title: "A Track Editor invitation was declined",
      body: `${
        profile.full_name || profile.email
      } has declined to chair ${trackName}. The track needs someone else.`,
      link: "/chief",
    });
  }

  await audit(profile.id, "track.chair_declined", "track", trackId);
  revalidatePath("/editor");
  revalidatePath("/chief");
  return {
    ok: true,
    message: `Declined. The Convener has been told that ${trackName} needs another Track Editor.`,
  };
}

/**
 * Accept — or hand back — a paper the Convener assigned. Declining returns it
 * to the Convener rather than leaving it in limbo.
 */
export async function respondToPaperAssignment(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireRole("editor", "chief");
  const admin = createAdminClient();

  const submissionId = String(formData.get("submission_id") ?? "");
  const accept = String(formData.get("accept") ?? "") === "true";
  if (!submissionId) return { ok: false, message: "Missing submission." };

  const { data: sub } = await admin
    .from("submissions")
    .select("id, title, paper_id, assigned_editor_id, assigned_editor_by")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  if ((sub as any).assigned_editor_id !== profile.id)
    return { ok: false, message: "That paper is not assigned to you." };

  if (accept) {
    // Clear the one-time token too, so the emailed Agree/Reject link for this
    // same assignment is nullified — acting on one channel settles both.
    const { error } = await admin
      .from("submissions")
      .update({
        editor_accepted_at: new Date().toISOString(),
        editor_assignment_token: null,
      })
      .eq("id", submissionId);
    if (error) return { ok: false, message: error.message };

    await audit(profile.id, "paper.editor_accepted", "submission", submissionId);
    revalidatePath("/editor");
    revalidatePath(`/editor/submissions/${submissionId}`);
    return { ok: true, message: "Accepted. This paper is now yours to handle." };
  }

  const { error } = await admin
    .from("submissions")
    .update({
      assigned_editor_id: null,
      assigned_editor_at: null,
      editor_accepted_at: null,
      editor_assignment_token: null,
    })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  const s = sub as any;
  if (s.assigned_editor_by) {
    await admin.from("notifications").insert({
      profile_id: s.assigned_editor_by,
      title: "A Track Editor declined a paper",
      body: `${profile.full_name || profile.email} has handed back "${s.title}"${
        s.paper_id ? ` (${s.paper_id})` : ""
      }. It needs a different Track Editor.`,
      link: "/chief",
    });
  }

  await audit(profile.id, "paper.editor_declined", "submission", submissionId);
  revalidatePath("/editor");
  revalidatePath("/chief");
  return {
    ok: true,
    message: "Handed back to the Convener, who will assign someone else.",
  };
}

/**
 * Token-backed accept of a paper assignment, from the Agree link in the
 * assignment email — no sign-in required (the token is the authorisation).
 * Marks the paper accepted so it becomes active on the Track Editor's dashboard,
 * and clears the one-use token.
 */
export async function agreePaperAssignment(
  token: string
): Promise<{ ok: boolean; message?: string; paperId?: string | null }> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, title, paper_id, assigned_editor_id, assigned_editor_by, editor_accepted_at"
    )
    .eq("editor_assignment_token", token)
    .maybeSingle();
  if (!sub)
    return {
      ok: false,
      message: "This link is invalid or has already been used.",
    };
  const s = sub as any;
  if (!s.assigned_editor_id)
    return { ok: false, message: "This paper is no longer assigned." };

  await admin
    .from("submissions")
    .update({
      editor_accepted_at: s.editor_accepted_at ?? new Date().toISOString(),
      editor_assignment_token: null,
    })
    .eq("id", s.id);

  // Accepting the paper is what grants the editor role (plus author), so they
  // now have a Track Editor dashboard. Declining never reaches here.
  {
    const { data: prof } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", s.assigned_editor_id)
      .maybeSingle();
    const roles: string[] = (prof as any)?.roles ?? [];
    const need = ["author", "editor"].filter((r) => !roles.includes(r));
    if (need.length) {
      await admin
        .from("profiles")
        .update({ roles: [...roles, ...need], updated_at: new Date().toISOString() })
        .eq("id", s.assigned_editor_id);
    }
  }

  if (s.assigned_editor_by) {
    await admin.from("notifications").insert({
      profile_id: s.assigned_editor_by,
      title: "A Track Editor accepted an assigned paper",
      body: `The assigned Track Editor accepted "${s.title}"${
        s.paper_id ? ` (${s.paper_id})` : ""
      }.`,
      link: "/chief",
    });
  }

  await audit(s.assigned_editor_id, "paper.editor_accepted", "submission", s.id);
  revalidatePath("/editor");
  return { ok: true, paperId: s.paper_id };
}

/**
 * Token-backed reject of a paper assignment, from the Reject link — no sign-in.
 * Records the reason, hands the paper back to the Convener (with a notification
 * that carries the reason), and clears the one-use token.
 */
export async function rejectPaperAssignment(
  token: string,
  reason: string
): Promise<{ ok: boolean; message?: string }> {
  const admin = createAdminClient();
  const trimmed = (reason ?? "").trim().slice(0, 2000);
  if (!trimmed) return { ok: false, message: "Please give a brief reason." };

  const { data: sub } = await admin
    .from("submissions")
    .select("id, title, paper_id, assigned_editor_id, assigned_editor_by")
    .eq("editor_assignment_token", token)
    .maybeSingle();
  if (!sub)
    return {
      ok: false,
      message: "This link is invalid or has already been used.",
    };
  const s = sub as any;

  await admin
    .from("submissions")
    .update({
      assigned_editor_id: null,
      assigned_editor_at: null,
      editor_accepted_at: null,
      editor_assignment_token: null,
      editor_reject_reason: trimmed,
    })
    .eq("id", s.id);

  if (s.assigned_editor_by) {
    await admin.from("notifications").insert({
      profile_id: s.assigned_editor_by,
      title: "A Track Editor declined an assigned paper",
      body: `The paper "${s.title}"${
        s.paper_id ? ` (${s.paper_id})` : ""
      } was declined and returned to you. Reason: ${trimmed}`,
      link: "/chief",
    });
  }

  await audit(
    s.assigned_editor_id ?? s.assigned_editor_by ?? "",
    "paper.editor_declined",
    "submission",
    s.id,
    { reason: trimmed }
  );
  revalidatePath("/chief");
  return { ok: true };
}

/**
 * Token-backed Agree for a review invitation to a reviewer who already has an
 * account — from the Accept link in the email, no sign-in. Moves the assignment
 * to 'accepted' so it surfaces under "Awaiting your review", clears the one-use
 * token, and notifies the inviting Track Editor.
 */
export async function agreeReviewAssignment(
  token: string
): Promise<{ ok: boolean; message?: string; paperId?: string | null }> {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("assignments")
    .select(
      "id, status, reviewer_id, assigned_by, submissions(id, title, paper_id)"
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (!a)
    return {
      ok: false,
      message: "This link is invalid or has already been used.",
    };
  const row = a as any;
  const sub = row.submissions ?? {};

  if (row.status === "declined")
    return {
      ok: false,
      message: "You have already declined this review invitation.",
    };

  await admin
    .from("assignments")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      invite_token: null,
    })
    .eq("id", row.id);

  // Acceptance is what grants the role: ensure author + reviewer so, once
  // signed in, they see both dashboards. (A reject never reaches here, so a
  // declined invitee keeps whatever roles they already held — nothing more.)
  if (row.reviewer_id) {
    const { data: prof } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", row.reviewer_id)
      .maybeSingle();
    const roles: string[] = (prof as any)?.roles ?? [];
    const need = ["author", "reviewer"].filter((r) => !roles.includes(r));
    if (need.length) {
      await admin
        .from("profiles")
        .update({ roles: [...roles, ...need], updated_at: new Date().toISOString() })
        .eq("id", row.reviewer_id);
    }
  }

  if (row.assigned_by) {
    await admin.from("notifications").insert({
      profile_id: row.assigned_by,
      title: "A reviewer accepted an invitation",
      body: `A reviewer accepted the invitation to review "${sub.title}"${
        sub.paper_id ? ` (${sub.paper_id})` : ""
      }.`,
      link: sub.id ? `/editor/submissions/${sub.id}` : "/editor",
    });
  }

  await audit(row.reviewer_id ?? "", "assignment.accepted", "submission", sub.id ?? "");
  revalidatePath("/reviewer");
  if (sub.id) revalidatePath(`/editor/submissions/${sub.id}`);
  return { ok: true, paperId: sub.paper_id ?? null };
}

/**
 * Token-backed Reject for a review invitation (existing reviewer) — from the
 * Decline link, no sign-in. Records the reason, marks the assignment 'declined',
 * clears the token, and notifies the inviting Track Editor with the reason.
 */
export async function rejectReviewAssignment(
  token: string,
  reason: string
): Promise<{ ok: boolean; message?: string }> {
  const admin = createAdminClient();
  const trimmed = (reason ?? "").trim().slice(0, 2000);
  if (!trimmed) return { ok: false, message: "Please give a brief reason." };

  const { data: a } = await admin
    .from("assignments")
    .select(
      "id, status, reviewer_id, assigned_by, submissions(id, title, paper_id)"
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (!a)
    return {
      ok: false,
      message: "This link is invalid or has already been used.",
    };
  const row = a as any;
  const sub = row.submissions ?? {};

  await admin
    .from("assignments")
    .update({
      status: "declined",
      decline_reason: trimmed,
      responded_at: new Date().toISOString(),
      invite_token: null,
    })
    .eq("id", row.id);

  if (row.assigned_by) {
    await admin.from("notifications").insert({
      profile_id: row.assigned_by,
      title: "A reviewer declined an invitation",
      body: `A reviewer declined the invitation to review "${sub.title}"${
        sub.paper_id ? ` (${sub.paper_id})` : ""
      }. Reason: ${trimmed}`,
      link: sub.id ? `/editor/submissions/${sub.id}` : "/editor",
    });
  }

  await audit(row.reviewer_id ?? "", "assignment.declined", "submission", sub.id ?? "", {
    reason: trimmed,
  });
  if (sub.id) revalidatePath(`/editor/submissions/${sub.id}`);
  return { ok: true };
}

/**
 * Token-backed Reject for a NEW-person reviewer invitation (no account yet) —
 * from the Decline link, no sign-in. Marks the reviewer_invitations row
 * 'declined' with the reason and notifies the inviting Track Editor.
 */
export async function declineReviewerInvite(
  token: string,
  reason: string
): Promise<{ ok: boolean; message?: string }> {
  const admin = createAdminClient();
  const trimmed = (reason ?? "").trim().slice(0, 2000);
  if (!trimmed) return { ok: false, message: "Please give a brief reason." };

  const { data: inv } = await admin
    .from("reviewer_invitations")
    .select("id, status, invited_by, submission_id, submissions(id, title, paper_id)")
    .eq("token", token)
    .maybeSingle();
  if (!inv)
    return { ok: false, message: "This invitation link is invalid." };
  const row = inv as any;
  if (row.status === "accepted")
    return {
      ok: false,
      message: "This invitation has already been accepted.",
    };
  const sub = row.submissions ?? {};

  await admin
    .from("reviewer_invitations")
    .update({ status: "declined", decline_reason: trimmed })
    .eq("id", row.id);

  if (row.invited_by) {
    await admin.from("notifications").insert({
      profile_id: row.invited_by,
      title: "A reviewer declined an invitation",
      body: `An invited reviewer declined to review "${sub.title}"${
        sub.paper_id ? ` (${sub.paper_id})` : ""
      }. Reason: ${trimmed}`,
      link: sub.id ? `/editor/submissions/${sub.id}` : "/editor",
    });
  }

  await audit(row.invited_by ?? "", "reviewer.invite_declined", "submission", row.submission_id ?? "", {
    reason: trimmed,
  });
  if (sub.id) revalidatePath(`/editor/submissions/${sub.id}`);
  return { ok: true };
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
    kind: "track_editor_invitation",
    sentBy: profile.id,
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
    .select("id, track_id, status, invited_by, email, expires_at, tracks(name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  const row = inv as any;
  if (row.status === "revoked")
    return { ok: false, message: "This invitation has been withdrawn." };
  if (new Date(row.expires_at).getTime() <= Date.now())
    return { ok: false, message: "This invitation has expired. Ask the Convener for a new link." };
  if ((row.email ?? "").trim().toLowerCase() !== (profile.email ?? "").trim().toLowerCase())
    return {
      ok: false,
      message: "This invitation belongs to a different email address.",
    };

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

  // A track editor keeps their author role too, so they get both dashboards.
  const roles: string[] = profile.roles ?? [];
  const missing = ["author", "editor"].filter((r) => !roles.includes(r));
  if (missing.length) {
    await admin
      .from("profiles")
      .update({
        roles: [...roles, ...missing],
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
 * A track-editor invitee declines from the email's Decline link. No sign-in is
 * required — possession of the token is the authorisation. The invitation is
 * marked used so it can no longer be accepted. (The table's status check does
 * not yet allow a distinct 'declined' value, so we reuse 'revoked'.)
 */
export async function declineTrackEditorInvite(
  token: string
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("track_editor_invitations")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();
  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  if (inv.status === "accepted")
    return {
      ok: false,
      message: "This invitation has already been accepted.",
    };
  if (inv.status !== "revoked") {
    await admin
      .from("track_editor_invitations")
      .update({ status: "revoked" })
      .eq("id", inv.id);
  }
  return { ok: true, message: "Your response has been recorded." };
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
    .select("id, track_id, profile_id, status, invite_expires_at, tracks(name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) return { ok: false, message: "This invitation link is invalid." };
  if ((inv as any).profile_id !== profile.id)
    return { ok: false, message: "This invitation belongs to a different account." };
  if ((inv as any).status === "accepted")
    return { ok: true, message: "You already chair this track." };
  if (
    !(inv as any).invite_expires_at ||
    new Date((inv as any).invite_expires_at).getTime() <= Date.now()
  )
    return { ok: false, message: "This invitation has expired. Ask the Convener for a new link." };

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

  // Acceptance is what grants the role: ensure author + editor so they now have
  // both dashboards. (A reject/decline never reaches here, so declining leaves
  // them with only the author dashboard.)
  const roles: string[] = profile.roles ?? [];
  const need = ["author", "editor"].filter((r) => !roles.includes(r));
  if (need.length) {
    await admin
      .from("profiles")
      .update({ roles: [...roles, ...need], updated_at: new Date().toISOString() })
      .eq("id", profile.id);
  }

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
