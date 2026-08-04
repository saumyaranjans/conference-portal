"use client";

import { useState } from "react";
import { ComposeEmail } from "@/components/ComposeEmail";
import {
  abstractDecisionEmail,
  fullPaperDecisionEmail,
  manuscriptReturnedEmail,
  type ReviewComment,
} from "@/lib/emailTemplates";

const ABSTRACT_DECISIONS: [string, string][] = [
  ["accept", "Accept"],
  ["minor_revision", "Minor revision"],
  ["major_revision", "Major revision"],
  ["reject", "Reject"],
];
// The manuscript stage adds "Send back to author" (restart) and keeps the rest.
const FULL_PAPER_DECISIONS: [string, string][] = [
  ["accept", "Accept"],
  ["minor_revision", "Minor revision"],
  ["major_revision", "Major revision"],
  ["sent_back", "Send back to author"],
  ["reject", "Reject"],
];

/**
 * "Email the author" card. Prefills a decision letter (abstract or full-paper)
 * for the chair/convener to preview and then send from the portal. Nothing is
 * emailed automatically when a decision is recorded — this is the deliberate
 * step. The author also gets the in-app notification from the decision trigger.
 */
export function NotifyAuthor({
  stage,
  submissionType,
  fullPaperDeadline,
  paperId,
  title,
  track,
  authorName,
  authorEmail,
  defaultDecision,
  defaultMessage,
  reviews,
  chairName,
  chairEmail,
  signerRole,
  conferenceName,
  brand,
}: {
  stage: string;
  submissionType?: string;
  fullPaperDeadline?: string | null;
  paperId: string | null;
  title: string;
  track?: string;
  authorName?: string;
  authorEmail?: string | null;
  defaultDecision?: string;
  defaultMessage?: string;
  /** Submitted reviews — author-facing comments only, reviewers unnamed. */
  reviews?: ReviewComment[];
  chairName?: string | null;
  chairEmail?: string | null;
  /** Chairs name their track in the signature; a Convener signs for the conference. */
  signerRole?: "Track Editor" | "Convener";
  /** Full conference title, for the signature. */
  conferenceName?: string;
  /** Short brand for the subject line, e.g. "GLOGIFT 27". */
  brand?: string;
}) {
  const [decision, setDecision] = useState(defaultDecision || "accept");

  if (!authorEmail) {
    return (
      <div className="card card-pad">
        <p className="text-sm text-slate-500">
          No email address on file for the corresponding author.
        </p>
      </div>
    );
  }

  const decisionList =
    stage === "full_paper" ? FULL_PAPER_DECISIONS : ABSTRACT_DECISIONS;

  const { subject, body } =
    decision === "sent_back"
      ? // Returned to restart — its own letter (the action also auto-emails this).
        manuscriptReturnedEmail({
          paperId,
          title,
          track,
          message: defaultMessage,
          name: authorName,
          chairName,
          chairEmail,
          signerRole,
          conferenceName,
          brand,
        })
      : (stage === "full_paper" ? fullPaperDecisionEmail : abstractDecisionEmail)({
          paperId,
          title,
          track,
          decision,
          submissionType,
          fullPaperDeadline,
          message: defaultMessage,
          name: authorName,
          reviews,
          chairName,
          chairEmail,
          signerRole,
          conferenceName,
          brand,
        });

  return (
    <div className="card card-pad space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="label mb-0" htmlFor="notify-decision">
          Letter template
        </label>
        <select
          id="notify-decision"
          className="input max-w-xs"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          {decisionList.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {stage === "full_paper" ? "Full paper" : "Abstract"} stage
        </span>
      </div>

      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 dark:bg-slate-800 dark:text-slate-300">
        The decision letter was emailed to the author automatically (with the
        Convener CC&rsquo;d) when you recorded the decision — it carries every
        submitted reviewer&rsquo;s comments (unnamed) and your message. Use this
        only to resend it or send a customised version.
      </p>

      <ComposeEmail
        key={decision}
        to={authorEmail}
        subject={subject}
        body={body}
        showSend
        ccConvener
        sendLabel="Resend decision email"
      />
    </div>
  );
}
