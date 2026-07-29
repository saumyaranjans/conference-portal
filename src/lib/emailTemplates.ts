/**
 * Pure builders for the copy-paste / mailto email templates surfaced on the
 * dashboards. No email is sent by the portal — these just prefill the sender's
 * own mail client. Author identity is never referenced where reviews are
 * single-blind; these go author-ward or chair-ward only.
 */

export type EmailContent = { subject: string; body: string };

const CONF_DEFAULT = "GLOGIFT 2027";

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
  /** The track chair's own message to the author. */
  message?: string;
  conferenceName?: string;
  name?: string;
  /** Submitted reviews, author-facing comments only. */
  reviews?: ReviewComment[];
  chairName?: string | null;
  chairEmail?: string | null;
};

/** "minor_revision" → "Minor revision". */
function prettyRecommendation(r?: string | null): string {
  if (!r) return "";
  const s = r.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
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
          ? "Where applicable you will be invited to submit your full paper — please watch your dashboard for the next step."
          : "Please prepare your camera-ready version per the conference guidelines.";
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

  const subject = `${conf} — ${label} decision: ${pid}`;
  const body = compose([
    greeting(o.name),
    "",
    `Regarding your ${item} submitted to ${conf}${
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
      ? `\nCOMMENTS FROM THE TRACK SESSION CHAIR\n\n${o.message.trim()}`
      : null,
    "",
    "With regards,",
    o.chairName || null,
    `Track Session Chair, ${o.track ? `${o.track}, ` : ""}${conf}`,
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

export function chairInviteEmail(o: {
  name?: string;
  track: string;
  openCount?: number;
  conferenceName?: string;
}): EmailContent {
  const conf = o.conferenceName || CONF_DEFAULT;
  const subject = `${conf} — Invitation to serve as Track Session Chair (${o.track})`;
  const body = compose([
    greeting(o.name, "Colleague"),
    "",
    `You have kindly been invited to serve as the Track Session Chair for the ${o.track} track of ${conf}.`,
    typeof o.openCount === "number" && o.openCount > 0
      ? `There ${o.openCount === 1 ? "is" : "are"} currently ${o.openCount} submission${
          o.openCount === 1 ? "" : "s"
        } awaiting handling in this track.`
      : null,
    "",
    "As Track Session Chair you will invite reviewers, manage assignments, and recommend decisions for the submissions in your track. Please sign in to the portal to begin.",
    "",
    "With regards,",
    `Convener, ${conf}`,
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
