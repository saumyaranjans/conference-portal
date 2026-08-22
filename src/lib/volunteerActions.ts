"use server";

import { revalidatePath } from "next/cache";
import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { volunteerAcceptedEmail } from "@/lib/emailTemplates";
import { withSalutation } from "@/lib/certificates";
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

/**
 * Set (or correct) the track on an offer that has already been decided.
 *
 * The track can only be chosen at the moment of accepting, and an offer that
 * arrived without one stayed trackless for good — the decided list showed no
 * track and had no way to add one, so the record never caught up with the
 * seating done by hand elsewhere. This is that missing correction.
 *
 * An accepted editor is seated on the track as well, exactly as accepting
 * would have done, so the two routes leave the same state behind. Reviewers
 * are not seated: for them a track is expertise, and papers are assigned one
 * at a time.
 */
export async function assignVolunteerTrack(
  formData: FormData
): Promise<ActionResult> {
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const id = String(formData.get("request_id") ?? "").trim();
  const trackId = String(formData.get("track_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing request." };
  if (!trackId) return { ok: false, message: "Choose a track first." };

  const { data: request, error: readError } = await admin
    .from("volunteer_requests")
    .select("id, profile_id, role, status")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[volunteer] request lookup failed: %s", readError.message);
    return { ok: false, message: `Could not read that request: ${readError.message}` };
  }
  if (!request) return { ok: false, message: "That request no longer exists." };

  // Fails loudly while migration 0082 is unapplied. Reporting the error beats
  // a control that appears to work and quietly stores nothing.
  const { error: assignError } = await admin
    .from("volunteer_requests")
    .update({ preferred_track_id: trackId })
    .eq("id", id);
  if (assignError) {
    console.error("[volunteer] could not store assigned track: %s", assignError.message);
    return {
      ok: false,
      message: `Could not store the track: ${assignError.message}`,
    };
  }

  const role = request.role as VolunteerRole;
  let seatNote = "";
  if (role === "editor" && request.status === "accepted") {
    const { error: seatError } = await admin
      .from("track_editors")
      .upsert(
        { track_id: trackId, profile_id: request.profile_id },
        { onConflict: "track_id,profile_id", ignoreDuplicates: true }
      );
    if (seatError) {
      console.error("[volunteer] seating failed: %s", seatError.message);
      seatNote = ` They could not be seated automatically (${seatError.message}) — please seat them from Track Editor Management.`;
    } else {
      seatNote = " They have been seated on this track.";
    }
  }

  revalidateVolunteers();
  return { ok: true, message: `Track assigned.${seatNote}` };
}

export async function decideVolunteerRequest(
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const id = String(formData.get("request_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("decision_note") ?? "").trim().slice(0, 500);
  // Only offered when the volunteer named no track; blank means leave it unset.
  const assignedTrackId = String(formData.get("track_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing request." };
  if (decision !== "accepted" && decision !== "declined") {
    return { ok: false, message: "Choose accept or decline." };
  }

  // preferred_track_id arrives with migration 0082. Until it is applied
  // PostgREST rejects the whole select, which returned null and was reported
  // as "no longer exists" — a present request, described as missing, because a
  // failed read is not an empty one. Retry without the track, and say so when
  // the read itself fails.
  const BASE = "id, profile_id, role, status";
  let { data: request, error: readError } = await admin
    .from("volunteer_requests")
    .select(`${BASE}, preferred_track_id, tracks(code, name)`)
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("[volunteer] track columns unavailable: %s", readError.message);
    ({ data: request, error: readError } = await admin
      .from("volunteer_requests")
      .select(BASE)
      .eq("id", id)
      .maybeSingle());
  }
  if (readError) {
    console.error("[volunteer] request lookup failed: %s", readError.message);
    return {
      ok: false,
      message: `Could not read that request: ${readError.message}`,
    };
  }
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

  // An accepted editor who named a track is seated on it here, so "accepted"
  // and "chairs that track" are one action rather than two. Reviewers are not
  // seated: they are assigned per paper, and their track is expertise only.
  //
  // A failure to seat must not undo the acceptance — the role is already
  // granted and the Convener can seat them by hand — so this reports rather
  // than aborts. The 2-track cap is a database trigger and surfaces here.
  let seatNote = "";
  const trackId =
    ((request as any).preferred_track_id as string | null) || assignedTrackId || null;
  if (decision === "accepted" && role === "editor" && trackId) {
    const { error: seatError } = await admin
      .from("track_editors")
      .upsert(
        { track_id: trackId, profile_id: request.profile_id },
        { onConflict: "track_id,profile_id", ignoreDuplicates: true }
      );
    if (seatError) {
      console.error("[volunteer] seating failed: %s", seatError.message);
      seatNote = ` Their track could not be assigned automatically (${seatError.message}) — please seat them from Track Editor Management.`;
    } else {
      seatNote = " They have been seated on their chosen track.";
    }
  }

  // Write the assignment back. Without this the seating would happen but the
  // record would still read "no track", and the welcome email — which is sent
  // from `request` — would omit the line it was assigned to carry.
  if (decision === "accepted" && assignedTrackId && !(request as any).preferred_track_id) {
    const { error: assignError } = await admin
      .from("volunteer_requests")
      .update({ preferred_track_id: assignedTrackId })
      .eq("id", id);
    if (assignError) {
      console.error("[volunteer] could not store assigned track: %s", assignError.message);
    } else {
      const { data: t } = await admin
        .from("tracks")
        .select("code, name")
        .eq("id", assignedTrackId)
        .maybeSingle();
      if (t) (request as any).tracks = t;
    }
  }

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

  // Welcome the accepted volunteer by email: what they have taken on, how to
  // sign in, and the dates their own work depends on. A failure to send must
  // not undo an acceptance that has already granted the role, so it reports
  // rather than aborts — the in-app notification above still stands.
  if (decision === "accepted") {
    const t = (request as any).tracks;
    const track = Array.isArray(t) ? t[0] : t;
    const { data: who } = await admin
      .from("profiles")
      .select("full_name, email, title")
      .eq("id", request.profile_id)
      .maybeSingle();

    const person = who as { full_name?: string; email?: string; title?: string } | null;
    if (person?.email) {
      const mail = volunteerAcceptedEmail({
        name: withSalutation(person.full_name ?? "", person.title ?? ""),
        role,
        trackName: track?.name
          ? track.code
            ? `${track.code} — ${track.name}`
            : track.name
          : null,
        note,
      });
      const sent = await sendEmail({
        to: person.email,
        subject: mail.subject,
        text: mail.body,
        kind: "volunteer_accepted",
        sentBy: profile.id,
      });
      if (!sent.sent) {
        console.error("[volunteer] welcome email failed: %s", sent.error);
      }
    }
  }

  revalidateVolunteers();
  return {
    ok: true,
    message:
      decision === "accepted"
        ? `Accepted. They now have ${label} access and appear in the ${label} list.`
        : `Declined. No ${label} access has been granted.`,
  };
}
