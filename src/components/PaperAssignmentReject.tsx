"use client";

import { useState } from "react";
import Link from "next/link";
import { rejectPaperAssignment } from "@/lib/actions";

/**
 * Landing page for the Reject link in a paper-assignment email. Captures a brief
 * reason, hands the paper back to the Convener, and thanks the Track Editor.
 */
export function PaperAssignmentReject({
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
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    valid ? "idle" : "error"
  );
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(
    valid ? "" : "This link is invalid or has already been used."
  );
  const paper = `${paperId ? `${paperId} — ` : ""}${title ?? "this paper"}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setMsg("Please give a brief reason.");
      return;
    }
    setState("busy");
    const res = await rejectPaperAssignment(token, reason.trim());
    if (res.ok) setState("done");
    else {
      setMsg(res.message ?? "Something went wrong.");
      setState("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-4">
        {state === "done" ? (
          <>
            <h1 className="text-2xl font-semibold">Thank you!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We appreciate your response. The paper has been returned to the
              Convener, who will assign it to another Track Editor.
            </p>
            <Link
              href="/"
              className="text-blue-700 hover:underline text-sm dark:text-blue-300"
            >
              Go to the conference site
            </Link>
          </>
        ) : !valid ? (
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
        ) : (
          <form onSubmit={submit} className="space-y-3 text-left">
            <h1 className="text-xl font-semibold text-center">
              Decline this paper
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
              You are declining{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {paper}
              </span>
              . Please give a brief reason so the Convener can reassign it.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Reason for declining…"
              className="input"
            />
            {msg && <p className="text-xs text-rose-600">{msg}</p>}
            <button
              type="submit"
              disabled={state === "busy"}
              className="btn-primary w-full"
            >
              {state === "busy" ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
