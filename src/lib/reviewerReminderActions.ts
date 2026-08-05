"use server";

import { revalidatePath } from "next/cache";

import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { trackEditorOverdueReminderEmail } from "@/lib/emailTemplates";

export type ReminderResult = { ok: boolean; message?: string };

/**
 * Nudge the handling Track Editor that a review on one of their papers is
 * overdue. Sends a system-generated email and bumps a per-assignment counter
 * so the desk can see how many reminders have already gone out.
 */
export async function remindTrackEditorOverdue(
  formData: FormData
): Promise<ReminderResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const id = String(formData.get("assignment_id") ?? "").trim();
  if (!id) return { ok: false, message: "Missing assignment." };

  const { data: a } = await admin
    .from("assignments")
    .select(
      "id, due_date, editor_reminder_count, submissions!inner(paper_id, title, assigned_editor_id, conference_id, tracks(name))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) return { ok: false, message: "Assignment not found." };

  const sub = (a as any).submissions;
  const editorId = sub?.assigned_editor_id;
  if (!editorId) {
    return {
      ok: false,
      message: "No handling editor is assigned to this paper yet.",
    };
  }

  const { data: editor } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", editorId)
    .maybeSingle();
  if (!editor?.email) {
    return { ok: false, message: "The handling editor has no email on file." };
  }

  const nextCount = ((a as any).editor_reminder_count ?? 0) + 1;

  // Conference brand for the signature (best-effort).
  const { data: conf } = await admin
    .from("conferences")
    .select("name, acronym, year")
    .eq("id", sub.conference_id)
    .maybeSingle();
  const brand = conf?.acronym
    ? `${conf.acronym} ${String(conf.year ?? 2027).slice(-2)}`
    : "GLOGIFT 27";

  if (!emailConfigured()) {
    return {
      ok: false,
      message: "Email is not configured, so no reminder was sent.",
    };
  }

  const due = a.due_date
    ? new Date(a.due_date as string).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const { subject, body } = trackEditorOverdueReminderEmail({
    editorName: editor.full_name ?? undefined,
    paperId: sub.paper_id ?? undefined,
    paperTitle: sub.title ?? undefined,
    track: sub.tracks?.name ?? undefined,
    dueDate: due,
    reminderNumber: nextCount,
    conferenceName: conf?.name ?? undefined,
    brand,
  });

  try {
    await sendEmail({
      to: editor.email,
      subject,
      text: body,
      kind: "track_editor_overdue_reminder",
      sentBy: profile.id,
    });
  } catch (e) {
    return {
      ok: false,
      message: `Could not send the reminder email: ${
        e instanceof Error ? e.message : "unknown error"
      }`,
    };
  }

  await admin
    .from("assignments")
    .update({
      editor_reminder_count: nextCount,
      editor_last_reminded_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/chief/reviewers");
  revalidatePath("/admin/reviewers");
  return {
    ok: true,
    message: `Reminder sent to ${editor.full_name ?? "the Track Editor"} (${nextCount} total).`,
  };
}
