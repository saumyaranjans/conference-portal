import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

/**
 * The signed-in user's profile, or null if there is no session.
 *
 * Wrapped in React.cache so the layout and the page (which each call
 * requireProfile/requireRole during the same request) share ONE
 * getUser + profiles lookup instead of paying the two round trips twice.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
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
});

/**
 * Require a session; bounce to /login otherwise.
 *
 * An account created through Google or Microsoft arrives with an email and a
 * name and nothing else, so it is held at /complete-profile until it supplies
 * the institution and participant category the portal depends on. Accounts
 * that registered with the full email + password form are complete the moment
 * they exist and never see it.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.profile_completed_at) redirect("/complete-profile");
  return profile;
}

/**
 * Require one of `roles` — held outright, no exceptions.
 *
 * Admins used to pass every check here as a break-glass account, which put the
 * Reviewer and Track Editor dashboards in front of Editorial Office staff who
 * hold neither. Every guard now names the roles it admits, so Editorial Office
 * reaches the /admin tree and the Convener duties it mirrors ("chief", "admin")
 * and nothing else. Personal queues — reviewer, track editor, author — are
 * keyed to the signed-in profile and belong to whoever was assigned the work.
 */
export async function requireRole(...roles: AppRole[]): Promise<Profile> {
  // Naming no roles is a programming mistake, not an access decision:
  // `[].some(...)` is false, so the guard would deny EVERY account, including
  // the one whose page it protects. That has happened, and as a redirect it
  // looked like a permissions problem rather than a bug. Fail loudly instead.
  if (roles.length === 0) {
    throw new Error(
      "requireRole() was called without any roles — name the roles it admits."
    );
  }
  const profile = await requireProfile();
  if (!roles.some((r) => profile.roles.includes(r))) redirect("/denied");
  return profile;
}

/**
 * Guard for Users & Roles: a Convener holding manage (edit) rights.
 *
 * Chief and NOT admin-by-courtesy, so an Editorial Office account cannot grant
 * itself Convener; manage tier, so a view-only Convener cannot lift their own
 * restriction by editing their own roles.
 */
export async function requireUserManagement(): Promise<Profile> {
  const profile = await requireRole("chief");
  if (profile.convener_manage === false) redirect("/denied");
  return profile;
}

export function hasRole(profile: Profile | null, role: AppRole): boolean {
  if (!profile) return false;
  return profile.roles.includes(role);
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
