"use client";

import { useState } from "react";
import { ComposeEmail } from "@/components/ComposeEmail";
import {
  abstractDecisionEmail,
  fullPaperDecisionEmail,
  type ReviewComment,
} from "@/lib/emailTemplates";

const DECISIONS: [string, string][] = [
  ["accept", "Accept"],
  ["minor_revision", "Minor revision"],
  ["major_revision", "Major revision"],
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
  signerRole?: "Track Session Chair" | "Convener";
  /** Full conference title, for the signature. */
  conferenceName?: string;
  /** Short brand for the subject line, e.g. "GLOGIFT 2027". */
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

  const build =
    stage === "full_paper" ? fullPaperDecisionEmail : abstractDecisionEmail;
  const { subject, body } = build({
    paperId,
    title,
    track,
    decision,
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
          {DECISIONS.map(([v, l]) => (
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
        Recording a decision does not email the author. The letter carries every
        submitted reviewer&rsquo;s comments to the author (unnamed) and your own
        message. Review it below, then send it.
      </p>

      <ComposeEmail
        key={decision}
        to={authorEmail}
        subject={subject}
        body={body}
        showSend
        sendLabel="Send decision email"
      />
    </div>
  );
}
