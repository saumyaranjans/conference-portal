import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";

/**
 * Landing page for a co-author's personalised sign-up link. The token is the
 * co-author's submission_authors row id. We read it with the service-role
 * client, pre-fill the registration form with the demographic details the
 * corresponding author already entered, and lock the email. On completion the
 * account is linked to the submission (see acceptCoAuthorInvite) so the
 * co-author can sign in and track it — view only, never edit.
 */
export default async function CoAuthorInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("submission_authors")
    .select(
      "id, full_name, email, designation, affiliation, mobile, participant_category, is_corresponding, profile_id, submission_id"
    )
    .eq("id", token)
    .maybeSingle();

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-3">
        {children}
      </div>
    </main>
  );

  if (!row || row.is_corresponding) {
    return shell(
      <>
        <h1 className="text-xl font-semibold">Invitation not found</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This co-author link is invalid. Please check with the corresponding
          author who added you to the submission.
        </p>
        <Link href="/login" className="text-blue-700 hover:underline text-sm dark:text-blue-300">
          Go to sign in
        </Link>
      </>
    );
  }

  if (row.profile_id) {
    return shell(
      <>
        <h1 className="text-xl font-semibold">You’re already registered</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          An account is already linked to this invitation. Sign in and the
          submission will appear on your author dashboard.
        </p>
        <Link href="/login" className="btn-primary inline-block">
          Sign in
        </Link>
      </>
    );
  }

  // The submission the co-author is being registered against, for context.
  const { data: sub } = await admin
    .from("submissions")
    .select("paper_id, title, tracks(name)")
    .eq("id", row.submission_id)
    .maybeSingle();
  const t = sub?.tracks as { name?: string } | { name?: string }[] | null;
  const trackName = Array.isArray(t) ? t[0]?.name ?? "" : t?.name ?? "";

  // Split the entered full name, pulling a leading honorific into Title so it
  // doesn't land in the first-name box.
  const TITLES = ["Dr", "Prof", "Mr", "Ms", "Mrs"];
  const parts = (row.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  let title = "";
  if (parts.length > 1) {
    const lead = parts[0].replace(/\.$/, "");
    const match = TITLES.find((x) => x.toLowerCase() === lead.toLowerCase());
    if (match) {
      title = match;
      parts.shift();
    }
  }
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-center mb-1">
          Co-author registration
        </h1>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-1">
          You have been added as a co-author on{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {sub?.paper_id ? `${sub.paper_id} — ` : ""}
            {sub?.title ?? "a GLOGIFT 2027 submission"}
          </span>
          {trackName ? ` (${trackName})` : ""}.
        </p>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
          Your details are pre-filled — set a password and complete the remaining
          fields to finish. If the email below is not correct, change it to your
          own; your account will be created with the email you enter. Once
          registered you can sign in to track the submission.
        </p>
        <SignupForm
          coAuthorInviteToken={token}
          prefill={{
            title,
            firstName,
            lastName,
            email: row.email ?? "",
            designation: row.designation ?? "",
            institution: row.affiliation ?? "",
            // The stored co-author mobile already carries a dial code, so clear
            // the default prefix to avoid doubling it.
            dialCode: "",
            mobile: row.mobile ?? "",
            participantCategory: row.participant_category ?? "",
          }}
        />
      </div>
    </main>
  );
}
