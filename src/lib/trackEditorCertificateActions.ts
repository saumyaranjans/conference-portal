"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { buildTrackEditorCertificate } from "@/lib/certificateBuilders";
import { sendEmail, emailConfigured } from "@/lib/email";
import { trackEditorCertificateThanksEmail } from "@/lib/emailTemplates";
import { certificatesEmailable } from "@/lib/certificateAccess";

export type TrackEditorCertResult = { ok: boolean; message?: string };

/**
 * Generate a track-editor Certificate of Appreciation for the editor with this
 * email. Gated (in the builder) on the editor having taken at least one final
 * decision. Idempotent; surfaces on the editor dashboard and is emailed.
 */
export async function generateTrackEditorCertificate(
  formData: FormData
): Promise<TrackEditorCertResult> {
  const profile = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Missing track editor email." };
  const regenerate = String(formData.get("regenerate")) === "true";

  // Short-circuit if already generated (unless regenerating).
  const { data: prof } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (prof && !regenerate) {
    const { data: existing } = await admin
      .from("track_editor_certificates")
      .select("id")
      .eq("recipient_profile_id", prof.id)
      .maybeSingle();
    if (existing) return { ok: true, message: "Certificate already generated." };
  }

  const built = await buildTrackEditorCertificate(admin, email);
  if (!built.ok) return { ok: false, message: built.message };

  const sha = createHash("sha256").update(built.pdfBytes).digest("hex");
  const objectPath = `track-editor/${built.profileId}.pdf`;
  const { error: upErr } = await admin.storage
    .from("certificate-assets")
    .upload(objectPath, Buffer.from(built.pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "0",
    });
  if (upErr) return { ok: false, message: upErr.message };

  const { error: insErr } = await admin
    .from("track_editor_certificates")
    .upsert(
      {
        recipient_profile_id: built.profileId,
        certificate_number: built.certNumber,
        display_name: built.displayName,
        pdf_object_path: objectPath,
        pdf_sha256: sha,
        generated_by: profile.id,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "recipient_profile_id" }
    );
  if (insErr) return { ok: false, message: insErr.message };

  // The thank-you email only goes out within the 25 Feb – 30 Mar 2027 window;
  // the certificate itself is issued and downloadable regardless.
  if (!regenerate && certificatesEmailable() && emailConfigured() && built.recipientEmail) {
    try {
      const brand = built.conferenceAcronym
        ? `${built.conferenceAcronym} ${String(built.conferenceYear).slice(-2)}`
        : "GLOGIFT 27";
      const base = process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.in";
      const { subject, body } = trackEditorCertificateThanksEmail({
        recipientName: built.displayName,
        certificateNumber: built.certNumber,
        conferenceName: built.conferenceName,
        brand,
        downloadUrl: `${base.replace(/\/$/, "")}/editor`,
      });
      await sendEmail({
        to: built.recipientEmail,
        subject,
        text: body,
        kind: "track_editor_certificate_ready",
        sentBy: profile.id,
      });
    } catch {
      /* email failure never blocks the certificate */
    }
  }

  revalidatePath("/chief/track-editors");
  revalidatePath("/admin/track-editors");
  return {
    ok: true,
    message: regenerate
      ? "Track editor certificate regenerated (same download link, new number)."
      : "Track editor certificate generated and emailed.",
  };
}
