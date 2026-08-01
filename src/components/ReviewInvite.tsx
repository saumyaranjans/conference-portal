"use client";

import { useState } from "react";
import Link from "next/link";
import { agreeReviewAssignment, rejectReviewAssignment } from "@/lib/actions";

/**
 * Combined Accept / Decline landing for a review invitation (existing account),
 * reached from the in-app notification. Token-authorised, so it works even
 * before the person holds the reviewer role. The email keeps its two direct
 * Accept / Decline links; this page offers both in one place.
 */
export function ReviewInvite({
  token,
  valid,
  paperId,
  title,
}: {
  token: string;
  valid: boolean;
  paperId: string | null;
  title: string | null;
}) {
  type View = "idle" | "declining" | "accepted" | "declined" | "error";
  const [view, setView] = useState<View>(valid ? "idle" : "error");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(
    valid ? "" : "This link is invalid or has already been used."
  );
  const paper = `${paperId ? `${paperId} — ` : ""}${title ?? "this paper"}`;

  async function accept() {
    setBusy(true);
    const res = await agreeReviewAssignment(token);
    setBusy(false);
    if (res.ok) setView("accepted");
    else {
      setMsg(res.message ?? "Something went wrong.");
      setView("error");
    }
  }

  async function decline(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setMsg("Please give a brief reason.");
      return;
    }
    setBusy(true);
    const res = await rejectReviewAssignment(token, reason.trim());
    setBusy(false);
    if (res.ok) setView("declined");
    else {
      setMsg(res.message ?? "Something went wrong.");
      setView("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-4">
        {view === "accepted" ? (
          <>
            <h1 className="text-2xl font-semibold">Thank you — you’re on it!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have accepted the invitation to review {paper}. Please sign in
              to your reviewer dashboard to begin your assessment.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Sign in
            </Link>
          </>
        ) : view === "declined" ? (
          <>
            <h1 className="text-2xl font-semibold">Thank you!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We appreciate your response. We have let the Track Editor know, and
              they will invite another reviewer.
            </p>
            <Link
              href="/"
              className="text-blue-700 hover:underline text-sm dark:text-blue-300"
            >
              Go to the conference site
            </Link>
          </>
        ) : view === "error" ? (
          <>
            <h1 className="text-xl font-semibold">Link not available</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>
            <Link
              href="/login"
              className="text-blue-700 hover:underline text-sm dark:text-blue-300"
            >
              Go to sign in
            </Link>
          </>
        ) : view === "declining" ? (
          <form onSubmit={decline} className="space-y-3 text-left">
            <h1 className="text-xl font-semibold text-center">
              Decline this review
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
              Please give a brief reason so the Track Editor can invite someone
              else.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Reason for declining…"
              className="input"
            />
            {msg && <p className="text-xs text-rose-600">{msg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary flex-1">
                {busy ? "Submitting…" : "Submit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("idle");
                  setMsg("");
                }}
                className="btn-secondary"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Invitation to review</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have been invited to review{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {paper}
              </span>
              . Once you accept, the paper appears in your reviewer dashboard.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={accept} disabled={busy} className="btn-primary">
                {busy ? "Please wait…" : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("declining");
                  setMsg("");
                }}
                disabled={busy}
                className="btn-secondary"
              >
                Decline
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
