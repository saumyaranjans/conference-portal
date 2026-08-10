import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HomeLink } from "@/components/HomeLink";
import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { ROLE_HOME, type AppRole } from "@/lib/types";

// Utility page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const ROLE_PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

/**
 * Finishes registration for a Google / Microsoft account.
 *
 * Uses getProfile, not requireProfile: requireProfile redirects unfinished
 * profiles here, so requiring it would loop.
 */
export default async function CompleteProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Already registered — nothing to complete.
  if (profile.profile_completed_at) {
    const primary =
      ROLE_PRIORITY.find((r) => profile.roles.includes(r)) ?? "author";
    redirect(ROLE_HOME[primary]);
  }

  // The provider is worth naming back to the user; it is the only cue for how
  // they arrived, and identifies which account to use next time.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const providerRaw = (user?.app_metadata?.provider as string) ?? "";
  const provider =
    providerRaw === "azure"
      ? "Microsoft"
      : providerRaw === "google"
        ? "Google"
        : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <HomeLink />
        </div>
        <h1 className="mb-2 text-center text-2xl font-semibold">
          Complete your registration
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          One more step before you can submit to GLOGIFT 27.
        </p>
        <CompleteProfileForm
          email={profile.email ?? user?.email ?? ""}
          firstName={profile.first_name ?? ""}
          lastName={profile.last_name ?? ""}
          provider={provider}
        />
      </div>
    </main>
  );
}
