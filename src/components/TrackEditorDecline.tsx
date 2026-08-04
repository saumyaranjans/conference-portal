"use client";

import { useEffect } from "react";
import Link from "next/link";
import { declineTrackEditorInvite } from "@/lib/actions";

/**
 * Landing page for the Decline link in a track-editor invitation email. Records
 * the decline (best-effort, once) and thanks the invitee. No sign-in needed —
 * the token in the URL is the authorisation.
 */
export function TrackEditorDecline({ token }: { token: string }) {
  useEffect(() => {
    declineTrackEditorInvite(token).catch(() => {});
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-3">
        <h1 className="text-2xl font-semibold">Thank you!</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          We appreciate your response and look forward to your support with
          GLOGIFT 27.
        </p>
        <Link
          href="/"
          className="text-blue-700 hover:underline text-sm dark:text-blue-300"
        >
          Go to the conference site
        </Link>
      </div>
    </main>
  );
}
