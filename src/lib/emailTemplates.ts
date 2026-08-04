/**
 * Pure builders for the copy-paste / mailto email templates surfaced on the
 * dashboards. No email is sent by the portal — these just prefill the sender's
 * own mail client. Reviews are double-blind: author identities are never shown
 * to reviewers, and reviewer identities are never shown to authors (reviews are
 * labelled "Reviewer 1/2"). These go author-ward or chair-ward only.
 */

import { GUIDELINES_URL } from "@/lib/types";

export type EmailContent = { subject: string; body: string };

const CONF_DEFAULT = "GLOGIFT 2027";

/**
 * The role line of a signature: role, the track (chairs only), the full
 * conference title, then the short brand — e.g.
 * "Track Editor, Operations & Supply Chain, International Conference
 * on …, GLOGIFT 2027". Empty parts are dropped rather than leaving stray
 * commas, and a title identical to the brand is not repeated.
 */
export function signOffLine(o: {
  role: string;
  track?: string | null;
  conf?: string | null;
  brand?: string | null;
}): string {
  const brand = (o.brand ?? "").trim() || CONF_DEFAULT;
  const conf = (o.conf ?? "").trim();
  return [o.role, (o.track ?? "").trim(), conf === brand ? "" : conf, brand]
    .filter(Boolean)
    .join(", ");
}

function greeting(name?: string, fallback = "Author"): string {
  const n = (name ?? "").trim();
  return n ? `Dear ${n},` : `Dear ${fallback},`;
}

/** Join body lines, dropping empty entries that are explicitly `null`. */
function compose(lines: (string | null)[]): string {
  return lines.filter((l): l is string => l !== null).join("\n");
}

/** One reviewer's author-facing feedback. Identities are never disclosed. */
export type ReviewComment = {
  /** "Reviewer 1", "Reviewer 2", … — never a name. */
  label: string;
  recommendation?: string | null;
  comments?: string | null;
};

type DecisionOpts = {
  paperId?: string | null;
  title: string;
  track?: string;
  decision: string;
  /** Pathway A ("abstract_presentation") vs B ("full_paper_presentation"). */
  submissionType?: string;
  /** Pathway B: the full-paper submission deadline the Track Editor set (YYYY-MM-DD). */
  fullPaperDeadline?: string | null;
  /** The track chair's own message to the author. */
  message?: string;
  conferenceName?: string;
  name?: string;
  /** Submitted reviews, author-facing comments only. */
  reviews?: ReviewComment[];
  chairName?: string | null;
  chairEmail?: string | null;
  /** How the sender signs: a track chair names their track, a Convener does not. */
  signerRole?: "Track Editor" | "Convener";
  /** Short brand for the subject line, e.g. "GLOGIFT 2027". */
  brand?: string;
};

