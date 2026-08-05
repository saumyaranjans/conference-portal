"use server";

import { revalidatePath } from "next/cache";

import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import {
  trackEditorPendingReminderEmail,
  convenerPendingReminderEmail,
} from "@/lib/emailTemplates";

export type ReminderResult = { ok: boolean; message?: string };

const DROPPED = ["draft", "withdrawn"];

/** A Track Editor's outstanding work: papers awaiting their acceptance, and
 *  accepted papers still awaiting a final decision. */
async function pendingFor(
  admin: ReturnType<typeof createAdminClient>,
  editorId: string
) {
  const { data: subs } = await admin
    .from("submissions")
    .select("id, paper_id, status, editor_accepted_at")
    .eq("assigned_editor_id", editorId);
  const list = ((subs ?? []) as any[]).filter(
    (s) => !DROPPED.includes(s.status)
  );

  const awaiting = list.filter((s) => !s.editor_accepted_at);
  const acceptedIds = list
    .filter((s) => s.editor_accepted_at)
    .map((s) => s.id);

  let decidedSet = new Set<string>();
  if (acceptedIds.length) {
    const { data: decs } = await admin
      .from("decisions")
      .select("submission_id")
      .in("submission_id", acceptedIds)
      .eq("is_final", true)
      .is("superseded_at", null);
    decidedSet = new Set(((decs ?? []) as any[]).map((d) => d.submission_id));
  }
  const pending = list.filter(
    (s) => s.editor_accepted_at && !decidedSet.has(s.id)
  );

  const paperIds = [...awaiting, ...pending]
    .map((s) => s.paper_id)
    .filter(Boolean)
    .sort();
  return {
    awaitingCount: awaiting.length,
    pendingCount: pending.length,
    paperIds,
    total: awaiting.length + pending.length,
  };
}

const BRAND = "GLOGIFT 27";

/** Nudge the Track Editor about their pending assignments — dashboard
 *  notification + (if configured) a system email. */
export async function remindTrackEditorPending(
  formData: FormData
): Promise<ReminderResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const editorId = String(formData.get("editor_id") ?? "").trim();
  if (!editorId) return { ok: false, message: "Missing editor." };

  const { data: editor } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", editorId)
    .maybeSingle();
  if (!editor) return { ok: false, message: "Track editor not found." };

  const { awaitingCount, pendingCount, paperIds, total } = await pendingFor(
    admin,
    editorId
  );
  if (total === 0) {
    return { ok: false, message: "This editor has no pending assignments." };
  }

  await admin.from("notifications").insert({
    profile_id: editorId,
    title: "Pending editorial assignments",
    body: `You have ${total} pending assignment${
      total === 1 ? "" : "s"
    }${paperIds.length ? ` (${paperIds.join(", ")})` : ""}. Please accept pending papers and record your decisions at the earliest.`,
    link: "/editor",
  });

  let emailed = false;
  if (emailConfigured() && editor.email) {
    try {
      const { subject, body } = trackEditorPendingReminderEmail({
        editorName: editor.full_name,
        awaitingCount,
        pendingCount,
        paperIds,
        brand: BRAND,
      });
      await sendEmail({
        to: editor.email,
        subject,
        text: body,
        kind: "track_editor_pending_reminder",
        sentBy: profile.id,
      });
      emailed = true;
    } catch {
      /* email failure never blocks the notification */
    }
  }

  revalidatePath("/chief/track-editors");
  revalidatePath("/admin/track-editors");
  return {
    ok: true,
    message: `Reminder sent to ${
      editor.full_name ?? "the Track Editor"
    } — dashboard notification${emailed ? " + email" : ""} (${total} pending).`,
  };
}

/** Nudge the Convener(s) that a Track Editor has pending/overdue assignments —
 *  dashboard notification + (if configured) a system email to each Convener. */
export async function remindConvener(
  formData: FormData
): Promise<ReminderResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const editorId = String(formData.get("editor_id") ?? "").trim();
  if (!editorId) return { ok: false, message: "Missing editor context." };

  const { data: editor } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", editorId)
    .maybeSingle();

  const { awaitingCount, pendingCount, paperIds, total } = await pendingFor(
    admin,
    editorId
  );
  if (total === 0) {
    return { ok: false, message: "No pending assignments to escalate." };
  }

  const { data: conveners } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .contains("roles", ["chief"]);
  const list = (conveners ?? []) as any[];
  if (list.length === 0) {
    return { ok: false, message: "No Convener account found to notify." };
  }

  let emailed = 0;
  for (const c of list) {
    await admin.from("notifications").insert({
      profile_id: c.id,
      title: "Track Editor has pending assignments",
      body: `${editor?.full_name ?? "A Track Editor"} has ${total} pending assignment${
        total === 1 ? "" : "s"
      }${paperIds.length ? ` (${paperIds.join(", ")})` : ""}. Kindly follow up or reassign.`,
      link: "/chief",
    });
    if (emailConfigured() && c.email) {
      try {
        const { subject, body } = convenerPendingReminderEmail({
          convenerName: c.full_name,
          editorName: editor?.full_name,
          awaitingCount,
          pendingCount,
          paperIds,
          brand: BRAND,
        });
        await sendEmail({
          to: c.email,
          subject,
          text: body,
          kind: "convener_pending_reminder",
          sentBy: profile.id,
        });
        emailed += 1;
      } catch {
        /* email failure never blocks the notification */
      }
    }
  }

  revalidatePath("/chief/track-editors");
  revalidatePath("/admin/track-editors");
  return {
    ok: true,
    message: `Convener notified (${list.length} recipient${
      list.length === 1 ? "" : "s"
    }${emailed ? `, ${emailed} emailed` : ""}).`,
  };
}
