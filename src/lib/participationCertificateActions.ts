"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateCertificatePdf } from "@/lib/certificatePdf";
import {
  withSalutation,
  type ParticipantCertificateSnapshot,
} from "@/lib/certificates";
import { sendEmail, emailConfigured } from "@/lib/email";
import { participationCertificateReadyEmail } from "@/lib/emailTemplates";

export type ParticipationCertResult = {
  ok: boolean;
  message?: string;
  generated?: number;
};

// Statuses that can never earn a participation certificate.
const NON_ELIGIBLE = ["draft", "rejected", "withdrawn"];

type SignatureMap = Record<
  string,
  { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" }
>;

/** Load whatever official signatures exist (verified by hash). Missing ones
 *  render as placeholder rules — the participation certificate is generated
 *  regardless, unlike the governed certificate office. */
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
      // A single unreadable signature just falls back to a placeholder.
    }
  }
  return out;
}

/**
 * Generate a participation certificate for every eligible paper a person (by
 * email) appears on. Gated on the person being marked attended AND registered.
 * Idempotent: papers that already have a certificate are skipped, so the button
 * can safely be pressed again. Once a row exists the author's dashboard shows a
 * download button for that paper.
 */
export async function generateParticipationCertificates(
  formData: FormData
): Promise<ParticipationCertResult> {
  const profile = await requireRole("chief", "admin");
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Missing author email." };

  const { data: rows } = await admin
    .from("submission_authors")
    .select(
      "id, submission_id, full_name, profile_id, attended_confirmed, registration_fee_paid, submissions!inner(id, title, status, conference_id, track_id)"
    )
    .ilike("email", email);

  const eligible = ((rows ?? []) as any[]).filter(
    (r) => r.submissions && !NON_ELIGIBLE.includes(r.submissions.status)
  );
  if (eligible.length === 0) {
    return { ok: false, message: "This author has no papers eligible for a certificate." };
  }

  // Gate: the person must be marked attended AND have paid the fee.
  const attended = eligible.some((r) => r.attended_confirmed);
  const paid = eligible.some((r) => r.registration_fee_paid);
  if (!attended || !paid) {
    return {
      ok: false,
      message:
        "Mark the author as attended and fee-paid before generating the certificate.",
    };
  }

  const signatures = await loadSignatures(admin);

  // Skip papers that already have a certificate.
  const ids = eligible.map((r) => r.id);
  const { data: existing } = await admin
    .from("participation_certificates")
    .select("submission_author_id")
    .in("submission_author_id", ids);
  const have = new Set(
    ((existing ?? []) as any[]).map((e) => e.submission_author_id)
  );

  const confCache = new Map<string, any>();
  let generated = 0;

  for (const row of eligible) {
    if (have.has(row.id)) continue;
    const sub = row.submissions;

    let conf = confCache.get(sub.conference_id);
    if (!conf) {
      const { data } = await admin
        .from("conferences")
        .select("name, acronym, year")
        .eq("id", sub.conference_id)
        .maybeSingle();
      conf = data ?? { name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 };
      confCache.set(sub.conference_id, conf);
    }

    const [{ data: track }, { data: coRows }, { data: prof }] =
      await Promise.all([
        admin.from("tracks").select("name").eq("id", sub.track_id).maybeSingle(),
        admin
          .from("submission_authors")
          .select("id, full_name, author_order")
          .eq("submission_id", sub.id)
          .order("author_order"),
        row.profile_id
          ? admin
              .from("profiles")
              .select("title")
              .eq("id", row.profile_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
      ]);

    const displayName = withSalutation(row.full_name, (prof as any)?.title ?? "");
    const snapshot: ParticipantCertificateSnapshot = {
      certificateType: "participant",
      recipientName: displayName,
      paperTitle: sub.title ?? "",
      coauthors: ((coRows ?? []) as any[])
        .filter((c) => c.id !== row.id)
        .map((c) => c.full_name),
      trackName: (track as any)?.name ?? "Conference Track",
      presentationDate: "2027-02-26",
      conferenceName: conf.name,
      conferenceAcronym: conf.acronym ?? "GLOGIFT",
      conferenceYear: conf.year ?? 2027,
    };

    const certNumber = `GLOGIFT${conf.year ?? 2027}-PC-${randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
    const pdfBytes = await generateCertificatePdf({
      certificate: {
        certificate_number: certNumber,
        certificate_type: "participant",
        issued_at: new Date().toISOString(),
        display_name: displayName,
        data_snapshot: snapshot,
      },
      signatures,
    });
    const sha = createHash("sha256").update(pdfBytes).digest("hex");
    const objectPath = `participation/${row.id}.pdf`;
    const { error: upErr } = await admin.storage
      .from("certificate-assets")
      .upload(objectPath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "0",
      });
    if (upErr) continue;

    const { error: insErr } = await admin
      .from("participation_certificates")
      .upsert(
        {
          submission_author_id: row.id,
          certificate_number: certNumber,
          display_name: displayName,
          paper_title: sub.title ?? "",
          track_name: (track as any)?.name ?? "",
          pdf_object_path: objectPath,
          pdf_sha256: sha,
          generated_by: profile.id,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "submission_author_id" }
      );
    if (!insErr) generated += 1;
  }

  // Notify the author once, best-effort — an email failure never blocks the
  // certificate that is already saved.
  if (generated > 0 && emailConfigured()) {
    try {
      const conf =
        [...confCache.values()][0] ??
        ({ name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 } as any);
      const brand = conf.acronym
        ? `${conf.acronym} ${conf.year}`
        : "GLOGIFT 27";
      const { subject, body } = participationCertificateReadyEmail({
        recipientName: eligible[0]?.full_name ?? undefined,
        paperCount: generated,
        conferenceName: conf.name,
        brand,
        dashboardUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://glogift2027.in",
      });
      await sendEmail({
        to: email,
        subject,
        text: body,
        kind: "participation_certificate_ready",
        sentBy: profile.id,
      });
    } catch {
      // Swallow — the certificate remains downloadable from the dashboard.
    }
  }

  revalidatePath("/chief/authors");
  revalidatePath("/admin/authors");
  return {
    ok: true,
    message:
      generated > 0
        ? `Participation certificate generated for ${generated} paper${
            generated === 1 ? "" : "s"
          }. The author has been emailed and can download it from their dashboard.`
        : "Certificate already generated for this author.",
    generated,
  };
}
