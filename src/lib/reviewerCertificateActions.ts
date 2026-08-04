"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateCertificatePdf } from "@/lib/certificatePdf";
import {
  withSalutation,
  type ReviewerCertificateSnapshot,
} from "@/lib/certificates";
import { sendEmail, emailConfigured } from "@/lib/email";
import { reviewerCertificateThanksEmail } from "@/lib/emailTemplates";

export type ReviewerCertResult = { ok: boolean; message?: string };

type SignatureMap = Record<
  string,
  { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" }
>;

async function loadSignatures(
  admin: ReturnType<typeof createAdminClient>
): Promise<SignatureMap> {
  const out: SignatureMap = {};
  const { data } = await admin
    .from("certificate_signatures")
    .select("signatory_key, object_path, mime_type, file_sha256");
  for (const row of (data ?? []) as any[]) {
    try {
      const { data: blob } = await admin.storage
        .from("certificate-assets")
        .download(row.object_path);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== row.file_sha256)
        continue;
      out[row.signatory_key] = { bytes, mimeType: row.mime_type };
    } catch {
      /* placeholder */
    }
  }
  return out;
}

/**
 * Generate a reviewer Certificate of Appreciation for the reviewer with this
 * email. Gated on the reviewer having at least one completed (submitted)
 * review. Idempotent. Surfaces on the reviewer's dashboard and is emailed.
 */
export async function generateReviewerCertificate(
  formData: FormData
): Promise<ReviewerCertResult> {
  const profile = await requireRole("chief", "admin");
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Missing reviewer email." };

  const { data: reviewer } = await admin
    .from("profiles")
    .select("id, full_name, email, title")
    .ilike("email", email)
    .maybeSingle();
  if (!reviewer) return { ok: false, message: "Reviewer profile not found." };

  // Eligibility + conference: at least one submitted review.
  const { data: rev } = await admin
    .from("reviews")
    .select("id, submissions!inner(conference_id)")
    .eq("reviewer_id", reviewer.id)
    .eq("is_submitted", true)
    .limit(1)
    .maybeSingle();
  if (!rev) {
    return {
      ok: false,
      message: "This reviewer has no completed review yet.",
    };
  }

  // Already generated?
  const { data: existing } = await admin
    .from("reviewer_certificates")
    .select("id")
    .eq("recipient_profile_id", reviewer.id)
    .maybeSingle();
  if (existing) {
    return { ok: true, message: "Certificate already generated." };
  }

  const { data: conf } = await admin
    .from("conferences")
    .select("name, acronym, year")
    .eq("id", (rev as any).submissions.conference_id)
    .maybeSingle();
  const conference =
    conf ?? { name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 };

  const displayName = withSalutation(reviewer.full_name, reviewer.title ?? "");
  const snapshot: ReviewerCertificateSnapshot = {
    certificateType: "reviewer",
    recipientName: displayName,
    conferenceName: conference.name,
    conferenceAcronym: conference.acronym ?? "GLOGIFT",
    conferenceYear: conference.year ?? 2027,
  };

  const signatures = await loadSignatures(admin);
  const certNumber = `GLOGIFT${conference.year ?? 2027}-R-${randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
  const pdfBytes = await generateCertificatePdf({
    certificate: {
      certificate_number: certNumber,
      certificate_type: "reviewer",
      issued_at: new Date().toISOString(),
      display_name: displayName,
      data_snapshot: snapshot,
    },
    signatures,
  });
  const sha = createHash("sha256").update(pdfBytes).digest("hex");
  const objectPath = `reviewer/${reviewer.id}.pdf`;
  const { error: upErr } = await admin.storage
    .from("certificate-assets")
    .upload(objectPath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "0",
    });
  if (upErr) return { ok: false, message: upErr.message };

  const { error: insErr } = await admin.from("reviewer_certificates").upsert(
    {
      recipient_profile_id: reviewer.id,
      certificate_number: certNumber,
      display_name: displayName,
      pdf_object_path: objectPath,
      pdf_sha256: sha,
      generated_by: profile.id,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "recipient_profile_id" }
  );
  if (insErr) return { ok: false, message: insErr.message };

  if (emailConfigured() && reviewer.email) {
    try {
      const brand = conference.acronym
        ? `${conference.acronym} ${String(conference.year ?? 2027).slice(-2)}`
        : "GLOGIFT 27";
      const base =
        process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.in";
      const { subject, body } = reviewerCertificateThanksEmail({
        recipientName: displayName,
        certificateNumber: certNumber,
        conferenceName: conference.name,
        brand,
        downloadUrl: `${base.replace(/\/$/, "")}/reviewer`,
      });
      await sendEmail({
        to: reviewer.email,
        subject,
        text: body,
        kind: "reviewer_certificate_ready",
        sentBy: profile.id,
      });
    } catch {
      /* email failure never blocks the certificate */
    }
  }

  revalidatePath("/chief/reviewers");
  revalidatePath("/admin/reviewers");
  return {
    ok: true,
    message: "Reviewer certificate generated and emailed.",
  };
}
