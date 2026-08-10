"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";
import {
  ROLE_HOME,
  VOLUNTEER_ELIGIBLE_CATEGORY,
  type AppRole,
  type VolunteerRole,
} from "@/lib/types";

/** Landing priority for multi-role users (mirrors the proxy and login form). */
const ROLE_PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

/**
 * Finishes registration for an account created through Google or Microsoft.
 *
 * Deliberately built on getProfile rather than requireProfile: requireProfile
 * sends unfinished profiles here, so using it would make this form unable to
 * submit itself.
 *
 * Setting profile_completed_at is what lifts the redirect, so it is written
 * only once every required field is present — otherwise a half-filled form
 * would buy its way into the portal.
 */
export async function completeProfile(
  formData: FormData
): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const str = (k: string) => String(formData.get(k) ?? "").trim();

  const first = str("first_name");
  const last = str("last_name");
  const institution = str("institution");
  const category = str("participant_category");
  const memberAnswer = str("glogift_member");

  if (!first || !last)
    return { ok: false, message: "Please enter your first and last name." };
  if (!institution)
    return { ok: false, message: "Please enter your institution." };
  // Country is what decides the billing currency, so a blank one is not a
  // cosmetic gap — it silently quotes rupees to an overseas delegate.
  if (!str("country"))
    return { ok: false, message: "Please choose your country." };
  if (!category)
    return { ok: false, message: "Please choose a participant category." };
  if (memberAnswer !== "yes" && memberAnswer !== "no")
    return {
      ok: false,
      message: "Please say whether you hold GIFT Society membership.",
    };

  const isMember = memberAnswer === "yes";
  const membershipNo = isMember ? str("glogift_membership_no") : "";
  if (isMember && !membershipNo)
    return { ok: false, message: "Please enter your membership number." };

  const dial = str("dial_code");
  const number = str("mobile");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      title: str("title"),
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`.trim(),
      gender: str("gender"),
      mobile: number ? `${dial} ${number}`.trim() : "",
      country: str("country"),
      institution,
      affiliation: institution,
      department: str("department"),
      designation: str("designation"),
      participant_category: category,
      orcid: str("orcid"),
      glogift_member: isMember,
      glogift_membership_no: membershipNo,
      profile_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) return { ok: false, message: error.message };

  // Offers to serve, recorded for the Convener to decide. Faculty only — the
  // same rule the trigger applies to the password signup path (0077).
  if (category === VOLUNTEER_ELIGIBLE_CATEGORY) {
    const wanted: VolunteerRole[] = [];
    if (str("volunteer_reviewer") === "true") wanted.push("reviewer");
    if (str("volunteer_editor") === "true") wanted.push("editor");
    if (wanted.length) {
      await createAdminClient()
        .from("volunteer_requests")
        .upsert(
          wanted.map((role) => ({ profile_id: profile.id, role })),
          { onConflict: "profile_id,role", ignoreDuplicates: true }
        );
    }
  }

  const primary =
    ROLE_PRIORITY.find((r) => profile.roles.includes(r)) ?? "author";
  redirect(ROLE_HOME[primary]);
}
