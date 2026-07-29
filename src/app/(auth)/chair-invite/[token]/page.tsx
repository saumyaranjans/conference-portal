import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { AcceptChairInvite } from "@/components/AcceptChairInvite";

/**
 * Where an invited Track Session Chair accepts. Chairing begins only here —
 * and even then the chair sees no papers until the Convener assigns them.
 */
export default async function ChairInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("track_editors")
    // Named FK: track_editors reaches profiles via profile_id and invited_by.
    .select(
      "id, status, profile_id, tracks(name), profiles!track_editors_profile_id_fkey(full_name, email)"
    )
    .eq("token", token)
    .maybeSingle();

  const profile = await getProfile();
  if (!profile) redirect(`/login?next=/chair-invite/${token}`);

  const row = inv as any;
  const trackName = row?.tracks?.name ?? "this track";

  if (!row) {
    return (
      <Shell title="Invitation not found">
        <p className="text-sm text-slate-600">
          This invitation link is not valid. It may have been withdrawn by the
          Convener.
        </p>
      </Shell>
    );
  }

  if (row.profile_id !== profile.id) {
    return (
      <Shell title="This invitation is for someone else">
        <p className="text-sm text-slate-600">
          It was sent to <strong>{row.profiles?.email}</strong>, but you are
          signed in as <strong>{profile.email}</strong>. Sign in with the invited
          account to accept it.
        </p>
      </Shell>
    );
  }

  if (row.status === "accepted") {
    return (
      <Shell title={`You chair the ${trackName} track`}>
        <p className="text-sm text-slate-600">
          You have already accepted this invitation. Papers appear in your Track
          Queue as the Convener assigns them to you.
        </p>
        <Link href="/editor" className="btn-primary inline-block mt-4">
          Open Track Queue
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title={`Chair the ${trackName} track?`}>
      <p className="text-sm text-slate-600">
        The Convener has invited you to serve as Track Session Chair for the{" "}
        <strong>{trackName}</strong> track.
      </p>
      <p className="text-sm text-slate-600 mt-3">
        Accepting does not give you the track&rsquo;s papers straight away. The
        Convener assigns papers to you one at a time, and each appears in your
        Track Queue as it is handed over.
      </p>
      <AcceptChairInvite token={token} trackName={trackName} />
    </Shell>
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
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="card card-pad">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">{title}</h1>
        {children}
      </div>
    </div>
  );
}
