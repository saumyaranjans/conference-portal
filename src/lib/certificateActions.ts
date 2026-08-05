"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  CERTIFICATE_SIGNATORIES,
  CERTIFICATE_TEMPLATE_VERSION,
  certificatePrefix,
  participantEligibility,
  withSalutation,
  type CertificateSnapshot,
  type CertificateType,
} from "@/lib/certificates";
import { generateCertificatePdf } from "@/lib/certificatePdf";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { certificateIssuedEmail } from "@/lib/emailTemplates";

export type CertificateActionResult = {
  ok: boolean;
  message?: string;
  /** Set only for a preview: the generated (unsaved) PDF as base64. */
  previewPdf?: string;
  fileName?: string;
};

const OFFICE_PATH = "/admin/certificates";

async function certificateAudit(
  actorId: string,
  action: string,
  entityId: string | null,
  detail: Record<string, unknown> = {}
) {
  try {
    await createAdminClient().from("audit_log").insert({
      actor_id: actorId,
      action,
      entity: "certificate",
      entity_id: entityId,
      detail,
    });
  } catch {
    // Auditing is best-effort; the protected certificate tables remain the
    // authoritative record.
  }
}

function stringValue(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function checked(formData: FormData, key: string) {
  return ["true", "on", "1"].includes(String(formData.get(key) ?? ""));
}

async function revokeActiveCertificate({
  actorId,
  column,
  value,
  reason,
}: {
  actorId: string;
  column: "submission_author_id" | "track_editor_id";
  value: string;
  reason: string;
}) {
  await createAdminClient()
    .from("certificate_issuances")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: actorId,
      revocation_reason: reason,
    })
    .eq(column, value)
    .is("revoked_at", null);
}

export async function updateParticipantCertificateEvidence(
  formData: FormData
): Promise<CertificateActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();
  const authorId = stringValue(formData, "submission_author_id", 80);
  if (!authorId) return { ok: false, message: "Participant record is missing." };

  const feePaid = checked(formData, "registration_fee_paid");
  const attended = checked(formData, "attended_confirmed");
  const presented = checked(formData, "presentation_confirmed");
  const amountRaw = stringValue(formData, "amount_paid", 30);
  const amount = amountRaw ? Number(amountRaw) : null;
  const currency = stringValue(formData, "currency", 3).toUpperCase() || "INR";
  const presentationDate = stringValue(formData, "presentation_date", 10) || null;
  const glogiftMember = checked(formData, "glogift_member");

  if (feePaid && (!(Number(amount) > 0) || !Number.isFinite(amount))) {
    return { ok: false, message: "Enter the positive amount actually paid." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, message: "Use a three-letter currency code such as INR or USD." };
  }
  if (presented && !presentationDate) {
    return { ok: false, message: "Enter the presentation date." };
  }

  const { data: author } = await admin
    .from("submission_authors")
    .select("id")
    .eq("id", authorId)
    .maybeSingle();
  if (!author) return { ok: false, message: "Participant record was not found." };

  const now = new Date().toISOString();
  const { error } = await admin.from("participant_certificate_evidence").upsert(
    {
      submission_author_id: authorId,
      salutation_override: stringValue(formData, "salutation_override", 40),
      registration_fee_paid: feePaid,
      amount_paid: feePaid ? amount : null,
      glogift_member: glogiftMember,
      currency,
      payment_reference: stringValue(formData, "payment_reference", 120),
      paid_at: feePaid ? now : null,
      attended_confirmed: attended,
      presentation_confirmed: presented,
      presentation_date: presented ? presentationDate : null,
      notes: stringValue(formData, "notes", 1000),
      verified_by: profile.id,
      verified_at: now,
      updated_at: now,
    },
    { onConflict: "submission_author_id" }
  );
  if (error) return { ok: false, message: error.message };

  await revokeActiveCertificate({
    actorId: profile.id,
    column: "submission_author_id",
    value: authorId,
    reason: "Participant verification was updated; reissue required.",
  });
  await certificateAudit(profile.id, "certificate.participant_evidence_updated", authorId);
  revalidatePath(OFFICE_PATH);
  return { ok: true, message: "Participant verification saved." };
}

