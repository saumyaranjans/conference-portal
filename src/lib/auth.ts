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

/** True when this profile may perform Convener manage/edit actions: an admin
 *  (Editorial Office) always can; a Convener (chief) only if not view-only. */
export function canManageAsConvener(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.roles.includes("admin")) return true;
  if (!profile.roles.includes("chief")) return false;
  return profile.convener_manage !== false;
}

/**
 * Like {@link requireRole}, but additionally blocks a VIEW-ONLY Convener: a
 * chief whose `convener_manage` is false (and who is not an admin) may see
 * everything but cannot run manage/edit actions. Use this in Convener write
 * actions in place of `requireRole("chief", ...)`.
 */
export async function requireConvenerManage(
  ...roles: AppRole[]
): Promise<Profile> {
  const profile = await requireRole(...roles);
  const isAdmin = profile.roles.includes("admin");
  const isChief = profile.roles.includes("chief");
  if (isChief && !isAdmin && profile.convener_manage === false) {
    redirect("/denied");
  }
  return profile;
}
