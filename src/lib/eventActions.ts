"use server";

import { revalidatePath } from "next/cache";

import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions";

function revalidateEvent() {
  revalidatePath("/chief/event-management");
  revalidatePath("/admin/event-management");
  revalidatePath("/schedule");
}

async function currentConferenceId(
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const { data } = await admin
    .from("conferences")
    .select("id")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/** Create an on-site (classroom) or online (meeting link) session. */
export async function createSession(formData: FormData): Promise<ActionResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  if (!title) return { ok: false, message: "Session title is required." };
  if (mode !== "onsite" && mode !== "online")
    return { ok: false, message: "Choose On-site or Online." };

  const conferenceId = await currentConferenceId(admin);
  if (!conferenceId) return { ok: false, message: "No conference found." };

  const session_date = String(formData.get("session_date") ?? "").trim() || null;
  const time_slot = String(formData.get("time_slot") ?? "").trim() || null;
  const track_id = String(formData.get("track_id") ?? "").trim() || null;
  const classroom =
    mode === "onsite"
      ? String(formData.get("classroom") ?? "").trim() || null
      : null;
  const meeting_link =
    mode === "online"
      ? String(formData.get("meeting_link") ?? "").trim() || null
      : null;

  const { error } = await admin.from("conference_sessions").insert({
    conference_id: conferenceId,
    title,
    mode,
    track_id,
    session_date,
    time_slot,
    classroom,
    meeting_link,
    created_by: profile.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidateEvent();
  return { ok: true, message: "Session created." };
}

/** Edit a session's details. Switching mode clears the opposite field. */
export async function updateSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };
  const title = String(formData.get("title") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  if (!title) return { ok: false, message: "Session title is required." };
  if (mode !== "onsite" && mode !== "online")
    return { ok: false, message: "Choose On-site or Online." };

  const patch: Record<string, unknown> = {
    title,
    mode,
    track_id: String(formData.get("track_id") ?? "").trim() || null,
    session_date: String(formData.get("session_date") ?? "").trim() || null,
    time_slot: String(formData.get("time_slot") ?? "").trim() || null,
    classroom:
      mode === "onsite"
        ? String(formData.get("classroom") ?? "").trim() || null
        : null,
    meeting_link:
      mode === "online"
        ? String(formData.get("meeting_link") ?? "").trim() || null
        : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("conference_sessions")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidateEvent();
  return { ok: true, message: "Session updated." };
}

export async function deleteSession(formData: FormData): Promise<ActionResult> {
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing session." };
  const { error } = await admin
    .from("conference_sessions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateEvent();
  return { ok: true, message: "Session deleted." };
}

/** Add an accepted paper to a session. */
export async function addSessionPaper(
  formData: FormData
): Promise<ActionResult> {
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();
  const session_id = String(formData.get("session_id") ?? "").trim();
  const submission_id = String(formData.get("submission_id") ?? "").trim();
  if (!session_id || !submission_id)
    return { ok: false, message: "Missing session or paper." };

  const { error } = await admin
    .from("session_papers")
    .upsert(
      { session_id, submission_id },
      { onConflict: "session_id,submission_id", ignoreDuplicates: true }
    );
  if (error) return { ok: false, message: error.message };
  revalidateEvent();
  return { ok: true, message: "Paper added to the session." };
}

export async function removeSessionPaper(
  formData: FormData
): Promise<ActionResult> {
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing entry." };
  const { error } = await admin.from("session_papers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateEvent();
  return { ok: true, message: "Paper removed from the session." };
}