export async function updateTrackEditorServiceEvidence(
  formData: FormData
): Promise<CertificateActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();
  const trackEditorId = stringValue(formData, "track_editor_id", 80);
  if (!trackEditorId) return { ok: false, message: "Track Editor record is missing." };

  const { data: membership } = await admin
    .from("track_editors")
    .select("id")
    .eq("id", trackEditorId)
    .maybeSingle();
  if (!membership) return { ok: false, message: "Track Editor record was not found." };

  const confirmed = checked(formData, "service_confirmed");
  const now = new Date().toISOString();
  const { error } = await admin.from("track_editor_service_evidence").upsert(
    {
      track_editor_id: trackEditorId,
      service_confirmed: confirmed,
      service_date: stringValue(formData, "service_date", 10) || null,
      notes: stringValue(formData, "notes", 1000),
      verified_by: profile.id,
      verified_at: now,
      updated_at: now,
    },
    { onConflict: "track_editor_id" }
  );
  if (error) return { ok: false, message: error.message };

  await revokeActiveCertificate({
    actorId: profile.id,
    column: "track_editor_id",
    value: trackEditorId,
    reason: "Track Editor service verification was updated; reissue required.",
  });
  await certificateAudit(profile.id, "certificate.track_editor_evidence_updated", trackEditorId);
  revalidatePath(OFFICE_PATH);
  return { ok: true, message: "Track Editor service verification saved." };
}

