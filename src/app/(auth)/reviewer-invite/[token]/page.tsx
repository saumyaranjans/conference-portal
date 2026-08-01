import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";

/**
 * Landing page for a reviewer invitation link. Reads the invitation by its
 * token with the service-role client (the table is never exposed to anon),
 * then renders the registration form pre-filled with the details the chair
 * entered. On completion the new account is granted the reviewer role and
 * assigned to the invited paper (see acceptReviewerInvite).
 */
export default async function ReviewerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("reviewer_invitations")
    .select("full_name, designation, affiliation, email, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  const invalid =
    !inv ||
    inv.status === "revoked" ||
    (inv.status === "pending" &&
      new Date(inv.expires_at).getTime() <= Date.now());

  if (invalid) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center card card-pad space-y-3">
          <h1 className="text-xl font-semibold">Invitation not found</h1>
          <p className="text-sm text-slate-600">
            This reviewer invitation link is invalid, expired, or has been withdrawn.
            Please check with the Track Editor who invited you.
          </p>
          <Link href="/login" className="text-blue-700 hover:underline text-sm">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  if (inv!.status === "accepted") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center card card-pad space-y-3">
          <h1 className="text-xl font-semibold">Invitation already accepted</h1>
          <p className="text-sm text-slate-600">
            You have already registered from this invitation. Sign in and the
            paper will be waiting in your reviewer dashboard.
          </p>
          <Link href="/login" className="btn-primary inline-block">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // Split the chair-entered full name, pulling a leading honorific (Dr, Prof…)
  // into the Title field so it doesn't land in the first-name box.
  const TITLES = ["Dr", "Prof", "Mr", "Ms", "Mrs"];
  const parts = (inv!.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  let title = "";
  if (parts.length > 1) {
    const lead = parts[0].replace(/\.$/, "");
    if (TITLES.some((t) => t.toLowerCase() === lead.toLowerCase())) {
      title = TITLES.find((t) => t.toLowerCase() === lead.toLowerCase())!;
      parts.shift();
    }
  }
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-center mb-1">
          Reviewer registration
        </h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          You have been invited to review for the conference. Your details are
          pre-filled — set a password and confirm the remaining fields to
          finish.
        </p>
        <SignupForm
          inviteToken={token}
          emailLocked
          prefill={{
            title,
            firstName,
            lastName,
            email: inv!.email ?? "",
            designation: inv!.designation ?? "",
            institution: inv!.affiliation ?? "",
          }}
        />
      </div>
    </main>
  );
}
