"use client";

import { useState } from "react";
import Link from "next/link";
import { agreeReviewAssignment } from "@/lib/actions";

/**
 * Landing page for the Accept link in a reviewer invitation email (a reviewer
 * who already has an account). An explicit confirm button guards against an
 * email scanner pre-fetching the URL. On confirm the assignment becomes active
 * on the reviewer's dashboard.
 */
export function ReviewInviteAgree({
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
    const res = await agreeReviewAssignment(token);
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
              You have accepted the invitation to review {paper}. Please sign in
              to your reviewer dashboard to begin your assessment.
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
            <h1 className="text-xl font-semibold">Accept this review?</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have been invited to review{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {paper}
              </span>
              . Confirm to take it on.
            </p>
            <button
              onClick={confirm}
              disabled={state === "busy"}
              className="btn-primary"
            >
              {state === "busy" ? "Please wait…" : "Yes, I’ll review this paper"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
