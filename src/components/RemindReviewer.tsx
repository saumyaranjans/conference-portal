"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  prepareReviewerReminder,
  sendReviewerReminder,
  type PreparedInvite,
} from "@/lib/actions";
import { ComposeEmail } from "@/components/ComposeEmail";

/**
 * Nudge a reviewer whose deadline has passed. The chair decides how many extra
 * days to allow; the draft is previewed first, and the deadline moves only when
 * the reminder is actually sent.
 */
export function RemindReviewer({
  assignmentId,
  submissionId,
  reviewerName,
}: {
  assignmentId: string;
  submissionId: string;
  reviewerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [extraDays, setExtraDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedInvite | null>(null);

  async function onPrepare() {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("extra_days", extraDays);
    const res = await prepareReviewerReminder(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPrepared(res.prepared);
  }

  async function onSend(subject: string, body: string) {
    if (!prepared) return { ok: false, message: "Nothing to send." };
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("submission_id", submissionId);
    fd.set("extra_days", extraDays);
    fd.set("to", prepared.to);
    fd.set("subject", subject);
    fd.set("body", body);
    const res = await sendReviewerReminder(fd);
    if (res.ok) router.refresh();
    return res;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
      >
        Send reminder
      </button>
    );
  }

  return (
    <div className="w-full mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
        Remind {reviewerName}
      </p>

      {!prepared ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor={`extra-${assignmentId}`}>
                Extra days to allow
              </label>
              <input
                id={`extra-${assignmentId}`}
                type="number"
                min={0}
                max={120}
                className="input w-32"
                value={extraDays}
                onChange={(e) => setExtraDays(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={onPrepare}
              disabled={busy}
              className="btn-primary"
            >
              {busy ? "Preparing…" : "Prepare reminder"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The new deadline is applied only when you send the reminder. Set 0 to
            nudge without extending.
          </p>
        </>
      ) : (
        <>
          <ComposeEmail
            to={prepared.to}
            subject={prepared.subject}
            body={prepared.body}
            showSend
            sendLabel="Send reminder"
            onSend={onSend}
          />
          <button
            type="button"
            onClick={() => {
              setPrepared(null);
              setOpen(false);
            }}
            className="btn-secondary"
          >
            Done
          </button>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