export async function uploadCertificateSignature(
  formData: FormData
): Promise<CertificateActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();
  const key = stringValue(formData, "signatory_key", 80);
  const allowedKeys = new Set(CERTIFICATE_SIGNATORIES.map((item) => item.key));
  if (!allowedKeys.has(key as any)) return { ok: false, message: "Unknown signatory." };

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a signature image." };
  }
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return { ok: false, message: "Use a transparent PNG or a clean JPEG scan." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, message: "Signature images must be 2 MB or smaller." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const extension = file.type === "image/png" ? "png" : "jpg";
  const objectPath = `signatures/${key}/${sha256}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from("certificate-assets")
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "0",
    });
  if (uploadError) return { ok: false, message: uploadError.message };

  const { error } = await admin.from("certificate_signatures").upsert(
    {
      signatory_key: key,
      object_path: objectPath,
      mime_type: file.type,
      file_sha256: sha256,
      uploaded_by: profile.id,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "signatory_key" }
  );
  if (error) return { ok: false, message: error.message };

  await admin
    .from("certificate_issuances")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: profile.id,
      revocation_reason: "Official signature set changed; reissue required.",
    })
    .is("revoked_at", null);
  await certificateAudit(profile.id, "certificate.signature_uploaded", null, {
    signatory_key: key,
    sha256,
  });
  revalidatePath(OFFICE_PATH);
  return { ok: true, message: "Signature uploaded securely." };
}

async function loadSignatureSet(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("certificate_signatures")
    .select("signatory_key, object_path, mime_type, file_sha256");
  if (error) return null;

  const rows = new Map((data ?? []).map((row) => [row.signatory_key, row]));
  const signatures: Record<
    string,
    { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" }
  > = {};
  const signatureSnapshot: Record<
    string,
    { object_path: string; mime_type: string; file_sha256: string }
  > = {};

  for (const signatory of CERTIFICATE_SIGNATORIES) {
    const row = rows.get(signatory.key);
    if (!row) return null;
    const { data: blob, error: downloadError } = await admin.storage
      .from("certificate-assets")
      .download(row.object_path);
    if (downloadError || !blob) return null;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (actualHash !== row.file_sha256) return null;
    signatures[signatory.key] = {
      bytes,
      mimeType: row.mime_type as "image/png" | "image/jpeg",
    };
    signatureSnapshot[signatory.key] = {
      object_path: row.object_path,
      mime_type: row.mime_type,
      file_sha256: row.file_sha256,
    };
  }
  return { signatures, signatureSnapshot };
}

async function currentConference(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin
    .from("conferences")
    .select("id, name, acronym, year")
    .eq("id", id)
    .maybeSingle();
  return data as any;
}

export async function issueCertificate(
  formData: FormData
): Promise<CertificateActionResult> {
  const profile = await requireRole("admin");
  const admin = createAdminClient();
  const type = stringValue(formData, "certificate_type", 20) as CertificateType;
  const subjectId = stringValue(formData, "subject_id", 80);
  const conferenceId = stringValue(formData, "conference_id", 80);
  // Preview: the Editorial Office may generate an unsaved PDF to look at any
  // time, with relaxed checks. It is never persisted, emailed, or shown to the
  // recipient — only the real "Generate" (below) does that, and only in window.
  const preview = checked(formData, "preview");
  if (!(["participant", "reviewer", "track_editor"] as string[]).includes(type)) {
    return { ok: false, message: "Unknown certificate type." };
  }

  // Certificates may be generated only in the post-event window (preview aside).
  if (!preview) {
    const nowMs = Date.now();
    const windowStart = Date.parse("2027-02-25T00:00:00+05:30");
    const windowEnd = Date.parse("2027-03-30T23:59:59+05:30");
    if (nowMs < windowStart || nowMs > windowEnd) {
      return {
        ok: false,
        message: "Certificates can be generated only between 25 February and 30 March 2027.",
      };
    }
  }

  if (!subjectId || !conferenceId) return { ok: false, message: "Certificate subject is missing." };
  // A preview renders with whatever signatures exist (placeholders otherwise);
  // a real issuance requires all three verified signatures.
  const signatureSet =
    (await loadSignatureSet(admin)) ??
    (preview ? { signatures: {}, signatureSnapshot: {} } : null);
  if (!signatureSet) {
    return {
      ok: false,
      message: "Upload and verify all three official signatures before issuing certificates.",
    };
  }

  const conference = await currentConference(admin, conferenceId);
  if (!conference) return { ok: false, message: "Conference was not found." };

  let recipientProfileId: string | null = null;
  let submissionAuthorId: string | null = null;
  let trackEditorId: string | null = null;
  let displayName = "";
  let snapshot: CertificateSnapshot;

  if (type === "participant") {
    const { data: author } = await admin
      .from("submission_authors")
      .select("id, submission_id, profile_id, full_name, author_order")
      .eq("id", subjectId)
      .maybeSingle();
    if (!author) return { ok: false, message: "Participant was not found." };

    const { data: submission } = await admin
      .from("submissions")
      .select("id, title, status, conference_id, track_id")
      .eq("id", author.submission_id)
      .eq("conference_id", conferenceId)
      .maybeSingle();
    if (!submission) return { ok: false, message: "The paper is not part of this conference." };
    if (["draft", "rejected", "withdrawn"].includes(submission.status)) {
      return { ok: false, message: "Certificates cannot be issued for this paper status." };
    }

    const [{ data: evidence }, { data: track }, { data: allAuthors }] = await Promise.all([
      admin
        .from("participant_certificate_evidence")
        .select("*")
        .eq("submission_author_id", subjectId)
        .maybeSingle(),
      admin.from("tracks").select("name").eq("id", submission.track_id).maybeSingle(),
      admin
        .from("submission_authors")
        .select("id, full_name, author_order")
        .eq("submission_id", author.submission_id)
        .order("author_order"),
    ]);
    const eligibility = participantEligibility(evidence);
    if (!preview && !eligibility.eligible) {
      return { ok: false, message: `Not eligible: ${eligibility.missing.join(", ")}.` };
    }

    let profileTitle = "";
    if (author.profile_id) {
      const { data: recipientProfile } = await admin
        .from("profiles")
        .select("title")
        .eq("id", author.profile_id)
        .maybeSingle();
      profileTitle = recipientProfile?.title ?? "";
    }
    const salutation = evidence?.salutation_override || profileTitle;
    if (!preview && !salutation?.trim()) {
      return { ok: false, message: "Add the participant's salutation before issuing." };
    }
    displayName = withSalutation(author.full_name, salutation);
    recipientProfileId = author.profile_id;
    submissionAuthorId = author.id;
    snapshot = {
      certificateType: "participant",
      recipientName: displayName,
      paperTitle: submission.title,
      coauthors: (allAuthors ?? [])
        .filter((item) => item.id !== author.id)
        .map((item) => item.full_name),
      trackName: track?.name ?? "Conference Track",
      presentationDate: evidence?.presentation_date ?? "2027-02-26",
      conferenceName: conference.name,
      conferenceAcronym: conference.acronym,
      conferenceYear: conference.year,
    };
  } else if (type === "reviewer") {
    const { data: reviewer } = await admin
      .from("profiles")
      .select("id, full_name, title")
      .eq("id", subjectId)
      .maybeSingle();
    if (!reviewer) return { ok: false, message: "Reviewer was not found." };

    const { data: completed } = await admin
      .from("reviews")
      .select("id, assignments!inner(status), submissions!inner(conference_id)")
      .eq("reviewer_id", subjectId)
      .eq("is_submitted", true)
      .eq("assignments.status", "submitted")
      .eq("submissions.conference_id", conferenceId)
      .limit(1);
    if (!preview && !completed?.length) {
      return { ok: false, message: "A submitted review is required." };
    }
    if (!preview && !reviewer.title?.trim()) {
      return { ok: false, message: "Add the reviewer's salutation to their profile first." };
    }
    displayName = withSalutation(reviewer.full_name, reviewer.title ?? "");
    recipientProfileId = reviewer.id;
    snapshot = {
      certificateType: "reviewer",
      recipientName: displayName,
      conferenceName: conference.name,
      conferenceAcronym: conference.acronym,
      conferenceYear: conference.year,
    };
  } else {
    const { data: membership } = await admin
      .from("track_editors")
      .select("id, profile_id, track_id, status")
      .eq("id", subjectId)
      .maybeSingle();
    if (!membership || membership.status !== "accepted") {
      return { ok: false, message: "An accepted Track Editor appointment is required." };
    }
    const [{ data: service }, { data: editor }, { data: track }] = await Promise.all([
      admin
        .from("track_editor_service_evidence")
        .select("service_confirmed")
        .eq("track_editor_id", membership.id)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("id, full_name, title")
        .eq("id", membership.profile_id)
        .maybeSingle(),
      admin
        .from("tracks")
        .select("id, name, conference_id")
        .eq("id", membership.track_id)
        .eq("conference_id", conferenceId)
        .maybeSingle(),
    ]);
    if (!preview && !service?.service_confirmed) {
      return { ok: false, message: "Editorial Office service confirmation is required." };
    }
    if (!editor || !track) return { ok: false, message: "Track Editor details are incomplete." };

    if (!preview && !editor.title?.trim()) {
      return { ok: false, message: "Add the Track Editor's salutation to their profile first." };
    }
    displayName = withSalutation(editor.full_name, editor.title ?? "");
    recipientProfileId = editor.id;
    trackEditorId = membership.id;
    snapshot = {
      certificateType: "track_editor",
      recipientName: displayName,
      trackName: track.name,
      conferenceName: conference.name,
      conferenceAcronym: conference.acronym,
      conferenceYear: conference.year,
    };
  }

  const prefix = certificatePrefix(type);
  // The Editorial Office may type the certificate number; if left blank we mint
  // one. A typed number is used as-is (its uniqueness is enforced by the DB).
  const providedNumber = stringValue(formData, "certificate_number", 60).trim();

  // Preview: render the PDF and hand it straight back — never saved or emailed.
  if (preview) {
    const previewNumber = providedNumber || `GLOGIFT${conference.year}-${prefix}-PREVIEW`;
    const pdfBytes = await generateCertificatePdf({
      certificate: {
        certificate_number: previewNumber,
        certificate_type: type,
        issued_at: new Date().toISOString(),
        display_name: displayName,
        data_snapshot: snapshot,
      },
      signatures: signatureSet.signatures,
    });
    return {
      ok: true,
      message: "Preview generated.",
      previewPdf: Buffer.from(pdfBytes).toString("base64"),
      fileName: `${previewNumber}.pdf`,
    };
  }

  let insertError: any = null;
  let issuedId: string | null = null;
  let issuedNumber = "";
  let issuedPdf: Uint8Array | null = null;
  const issuedAt = new Date().toISOString();
  const maxAttempts = providedNumber ? 1 : 4;
  for (let attempt = 0; attempt < maxAttempts && !issuedId; attempt += 1) {
    const certificateNumber =
      providedNumber ||
      `GLOGIFT${conference.year}-${prefix}-${randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;
    const pdfBytes = await generateCertificatePdf({
      certificate: {
        certificate_number: certificateNumber,
        certificate_type: type,
        issued_at: issuedAt,
        display_name: displayName,
        data_snapshot: snapshot,
      },
      signatures: signatureSet.signatures,
    });
    const pdfSha256 = createHash("sha256").update(pdfBytes).digest("hex");
    const pdfObjectPath = `certificates/${conference.id}/${certificateNumber}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("certificate-assets")
      .upload(pdfObjectPath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) {
      insertError = uploadError;
      continue;
    }

    const { data, error } = await admin
      .from("certificate_issuances")
      .insert({
        certificate_number: certificateNumber,
        certificate_type: type,
        conference_id: conferenceId,
        recipient_profile_id: recipientProfileId,
        submission_author_id: submissionAuthorId,
        track_editor_id: trackEditorId,
        display_name: displayName,
        data_snapshot: snapshot,
        signature_snapshot: signatureSet.signatureSnapshot,
        template_version: CERTIFICATE_TEMPLATE_VERSION,
        pdf_object_path: pdfObjectPath,
        pdf_sha256: pdfSha256,
        issued_by: profile.id,
        issued_at: issuedAt,
      })
      .select("id")
      .single();
    insertError = error;
    if (data?.id) {
      issuedId = data.id;
      issuedNumber = certificateNumber;
      issuedPdf = pdfBytes;
    }
    if (error) {
      await admin.storage.from("certificate-assets").remove([pdfObjectPath]);
      if (error.code === "23505" && String(error.message).includes("certificate_number")) {
        if (providedNumber)
          return { ok: false, message: `Certificate number "${providedNumber}" is already in use.` };
      } else if (error.code === "23505") {
        return { ok: false, message: "An active certificate already exists for this person." };
      }
    }
  }
  if (!issuedId) return { ok: false, message: insertError?.message ?? "Certificate could not be issued." };

  await certificateAudit(profile.id, "certificate.issued", issuedId, {
    certificate_type: type,
    subject_id: subjectId,
  });

  // System-generated email to the recipient — best-effort, never blocks issuance.
  // Only reached inside the generation window, so it cannot be sent early.
  try {
    let recipientEmail: string | null = null;
    if (recipientProfileId) {
      const { data } = await admin
        .from("profiles")
        .select("email")
        .eq("id", recipientProfileId)
        .maybeSingle();
      recipientEmail = (data as any)?.email ?? null;
    } else if (submissionAuthorId) {
      const { data } = await admin
        .from("submission_authors")
        .select("email, profile_id")
        .eq("id", submissionAuthorId)
        .maybeSingle();
      recipientEmail = (data as any)?.email ?? null;
      if (!recipientEmail && (data as any)?.profile_id) {
        const { data: p } = await admin
          .from("profiles")
          .select("email")
          .eq("id", (data as any).profile_id)
          .maybeSingle();
        recipientEmail = (p as any)?.email ?? null;
      }
    } else if (trackEditorId) {
      const { data: te } = await admin
        .from("track_editors")
        .select("profile_id")
        .eq("id", trackEditorId)
        .maybeSingle();
      if ((te as any)?.profile_id) {
        const { data: p } = await admin
          .from("profiles")
          .select("email")
          .eq("id", (te as any).profile_id)
          .maybeSingle();
        recipientEmail = (p as any)?.email ?? null;
      }
    }

    // Per the Editorial Office, governed certificates are NOT emailed — they are
    // generated, previewed and downloaded from this office only. Guard kept off.
    const SEND_CERTIFICATE_EMAIL = false;
    if (SEND_CERTIFICATE_EMAIL && recipientEmail && emailConfigured()) {
      const brand = conference.acronym
        ? `${conference.acronym} ${String(conference.year).slice(-2)}`
        : "GLOGIFT 27";
      const { subject, body } = certificateIssuedEmail({
        recipientName: displayName,
        certificateType: type,
        certificateNumber: issuedNumber,
        conferenceName: conference.name,
        brand,
        dashboardUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.in",
      });
      await sendEmail({
        to: recipientEmail,
        subject,
        text: body,
        kind: "certificate_issued",
        sentBy: profile.id,
        attachments: issuedPdf
          ? [
              {
                filename: `${issuedNumber}.pdf`,
                content: Buffer.from(issuedPdf).toString("base64"),
              },
            ]
          : undefined,
      });
    }
  } catch {
    // An email failure must never break certificate issuance.
  }

  revalidatePath(OFFICE_PATH);
  return { ok: true, message: "Certificate issued. Use View / Download PDF." };
}

export async function revokeCertificate(
  formData: FormData
): Promise<CertificateActionResult> {
  const profile = await requireRole("admin");
  const id = stringValue(formData, "certificate_id", 80);
  const reason = stringValue(formData, "reason", 300);
  if (!id || !reason) return { ok: false, message: "A revocation reason is required." };

  const { error } = await createAdminClient()
    .from("certificate_issuances")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: profile.id,
      revocation_reason: reason,
    })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) return { ok: false, message: error.message };

  await certificateAudit(profile.id, "certificate.revoked", id, { reason });
  revalidatePath(OFFICE_PATH);
  return { ok: true, message: "Certificate revoked." };
}
