"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { recordRecommendation } from "@/lib/actions";
import {
  abstractDecisionEmail,
  fullPaperDecisionEmail,
  manuscriptReturnedEmail,
  type ReviewComment,
} from "@/lib/emailTemplates";

type Option = { value: string; label: string; locked: boolean; hint?: string };

/**
 * The Track Editor's decision panel. Pick a decision + message, PREVIEW the exact
 * author email (editable), then "Record decision & send" does both in one step —
 * so a decision is never recorded without the author being emailed, and the
 * editor can tailor the letter before it goes out (the Convener is CC'd).
 */
export function DecisionForm({
  submissionId,
  stage,
  note,
  options,
  showDeadline,
  deadlineMax,
  // Everything the letter needs:
  paperId,
  title,
  track,
  submissionType,
  conferenceName,
  brand,
  chairName,
  chairEmail,
  signerRole,
  authorName,
  reviews,
}: {
  submissionId: string;
  stage: "abstract" | "full_paper";
  note?: ReactNode;
  options: Option[];
  showDeadline?: boolean;
  deadlineMax?: string | null;
  paperId: string | null;
  title: string;
  track?: string;
  submissionType?: string;
  conferenceName?: string | null;
  brand?: string;
  chairName?: string | null;
  chairEmail?: string | null;
  signerRole?: "Track Editor" | "Convener";
  authorName?: string | null;
  reviews?: ReviewComment[];
}) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [message, setMessage] = useState("");
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The letter stage: an accepted Pathway B abstract is still an abstract
  // letter ("now submit the full paper"); everything else follows `stage`.
  function generate(dec: string): { subject: string; body: string } {
    if (dec === "sent_back")
      return manuscriptReturnedEmail({
        paperId,
        title,
        track,
        message,
        name: authorName ?? undefined,
        chairName,
        chairEmail,
        signerRole,
        conferenceName,
        brand,
      });
    const letterStage =
      stage === "abstract" || dec === "accept" ? stage : "full_paper";
    const build =
      letterStage === "full_paper" ? fullPaperDecisionEmail : abstractDecisionEmail;
    return build({
      paperId,
      title,
      track,
      decision: dec,
      submissionType,
      fullPaperDeadline: deadline || undefined,
      message,
      name: authorName ?? undefined,
      reviews,
      chairName,
      chairEmail,
      signerRole,
      conferenceName: conferenceName ?? undefined,
      brand,
    });
  }

  function preview() {
    setError(null);
    if (!decision) {
      setError("Choose a decision first.");
      return;
    }
    if (showDeadline && decision === "accept" && !deadline) {
      setError("Set a full-paper submission deadline for the author.");
      return;
    }
    const { subject: s, body } = generate(decision);
    setSubject(s);
    setEmailBody(body);
    setPreviewed(true);
  }

  async function recordAndSend() {
    setError(null);
    setNotice(null);
    if (!previewed) {
      preview();
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("decision", decision);
    fd.set("rationale", message);
    if (deadline) fd.set("full_paper_deadline", deadline);
    fd.set("letter_subject", subject);
    fd.set("letter_body", emailBody);
    const res = await recordRecommendation(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "Could not record the decision.");
      return;
    }
    // Show a brief thank-you in place of the form, then return to the Track
    // Queue (which reflects the new status) rather than leaving the editor on
    // the same, now-stale form.
    setDone(true);
    setNotice(res.message ?? "Decision recorded and emailed to the author.");
    setTimeout(() => {
      router.push("/editor");
      router.refresh();
    }, 2200);
  }

  if (done) {
    return (
      <div className="card card-pad">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 dark:bg-emerald-500/10 dark:border-emerald-500/30">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Thank you — the decision has been recorded.
          </p>
          <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90 mt-1">
            {notice ??
              "The decision letter has been emailed to the author."}{" "}
            Returning you to your Track Queue…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad space-y-4">
      {note}

      <div>
        <label className="label">Your decision</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {options.map(({ value, label, locked, hint }) => (
            <label
              key={value}
              title={hint}
              className={`flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 ${
                locked
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value={value}
                disabled={locked}
                checked={decision === value}
                onChange={(e) => {
                  setDecision(e.target.value);
                  setPreviewed(false);
                }}
              />
              <span className="text-sm">
                {label}
                {hint && (
                  <span className="block text-[11px] text-slate-400">{hint}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {showDeadline && decision === "accept" && (
        <div>
          <label className="label" htmlFor="fpdeadline">
            Full-paper submission deadline{" "}
            <span className="text-slate-400 font-normal">
              (Pathway B — required)
            </span>
          </label>
          <input
            type="date"
            id="fpdeadline"
            className="input max-w-xs"
            value={deadline}
            max={deadlineMax ?? undefined}
            onChange={(e) => {
              setDeadline(e.target.value);
              setPreviewed(false);
            }}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="dmsg">
          Message to the author
        </label>
        <textarea
          id="dmsg"
          rows={4}
          className="input"
          placeholder="Shown to the author in the decision letter."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setPreviewed(false);
          }}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={preview} className="btn-secondary">
          {previewed ? "Refresh preview" : "Preview email"}
        </button>
        <span className="text-xs text-slate-500">
          Preview the exact letter, edit it if needed, then record &amp; send.
        </span>
      </div>

      {previewed && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Author email — editable · Convener CC&rsquo;d
          </p>
          <label className="label">
            Subject
            <input
              className="input mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="label">
            Message
            <textarea
              className="input mt-1 font-mono text-xs"
              rows={16}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      <button
        type="button"
        onClick={recordAndSend}
        disabled={busy || !decision}
        className="btn-primary disabled:opacity-50"
      >
        {busy
          ? "Recording…"
          : previewed
            ? "Record decision & send email"
            : "Preview, then record"}
      </button>
    </div>
  );
}
