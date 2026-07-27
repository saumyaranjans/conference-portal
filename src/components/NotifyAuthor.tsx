"use client";

import { useState } from "react";
import { ComposeEmail } from "@/components/ComposeEmail";
import {
  abstractDecisionEmail,
  fullPaperDecisionEmail,
} from "@/lib/emailTemplates";

const DECISIONS: [string, string][] = [
  ["accept", "Accept"],
  ["minor_revision", "Minor revision"],
  ["major_revision", "Major revision"],
  ["reject", "Reject"],
];

/**
 * "Email the author" card. Prefills a decision letter (abstract or full-paper)
 * the chair/convener opens in their own mail client. The author also receives
 * the automatic in-app notification from the decision trigger.
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
}: {
  stage: string;
  paperId: string | null;
  title: string;
  track?: string;
  authorName?: string;
  authorEmail?: string | null;
  defaultDecision?: string;
  defaultMessage?: string;
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

      <ComposeEmail key={decision} to={authorEmail} subject={subject} body={body} />
    </div>
  );
}
