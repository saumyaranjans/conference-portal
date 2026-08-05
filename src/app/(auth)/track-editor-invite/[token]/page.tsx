import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/SignupForm";

import type { Metadata } from "next";
// Utility/token page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Landing page for a Track Editor invitation sent to someone with no account.
 * Reads the invitation with the service-role client (the table is never
 * exposed to anon) and renders the registration form pre-filled with the
 * details the Convener entered. On completion the new account is granted the
 * editor role and made Track Editor of the invited track — see
 * acceptTrackEditorInvite.
 */
export default async function TrackEditorInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("track_editor_invitations")
    .select("full_name, designation, affiliation, email, status, expires_at, tracks(name)")
    .eq("token", token)
    .maybeSingle();

  const row = inv as any;

  if (
    !row ||
    row.status === "revoked" ||
    (row.status === "pending" &&
      new Date(row.expires_at).getTime() <= Date.now())
  ) {
    return (
      <Shell title="Invitation not found">
        <p className="text-sm text-slate-600">
          This Track Editor invitation link is invalid, expired, or has been withdrawn.
          Please check with the Convener who invited you.
        </p>
        <Link href="/login" className="text-blue-700 hover:underline text-sm">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  if (row.status === "accepted") {
    return (
      <Shell title="Invitation already accepted">
        <p className="text-sm text-slate-600">
          You have already registered from this invitation. Sign in and your
          Track Editor dashboard is waiting.
        </p>
        <Link href="/login" className="btn-primary inline-block">
          Sign in
        </Link>
      </Shell>
    );
  }

  // Pull a leading honorific into Title so it doesn't land in the first name.
  const TITLES = ["Dr", "Prof", "Mr", "Ms", "Mrs"];
  const parts = (row.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  let title = "";
  let names = parts;
  if (parts.length > 1) {
    const lead = parts[0].replace(/\.$/, "");
    const match = TITLES.find((t) => t.toLowerCase() === lead.toLowerCase());
    if (match) {
      title = match;
      names = parts.slice(1);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto mb-6 text-center">
        <h1 className="text-2xl font-semibold text-gradient">
          Track Editor invitation
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          You have been invited to serve as Track Editor for the{" "}
          <strong>{row.tracks?.name ?? "selected"}</strong> track. Complete the
          sign-up below — your details are already filled in — and your Track
          Editor dashboard opens straight away.
        </p>
      </div>
      <SignupForm
        prefill={{
          title,
          firstName: names[0] ?? "",
          lastName: names.slice(1).join(" "),
          designation: row.designation ?? "",
          institution: row.affiliation ?? "",
          email: row.email ?? "",
        }}
        trackEditorInviteToken={token}
        emailLocked
      />
    </main>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center card card-pad space-y-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