/** "minor_revision" → "Minor revision". */
function prettyRecommendation(r?: string | null): string {
  if (!r) return "";
  const s = r.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-10-15" → "15 October 2026". Falls back to the raw value. */
function prettyDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

/**
 * The reviewers' feedback as the author should see it: numbered, never named,
 * and only ever `comments_to_author` — the confidential notes to the chair are
 * not passed in here at all.
 */
function reviewerSection(reviews?: ReviewComment[]): string | null {
  const withText = (reviews ?? []).filter((r) => (r.comments ?? "").trim());
  if (withText.length === 0) return null;

  const blocks = withText.map((r) => {
    const rec = prettyRecommendation(r.recommendation);
    return `${r.label}${rec ? ` (${rec})` : ""}:\n${(r.comments ?? "").trim()}`;
  });
  return `\nREVIEWER COMMENTS\n\n${blocks.join("\n\n")}`;
}

function decisionEmail(
  stage: "abstract" | "full_paper",
  o: DecisionOpts
): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const brand = o.brand || CONF_DEFAULT;
  const role = o.signerRole ?? "Track Editor";
  const item = stage === "full_paper" ? "full paper" : "abstract";
  const label = stage === "full_paper" ? "Full Paper" : "Abstract";
  const pid = o.paperId || "(to be assigned)";

  let headline: string;
  let nextStep: string | null = null;
  switch (o.decision) {
    case "accept":
      headline = `we are pleased to inform you that your ${item} has been ACCEPTED`;
      nextStep =
        stage === "abstract"
          ? o.submissionType === "full_paper_presentation"
            ? `As a next step, please submit your full paper${
                o.fullPaperDeadline
                  ? ` by ${prettyDate(o.fullPaperDeadline)}`
                  : ""
              }, prepared per the author guidelines: ${GUIDELINES_URL}. Please ensure you submit well before the conference full-paper deadline. The full-paper upload is now available on your dashboard.`
            : "As a next step, please proceed to complete your conference registration to confirm your presentation. Registration details are available on the conference website and your dashboard."
          : "Please prepare your camera-ready version per the conference guidelines, and ensure your conference registration is complete.";
      break;
    case "minor_revision":
      headline = `your ${item} has been accepted subject to MINOR REVISIONS`;
      nextStep =
        "Kindly revise your submission per the comments below and resubmit through the portal.";
      break;
    case "major_revision":
      headline = `your ${item} requires MAJOR REVISIONS before it can be reconsidered`;
      nextStep =
        "Please address the comments below and resubmit through the portal for another round of review.";
      break;
    case "reject":
      headline = `after careful review, your ${item} could not be accepted for the conference`;
      nextStep =
        "We hope you will consider participating in future editions of the conference.";
      break;
    default:
      headline = `a decision has been recorded for your ${item}`;
  }

  const subject = `${brand} — ${label} decision: ${pid}`;
  const body = compose([
    greeting(o.name),
    "",
    `Regarding your ${item} submitted to ${brand}${
      o.track ? `, ${o.track} track` : ""
    }:`,
    "",
    `Paper ID: ${pid}`,
    `Title: ${o.title}`,
    "",
    `On behalf of the review committee, ${headline}.`,
    nextStep,
    reviewerSection(o.reviews),
    o.message && o.message.trim()
      ? `\nCOMMENTS FROM THE TRACK EDITOR\n\n${o.message.trim()}`
      : null,
    "",
    `For any additional information, please contact the Chair and Coordinator: ${ORG_CONTACTS}.`,
    "",
    "With regards,",
    o.chairName || null,
    signOffLine({
      role,
      // A Convener signs for the whole conference, not a single track.
      track: role === "Convener" ? null : o.track,
      conf,
      brand,
    }),
    o.chairEmail || null,
  ]);

  return { subject, body };
}

export function abstractDecisionEmail(o: DecisionOpts): EmailContent {
  return decisionEmail("abstract", o);
}

export function fullPaperDecisionEmail(o: DecisionOpts): EmailContent {
  return decisionEmail("full_paper", o);
}

/**
 * The decision-outcome notice sent to the reviewers once the Track Editor
 * records a decision on a paper they reviewed. Double-blind: it carries the
 * paper id, title and track only — never the author identities. Reviewers are
 * BCC'd (they never see one another) and the Convener is CC'd. Signed by the
 * handling Track Editor.
 */
