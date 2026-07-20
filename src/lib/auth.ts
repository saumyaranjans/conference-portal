import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

/** The signed-in user's profile, or null if there is no session. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** Require a session; bounce to /login otherwise. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Require one of `roles`. Admins pass every check — they are the break-glass
 * account for the whole portal.
 */
export async function requireRole(...roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  const ok =
    profile.roles.includes("admin") ||
    roles.some((r) => profile.roles.includes(r));
  if (!ok) redirect("/denied");
  return profile;
}

export function hasRole(profile: Profile | null, role: AppRole): boolean {
  if (!profile) return false;
  return profile.roles.includes(role) || profile.roles.includes("admin");
}
