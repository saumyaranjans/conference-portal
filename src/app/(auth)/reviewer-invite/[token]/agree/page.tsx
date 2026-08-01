import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Accept landing for a NEW-person reviewer invitation. Per the flow, Agree
 * shows a brief thank-you and then sends them to the pre-filled sign-up
 * (/reviewer-invite/[token]) to finish creating their account.
 */
export default async function ReviewerInviteAgreePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: inv } = await createAdminClient()
    .from("reviewer_invitations")
    .select("full_name, status, expires_at, submissions(title, paper_id)")
    .eq("token", token)
    .maybeSingle();

  const row = inv as
    | {
        full_name?: string;
        status?: string;
        expires_at?: string;
        submissions?: { title?: string; paper_id?: string };
      }
    | null;

  const invalid =
    !row ||
    row.status === "revoked" ||
    row.status === "declined" ||
    (row.status === "pending" &&
      !!row.expires_at &&
      new Date(row.expires_at).getTime() <= Date.now());

  if (invalid) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center card card-pad space-y-3">
          <h1 className="text-xl font-semibold">Invitation not available</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This reviewer invitation link is invalid, expired, or has already
            been answered. Please check with the Track Editor who invited you.
          </p>
          <Link href="/login" className="text-blue-700 hover:underline text-sm dark:text-blue-300">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  const paper = row!.submissions?.title ?? "the paper";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-4">
        <h1 className="text-2xl font-semibold">Thank you for accepting!</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          We’re delighted you’ll review{" "}
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {paper}
          </span>
          . To finish, please complete a short sign-up — your details are already
          pre-filled. Once registered, the paper will appear in your reviewer
          dashboard.
        </p>
        <Link
          href={`/reviewer-invite/${token}`}
          className="btn-primary inline-block"
        >
          Continue to sign up
        </Link>
      </div>
    </main>
  );
}