export function reviewDecisionNoticeEmail(o: {
  paperId?: string | null;
  title: string;
  track?: string | null;
  decision: string;
  /** "abstract" (Pathway A) or "manuscript" (Pathway B). */
  itemLabel: "abstract" | "manuscript";
  chairName?: string | null;
  chairEmail?: string | null;
  conferenceName?: string | null;
  brand?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const brand = o.brand || CONF_DEFAULT;
  const pid = o.paperId || "(to be assigned)";
  const decision = prettyRecommendation(
    o.decision === "sent_back" ? "sent back to author" : o.decision
  );
  const subject = `${brand} — Review outcome: ${pid}`;
  const body = compose([
    "Dear Reviewer,",
    "",
    `Thank you for reviewing the following ${o.itemLabel} for ${brand}${
      o.track ? `, ${o.track} track` : ""
    }:`,
    "",
    `Paper ID: ${pid}`,
    `Title: ${o.title}`,
    "",
    `A decision has now been recorded on this ${o.itemLabel}: ${decision.toUpperCase()}.`,
    "",
    "We are grateful for the time and expertise you contributed. Your assessment was central to reaching this decision, and we look forward to working with you again.",
    "",
    `For any additional information, please contact the Chair and Coordinator: ${ORG_CONTACTS}.`,
    "",
    "With regards,",
    o.chairName || null,
    signOffLine({ role: "Track Editor", track: o.track, conf, brand }),
    o.chairEmail || null,
  ]);
  return { subject, body };
}

/** Where to write for help with a Track Editor invitation. */
const CHAIR_HELP = "glogift27.chair@iimsambalpur.ac.in";

/** The two organiser help contacts (chair + coordinator), for letter footers. */
const ORG_CONTACTS =
  "glogift27.chair@iimsambalpur.ac.in · glogift27.coordinator@iimsambalpur.ac.in";

export function chairInviteEmail(o: {
  name?: string;
  track: string;
  openCount?: number;
  conferenceName?: string;
  /** Short brand, e.g. "GLOGIFT 2027". */
  brand?: string;
  /** The conference's own web address. */
  siteUrl?: string;
  /** Acceptance or sign-up link — the invitation is only live once used. */
  link?: string;
  /** Optional decline link; when present the email offers Agree / Decline. */
  declineLink?: string;
  /** True when the invitee has no account and the link starts a sign-up. */
  needsSignup?: boolean;
  convenerName?: string | null;
  convenerEmail?: string | null;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const brand = o.brand || CONF_DEFAULT;
  const subject = `${brand} — Invitation to serve as Track Editor (${o.track})`;

  const body = compose([
    greeting(o.name, "Colleague"),
    "",
    "Greetings of the Day!",
    "",
    `You have kindly been invited to serve as the Track Editor for the ${o.track} track of ${conf}.`,
    typeof o.openCount === "number" && o.openCount > 0
      ? `There ${o.openCount === 1 ? "is" : "are"} currently ${o.openCount} submission${
          o.openCount === 1 ? "" : "s"
        } awaiting handling in this track.`
      : null,
    "",
    "As Track Editor you will invite reviewers, manage assignments, and record decisions for the papers placed in your care. Papers are assigned to you individually by the Convener, and appear in your Track Queue as they are.",
    o.siteUrl ? "" : null,
    o.siteUrl ? `Conference portal: ${o.siteUrl}` : null,
    "",
    ...(o.link && o.declineLink
      ? [
          "Please let us know your decision using one of the links below.",
          "",
          "AGREE — register and open your Track Editor dashboard:",
          o.link,
          "",
          "DECLINE — if you are unable to serve on the editorial team:",
          o.declineLink,
        ]
      : o.link
        ? [
            o.needsSignup
              ? "To begin, please complete the sign-up process on the conference portal using the link below. Your details are already filled in — set a password to finish, and your Track Editor dashboard opens straight away:"
              : "Please accept the invitation using the link below. Your Track Editor dashboard opens as soon as you do:",
            o.link,
          ]
        : []),
    "",
    "For further information, please feel free to contact:",
    CHAIR_HELP,
    "",
    "With regards,",
    o.convenerName || null,
    signOffLine({ role: "Convener", track: o.track, conf, brand }),
    o.convenerEmail || null,
  ]);
  return { subject, body };
}

/** Full conference title, used in the editorial-office signature block. */
const FULL_CONF_TITLE =
  "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization";

const PATHWAY_LABEL: Record<string, string> = {
  abstract_presentation: "Pathway A — Abstract & Presentation Only",
  full_paper_presentation: "Pathway B — Full Paper & Presentation",
};
const ATTENDANCE_LABEL: Record<string, string> = {
  virtual: "Virtual Conference (Online)",
  onsite: "On-Site Institution Visit (Offline)",
};

/**
 * System-generated acknowledgement sent to the corresponding author and every
 * co-author (who has an email) the moment an abstract is submitted. The
 * corresponding author and co-authors get slightly different opening lines; the
 * summary, next-steps and Editorial Office signature are identical.
 */
export function submissionAcknowledgementEmail(o: {
  recipientName?: string | null;
  isCorresponding: boolean;
  correspondingName?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  submissionType?: string | null;
  participationMode?: string | null;
  /** e.g. "Dummy Author 1 (corresponding), Dr Co B, Dr Co C". */
  authorsLine?: string | null;
  /** Co-authors only: their personalised, pre-filled sign-up link. */
  signupUrl?: string | null;
  conferenceName?: string | null;
}): EmailContent {
  const conf = (o.conferenceName ?? "").trim() || CONF_DEFAULT;
  const pathway = PATHWAY_LABEL[o.submissionType ?? ""] ?? (o.submissionType || "—");
  const attendance =
    ATTENDANCE_LABEL[o.participationMode ?? ""] ?? (o.participationMode || "—");
  const isFullPaper = o.submissionType === "full_paper_presentation";

  const subject = `${conf} — Abstract received${o.paperId ? ` (${o.paperId})` : ""}`;

  const intro = o.isCorresponding
    ? `Thank you for your submission to ${conf} — the ${FULL_CONF_TITLE}, to be held on 25–27 February 2027 at IIM Sambalpur.\n\nWe are pleased to confirm that your abstract has been received. A summary of your submission is below.`
    : `You have been listed as a co-author on the following abstract, submitted to ${conf} by ${(
        o.correspondingName ?? "the corresponding author"
      ).trim()} (corresponding author). This note is to keep you informed; a summary is below.`;

  const summary = [
    `  Paper ID      ${o.paperId ?? "—"}`,
    `  Title         ${o.title}`,
    `  Track         ${o.track ?? "—"}`,
    `  Pathway       ${pathway}`,
    `  Attendance    ${attendance}`,
    o.authorsLine ? `  Authors       ${o.authorsLine}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  // The corresponding author is done; a co-author is asked to register (with
  // their personalised, pre-filled link) so they can sign in and track status.
  const correspondingSteps: (string | null)[] = [
    "What happens next",
    "Your abstract will be reviewed by the track's editorial team, and you will be notified of the outcome by email. No action is required from you at this stage.",
    isFullPaper
      ? "If your abstract is accepted, you will be invited to upload the full paper by the full-paper deadline."
      : null,
  ];
  const coAuthorSteps: (string | null)[] = [
    "Complete your registration",
    "Please register on the conference portal so you can sign in and follow the status of this submission. The details provided by the corresponding author are already pre-filled — simply set a password and complete the remaining fields.",
    o.signupUrl ? "" : null,
    o.signupUrl ? `Register here: ${o.signupUrl}` : null,
    "",
    "What happens next",
    "The abstract will be reviewed by the track's editorial team. Once you have signed in, you can follow the outcome from your dashboard.",
    isFullPaper
      ? "If the abstract is accepted, the corresponding author will be invited to upload the full paper by the full-paper deadline."
      : null,
  ];

  const body = compose([
    greeting(o.recipientName ?? undefined),
    "",
    intro,
    "",
    summary,
    "",
    "Please note",
    "• Your selected pathway and participation preference, once submitted, cannot be changed, owing to administrative constraints.",
    "• You are expected to be available on all three days of the conference (25–27 February 2027).",
    "• The detailed conference schedule will be shared at least two weeks in advance of the conference.",
    "",
    ...(o.isCorresponding ? correspondingSteps : coAuthorSteps),
    "",
    "This is a system-generated email — please do not reply to this message. If any detail above is incorrect, or you have any questions, write to us at the addresses below.",
    "",
    "Warm regards,",
    "GLOGIFT 2027 Editorial Office",
    FULL_CONF_TITLE,
    "Indian Institute of Management Sambalpur",
    "glogift27.chair@iimsambalpur.ac.in · glogift27.coordinator@iimsambalpur.ac.in",
    "glogift2027.in",
  ]);

  return { subject, body };
}

/**
 * Sent to a Track Editor the moment the Convener assigns them a paper. Carries
 * the abstract and metadata, and two links: Agree (take on the paper) and
 * Reject (hand it back, giving a reason). Token-backed, so it works without
 * signing in.
 */
export function paperAssignmentEmail(o: {
  editorName?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  submissionType?: string | null;
  abstract?: string | null;
  agreeLink: string;
  rejectLink: string;
  convenerName?: string | null;
  convenerEmail?: string | null;
  conferenceName?: string | null;
}): EmailContent {
  const conf = (o.conferenceName ?? "").trim() || CONF_DEFAULT;
  const pathway =
    PATHWAY_LABEL[o.submissionType ?? ""] ?? (o.submissionType || "—");
  const subject = `${conf} — Paper assigned to you${
    o.paperId ? ` (${o.paperId})` : ""
  }`;

  const body = compose([
    greeting(o.editorName ?? undefined, "Colleague"),
    "",
    `You have been assigned the following abstract to handle as Track Editor for the ${
      o.track ?? "assigned"
    } track of ${conf}.`,
    "",
    `  Paper ID   ${o.paperId ?? "—"}`,
    `  Title      ${o.title}`,
    `  Track      ${o.track ?? "—"}`,
    `  Pathway    ${pathway}`,
    "",
    "Abstract",
    (o.abstract ?? "").trim() || "(No abstract provided.)",
    "",
    "Please let us know whether you are able to handle this paper using one of the links below.",
    "",
    "AGREE — take on this paper (it will appear on your Track Editor dashboard):",
    o.agreeLink,
    "",
    "REJECT — hand it back to the Convener (you will be asked for a brief reason):",
    o.rejectLink,
    "",
    "This is a system-generated email — please do not reply to this message. For any questions, write to the addresses below.",
    "",
    "With regards,",
    o.convenerName || null,
    signOffLine({ role: "Convener", track: o.track, conf, brand: conf }),
    o.convenerEmail || null,
    "",
    CHAIR_HELP,
  ]);

  return { subject, body };
}

export function announcementEmail(o: {
  subject?: string;
  message?: string;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const subject = o.subject?.trim() || `${conf} — Announcement`;
  const body = compose([
    "Dear Participant,",
    "",
    o.message?.trim() || "[Type your announcement here.]",
    "",
    "With regards,",
    `Editorial Office, ${conf}`,
  ]);
  return { subject, body };
}

/**
 * System-generated thank-you to a reviewer the moment they submit their review.
 */
export function reviewThankYouEmail(o: {
  reviewerName?: string | null;
  paperId?: string | null;
  title?: string | null;
  track?: string | null;
  /** Whether the reviewed item was an abstract or a full paper. */
  itemLabel?: "abstract" | "manuscript";
  /** The handling Track Editor, for the signature. */
  chairName?: string | null;
  chairEmail?: string | null;
  signerRole?: "Track Editor" | "Convener";
  conferenceName?: string | null;
  brand?: string | null;
}): EmailContent {
  const brand = (o.brand ?? "").trim() || CONF_DEFAULT;
  const conf = (o.conferenceName ?? "").trim();
  const role = o.signerRole || "Track Editor";
  const item = o.itemLabel || "submission";
  const idPart = o.paperId ? ` (${o.paperId})` : "";
  const subject = `${brand} — Thank you for your review${idPart}`;
  // Signed by the handling Track Editor when known; otherwise the office.
  const signature = o.chairName
    ? [
        "With sincere thanks,",
        o.chairName,
        signOffLine({ role, track: role === "Convener" ? null : o.track, conf, brand }),
        o.chairEmail || null,
      ]
    : ["With sincere thanks,", `Editorial Office, ${brand}`];
  const body = compose([
    greeting(o.reviewerName ?? undefined, "Reviewer"),
    "",
    `Thank you for submitting your review of the ${item}${idPart}${o.title ? ` — "${o.title}"` : ""}${o.track ? `, in the ${o.track} track` : ""}.`,
    "",
    "We are truly grateful for the time and expertise you have given. Your assessment is an essential part of maintaining the quality and credibility of the conference, and it will directly inform the decision.",
    "",
    "Your review has been recorded and can no longer be edited. There is nothing further you need to do.",
    "",
    `For any query, please contact the Chair and Coordinator: ${ORG_CONTACTS}.`,
    "",
    "This is a system-generated email — please do not reply.",
    "",
    ...signature,
  ]);
  return { subject, body };
}

/**
 * System-generated note when the Track Editor returns a full paper to the
 * author to RESTART the manuscript submission — used when the corresponding
 * author has not followed the submission guidelines. The abstract acceptance
 * stands; the manuscript is reset and must be re-packaged and re-submitted.
 */
export function manuscriptReturnedEmail(o: {
  paperId?: string | null;
  title?: string;
  track?: string | null;
  message?: string;
  name?: string | null;
  /** The deciding editor, for the signature. */
  chairName?: string | null;
  chairEmail?: string | null;
  signerRole?: "Track Editor" | "Convener";
  /** Full conference title for the signature. */
  conferenceName?: string | null;
  /** Short brand for the subject line. */
  brand?: string | null;
}): EmailContent {
  const brand = (o.brand ?? "").trim() || CONF_DEFAULT;
  const conf = (o.conferenceName ?? "").trim();
  const role = o.signerRole || "Track Editor";
  const idPart = o.paperId ? ` (${o.paperId})` : "";
  const subject = `${brand} — Manuscript returned to restart${idPart}`;
  const body = compose([
    greeting(o.name ?? undefined),
    "",
    `Your full paper${idPart}${o.title ? ` — "${o.title}"` : ""} has been returned because the submission does not yet follow the manuscript submission guidelines.`,
    "",
    "Your abstract acceptance stands. The manuscript submission has been reset — please re-package your full paper (Title Page, blinded manuscript and any supporting files), rebuild the camera-ready, and submit it again from your dashboard.",
    o.message && o.message.trim()
      ? `\nNOTE FROM THE ${role.toUpperCase()}\n\n${o.message.trim()}`
      : null,
    "",
    `For any additional information, please contact the Chair and Coordinator: ${ORG_CONTACTS}.`,
    "",
    "This is a system-generated email — please do not reply.",
    "",
    "With regards,",
    o.chairName || null,
    signOffLine({ role, track: role === "Convener" ? null : o.track, conf, brand }),
    o.chairEmail || null,
  ]);
  return { subject, body };
}

/**
 * System-generated note to a certificate recipient once the Editorial Office
 * issues their certificate. Points them to their dashboard, where the PDF is
 * available to download.
 */
export function certificateIssuedEmail(o: {
  recipientName?: string | null;
  certificateType: "participant" | "reviewer" | "track_editor";
  certificateNumber: string;
  conferenceName?: string;
  brand?: string;
  dashboardUrl: string;
}): EmailContent {
  const brand = o.brand || CONF_DEFAULT;
  const conf = o.conferenceName || CONF_DEFAULT;
  const kind =
    o.certificateType === "participant"
      ? "Participation & Presentation"
      : o.certificateType === "reviewer"
        ? "Appreciation (as a Reviewer)"
        : "Appreciation (as a Track Editor)";

  const subject = `${brand} — Your certificate of ${kind}`;
  const body = compose([
    greeting(o.recipientName ?? undefined),
    "",
    `Thank you very much for your valuable contribution to ${conf}. Your participation and support are deeply appreciated, and they were central to the success of the conference.`,
    "",
    `With gratitude, we are pleased to enclose your Certificate of ${kind} (Certificate No. ${o.certificateNumber}) — attached to this email as a PDF.`,
    "",
    `You can also view and download it any time from your dashboard: ${o.dashboardUrl}`,
    "",
    "This is a system-generated email — please do not reply. For any query, kindly write to the conference organisers.",
    "",
    "With warm regards,",
    `Editorial Office, ${brand}`,
  ]);
  return { subject, body };
}

/**
 * System-generated notice to an author that their participation certificate has
 * been generated and can be downloaded from their submission dashboard.
 */
export function participationCertificateReadyEmail(o: {
  recipientName?: string | null;
  paperCount: number;
  conferenceName?: string;
  brand?: string;
  dashboardUrl: string;
}): EmailContent {
  const brand = o.brand || CONF_DEFAULT;
  const conf = o.conferenceName || CONF_DEFAULT;
  const many = o.paperCount > 1;
  const subject = `${brand} — Your participation certificate is ready to download`;
  const body = compose([
    greeting(o.recipientName ?? undefined),
    "",
    `Thank you for your participation in ${conf}. Your Certificate of Participation${
      many ? "s have" : " has"
    } now been generated.`,
    "",
    `You can download ${
      many ? "them" : "it"
    } from your submission dashboard: open ${
      many ? "each of your papers" : "your paper"
    } and use the “Download Participation Certificate” button.`,
    "",
    `Dashboard: ${o.dashboardUrl}`,
    "",
    "This is a system-generated email — please do not reply. For any query, kindly write to the conference organisers.",
    "",
    "With warm regards,",
    `Editorial Office, ${brand}`,
  ]);
  return { subject, body };
}

/**
 * System-generated notice that a delegate's mode of participation has been
 * switched (On-site <-> Virtual) at their own request, by the Participation
 * desk. States it is final and points to the Chair / Coordinator.
 */
export function participationModeChangedEmail(o: {
  recipientName?: string | null;
  fromMode: string; // "On-site" | "Virtual"
  toMode: string;
  brand?: string;
  conferenceName?: string;
}): EmailContent {
  const brand = o.brand || CONF_DEFAULT;
  const conf = o.conferenceName || CONF_DEFAULT;
  const subject = `${brand} — Change in your mode of participation`;
  const body = compose([
    greeting(o.recipientName ?? undefined),
    "",
    `Based upon your request, your mode of participation for ${conf} has been changed from ${o.fromMode} to ${o.toMode}.`,
    "",
    "Please note: this change is now final and cannot be reversed online. If this is not correct, or you need any further change, kindly contact the conference team:",
    "  - Chair, GLOGIFT 2027 - glogift27.chair@iimsambalpur.ac.in",
    "  - Coordinator, GLOGIFT 2027 - glogift27.coordinator@iimsambalpur.ac.in",
    "",
    "This is a system-generated email - please do not reply.",
    "",
    "With warm regards,",
    `Editorial Office, ${brand}`,
  ]);
  return { subject, body };
}

/**
 * System-generated acknowledgement to every author (corresponding + co-authors)
 * once the full paper is submitted for review — carries the Manuscript ID. Fires
 * for both packaging options (A and B).
 */
export function fullPaperSubmittedAuthorEmail(o: {
  paperId?: string | null;
  title: string;
  track?: string | null;
  option?: string | null;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const ref = [o.paperId ? `Paper ${o.paperId}` : null, `"${o.title}"`]
    .filter(Boolean)
    .join(" — ");
  const subject = `${conf} — Full paper received${o.paperId ? ` (${o.paperId})` : ""}`;
  const body = compose([
    "Dear Author,",
    "",
    `Thank you — the full paper for ${ref}${
      o.track ? ` in the ${o.track} track` : ""
    } has been received and is now entered for review.`,
    "",
    `Manuscript ID: ${o.paperId ?? "—"}`,
    o.option ? `Packaging: Option ${o.option}.` : null,
    "",
    "Your manuscript will undergo double-blind peer review. You will be notified of the decision — accept, revise or reject — with the reviewers' feedback.",
    "",
    "This acknowledgement is sent to the corresponding author and all co-authors on the paper.",
    "",
    "This is a system-generated email — please do not reply. For any query, kindly write to the conference organisers.",
    "",
    "With regards,",
    `Editorial Office, ${conf}`,
  ]);
  return { subject, body };
}

/**
 * System-generated note to the handling Track Editor when a full paper is
 * submitted, asking them to facilitate the review — invite expert reviewers and
 * note the minimum acceptances needed to endorse the paper. Fires for both
 * packaging options.
 */
export function fullPaperReviewFacilitationEmail(o: {
  editorName?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  reviewLink?: string;
  minAccepts?: number;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const ref = [o.paperId ? `Paper ${o.paperId}` : null, `"${o.title}"`]
    .filter(Boolean)
    .join(" — ");
  const min = o.minAccepts ?? 2;
  const subject = `${conf} — Full paper submitted for review${
    o.paperId ? ` (${o.paperId})` : ""
  } — please facilitate`;
  const body = compose([
    greeting(o.editorName ?? undefined, "Track Editor"),
    "",
    `A full paper has been submitted under your track${
      o.track ? ` (${o.track})` : ""
    } and now requires you to facilitate the review process:`,
    "",
    ref,
    "",
    "At this stage, expert reviewers are required to ensure the credibility of the submitted manuscript. Please invite suitable, conflict-free reviewers to carry out a double-blind review.",
    "",
    `A minimum of ${min} reviewer acceptances (Accept recommendations) are required to endorse the submission for publication.`,
    "",
    o.reviewLink
      ? `Open the paper to invite reviewers and record your decision: ${o.reviewLink}`
      : null,
    "",
    "This is a system-generated email — please do not reply.",
    "",
    "With regards,",
    `Editorial Office, ${conf}`,
  ]);
  return { subject, body };
}

/**
 * System-generated note to all authors when the Convener overrides / sets the
 * final decision on a submission (abstract or manuscript). Stage-aware wording;
 * makes clear the decision is the Convener's and supersedes any earlier one.
 */
export function convenerDecisionOverrideEmail(o: {
  decision: "accept" | "revisions_requested" | "reject";
  stage?: string | null;
  submissionType?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  message?: string | null;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const isManuscript = o.stage === "full_paper";
  const noun = isManuscript ? "manuscript" : "abstract";
  const Noun = isManuscript ? "Manuscript" : "Abstract";
  const ref = [o.paperId ? `Paper ${o.paperId}` : null, `"${o.title}"`]
    .filter(Boolean)
    .join(" — ");
  const verb =
    o.decision === "accept"
      ? "ACCEPTED"
      : o.decision === "reject"
        ? "NOT ACCEPTED"
        : "returned for REVISION";

  const next: string[] = [];
  if (o.decision === "accept") {
    if (!isManuscript && o.submissionType === "full_paper_presentation")
      next.push(
        "You may now submit your full paper (Pathway B) or present on the accepted abstract (Pathway A). Please also proceed to register for the conference."
      );
    else
      next.push(
        "Please proceed to register for the conference to confirm your participation and presentation."
      );
  } else if (o.decision === "revisions_requested") {
    next.push(`Please revise your ${noun} and resubmit through the portal.`);
  } else if (isManuscript && o.submissionType === "full_paper_presentation") {
    next.push(
      "If your abstract stands accepted, you may still register, attend and present on the strength of the accepted abstract."
    );
  }

  const subject = `${conf} — ${Noun} decision by the Convener${
    o.paperId ? ` (${o.paperId})` : ""
  }`;
  const body = compose([
    "Dear Author,",
    "",
    `The Convener has reviewed your ${noun} for ${ref}${
      o.track ? ` in the ${o.track} track` : ""
    } and recorded a final decision.`,
    "",
    `Decision: your ${noun} has been ${verb}.`,
    o.message ? "" : null,
    o.message ? o.message.trim() : null,
    "",
    ...next,
    next.length ? "" : null,
    "This decision was taken by the Convener and supersedes any earlier decision on this submission.",
    "",
    "This is a system-generated email — please do not reply.",
    "",
    "With regards,",
    `Convener, ${conf}`,
  ]);
  return { subject, body };
}

/**
 * System-generated note to the Convener when a full paper is submitted but the
 * paper has NO Track Editor carried over from Pathway A — the Convener assigns
 * one so the manuscript review can be facilitated. Same assignment flow as the
 * abstract stage, worded for the manuscript.
 */
export function manuscriptNeedsEditorEmail(o: {
  convenerName?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  assignLink?: string;
  minAccepts?: number;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const ref = [o.paperId ? `Paper ${o.paperId}` : null, `"${o.title}"`]
    .filter(Boolean)
    .join(" — ");
  const min = o.minAccepts ?? 2;
  const subject = `${conf} — Manuscript submitted, Track Editor assignment needed${
    o.paperId ? ` (${o.paperId})` : ""
  }`;
  const body = compose([
    greeting(o.convenerName ?? undefined, "Convener"),
    "",
    `A full paper (manuscript) has been submitted${
      o.track ? ` under the ${o.track} track` : ""
    } but does not yet have a Track Editor assigned:`,
    "",
    ref,
    "",
    "Please assign a Track Editor to facilitate the manuscript review. At this stage, expert reviewers are required to ensure the credibility of the submitted manuscript.",
    "",
    `A minimum of ${min} reviewer acceptances (Accept recommendations) are required to endorse the submission for publication.`,
    "",
    o.assignLink ? `Assign a Track Editor here: ${o.assignLink}` : null,
    "",
    "This is a system-generated email — please do not reply.",
    "",
    "With regards,",
    `Editorial Office, ${conf}`,
  ]);
  return { subject, body };
}

/**
 * System-generated note when the corresponding author cancels a Pathway B full
 * paper, reverting the paper to an accepted Pathway A abstract. Sent to every
 * author, with the handling Track Editor and the Convener CC'd. Reminds them the
 * accepted abstract still stands and they should proceed to register.
 */
export function fullPaperCancelledEmail(o: {
  correspondingName?: string | null;
  paperId?: string | null;
  title: string;
  track?: string | null;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const ref = [o.paperId ? `Paper ${o.paperId}` : null, `"${o.title}"`]
    .filter(Boolean)
    .join(" — ");
  const who = (o.correspondingName ?? "").trim() || "The corresponding author";

  const subject = `${conf} — Full paper cancelled, reverted to Pathway A (${ref})`;
  const body = compose([
    "Dear Author,",
    "",
    `${who} has chosen to cancel the full-paper (Pathway B) submission for ${ref}${
      o.track ? ` in the ${o.track} track` : ""
    }.`,
    "",
    "What this means:",
    "• The paper reverts to Pathway A — Abstract & Presentation.",
    "• Your abstract remains ACCEPTED; only the full-paper track has been withdrawn.",
    "• No full paper is expected for this submission any longer.",
    "",
    "Please note: as your abstract has been accepted, you are still to register for the conference. Registration confirms your place to attend and present on the accepted abstract.",
    "",
    "The handling Track Editor and the Convener are copied on this note for their records.",
    "",
    "We look forward to welcoming you and your co-authors at the conference.",
    "",
    "This is a system-generated email — please do not reply. For any query, kindly write to the conference organisers.",
    "",
    "With regards,",
    `Editorial Office, ${conf}`,
  ]);
  return { subject, body };
}
