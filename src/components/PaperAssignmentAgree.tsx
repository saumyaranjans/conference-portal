"use client";

import { useState } from "react";
import Link from "next/link";
import { agreePaperAssignment } from "@/lib/actions";

/**
 * Landing page for the Agree link in a paper-assignment email. Shows the paper
 * and an explicit confirm button (so an email scanner pre-fetching the URL can't
 * silently accept). On confirm the paper is accepted and becomes active on the
 * Track Editor's dashboard.
 */
export function PaperAssignmentAgree({
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
  const [msg, setMsg] = useState(
    valid ? "" : "This link is invalid or has already been used."
  );
  const paper = `${paperId ? `${paperId} — ` : ""}${title ?? "this paper"}`;

  async function confirm() {
    setState("busy");
    const res = await agreePaperAssignment(token);
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
            <h1 className="text-2xl font-semibold">Thank you — you’re on it!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have accepted {paper}. Please sign in to your Track Editor
              dashboard to begin.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Sign in
            </Link>
          </>
        ) : state === "error" ? (
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
          <>
            <h1 className="text-xl font-semibold">Accept this paper?</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have been assigned{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {paper}
              </span>{" "}
              to handle as Track Editor. Confirm to take it on.
            </p>
            <button
              onClick={confirm}
              disabled={state === "busy"}
              className="btn-primary"
            >
              {state === "busy" ? "Please wait…" : "Yes, I’ll handle this paper"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
