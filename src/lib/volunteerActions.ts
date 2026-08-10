"use server";

import { revalidatePath } from "next/cache";
import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import {
  VOLUNTEER_ROLE_INFO,
  type AppRole,
  type VolunteerRole,
} from "@/lib/types";

/**
 * Deciding an offer to serve as a Reviewer or Track Editor.
 *
 * Accepting is what grants the role — nothing at registration does. That keeps
 * one rule in one place: a person has reviewer or editor access because the
 * Convener said so, never because they ticked a box about themselves.
 *
 * Roles are written with the service client because a trigger reserves
 * privileged profile columns for the Editorial Office (see
 * protect_profile_privileged_fields); the Convener's authority to make this
 * particular change is established by requireConvenerManage above.
 */

function revalidateVolunteers() {
  revalidatePath("/chief/volunteers");
  revalidatePath("/admin/volunteers");
  revalidatePath("/chief/reviewers");
  revalidatePath("/chief/track-editors");
}

async function setRole(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  role: AppRole,
  present: boolean
): Promise<string | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("roles")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return "That person no longer has an account.";

  const roles: AppRole[] = ((profile.roles ?? []) as AppRole[]).slice();
  const has = roles.includes(role);
  if (present === has) return null; // already in the desired state

  const next = present ? [...roles, role] : roles.filter((r) => r !== role);
  const { error } = await admin
    .from("profiles")
    .update({ roles: next })
    .eq("id", profileId);
  return error ? error.message : null;
}

export async function decideVolunteerRequest(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief");
  const admin = createAdminClient();

  const id = String(formData.get("request_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("decision_note") ?? "").trim().slice(0, 500);
  if (!id) return { ok: false, message: "Missing request." };
  if (decision !== "accepted" && decision !== "declined") {
    return { ok: false, message: "Choose accept or decline." };
  }

  const { data: request } = await admin
    .from("volunteer_requests")
    .select("id, profile_id, role, status")
    .eq("id", id)
    .maybeSingle();
  if (!request) return { ok: false, message: "That request no longer exists." };

  const role = request.role as VolunteerRole;

  // Accepting grants the role; declining a previously accepted offer takes it
  // back, so a mistaken acceptance is reversible from the same screen.
  const roleError = await setRole(
    admin,
    request.profile_id,
    role as AppRole,
    decision === "accepted"
  );
  if (roleError) return { ok: false, message: roleError };

  const { error } = await admin
    .from("volunteer_requests")
    .update({
      status: decision,
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
      decision_note: note,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  const label = VOLUNTEER_ROLE_INFO[role].label;
  await admin.from("notifications").insert({
    profile_id: request.profile_id,
    title:
      decision === "accepted"
        ? `You are confirmed as a ${label}`
        : `Your offer to serve as a ${label}`,
    body:
      decision === "accepted"
        ? `The Convener has accepted your offer to serve as a ${label} for GLOGIFT 27. Your ${label} dashboard is now available.${note ? ` Note: ${note}` : ""}`
        : `Thank you for offering to serve as a ${label}. The Convener is unable to take up the offer at this time.${note ? ` Note: ${note}` : ""}`,
    link: decision === "accepted" ? (role === "reviewer" ? "/reviewer" : "/editor") : "/profile",
  });

  revalidateVolunteers();
  return {
    ok: true,
    message:
      decision === "accepted"
        ? `Accepted. They now have ${label} access and appear in the ${label} list.`
        : `Declined. No ${label} access has been granted.`,
  };
}
