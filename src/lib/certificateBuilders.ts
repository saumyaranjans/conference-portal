import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";
import { generateCertificatePdf } from "@/lib/certificatePdf";
import {
  withSalutation,
  type ReviewerCertificateSnapshot,
  type ParticipantCertificateSnapshot,
  type TrackEditorCertificateSnapshot,
} from "@/lib/certificates";

/**
 * Shared, side-effect-free PDF builders used by the "Preview certificate"
 * routes. These produce the exact same document the "Generate" action stores
 * and emails — but nothing is persisted, uploaded or emailed. Keep the snapshot
 * shapes here in sync with participation/reviewer certificate actions.
 */

type Admin = ReturnType<typeof createAdminClient>;
type SignatureMap = Record<
  string,
  { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" }
>;

const NON_ELIGIBLE = ["draft", "rejected", "withdrawn"];

async function loadSignatures(admin: Admin): Promise<SignatureMap> {
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

export type PreviewResult =
  | { ok: true; pdfBytes: Uint8Array; filename: string }
  | { ok: false; message: string };

/** Build (but do not store/email) the reviewer Certificate of Appreciation. */
export async function buildReviewerCertificatePreview(
  admin: Admin,
  email: string
): Promise<PreviewResult> {
  const { data: reviewer } = await admin
    .from("profiles")
    .select("id, full_name, title")
    .ilike("email", email)
    .maybeSingle();
  if (!reviewer) return { ok: false, message: "Reviewer profile not found." };

  const { data: rev } = await admin
    .from("reviews")
    .select("id, submissions!inner(conference_id)")
    .eq("reviewer_id", reviewer.id)
    .eq("is_submitted", true)
    .limit(1)
    .maybeSingle();
  if (!rev) {
    return { ok: false, message: "This reviewer has no completed review yet." };
  }

  const { data: conf } = await admin
    .from("conferences")
    .select("name, acronym, year")
    .eq("id", (rev as any).submissions.conference_id)
    .maybeSingle();
  const conference = conf ?? { name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 };

  const displayName = withSalutation(reviewer.full_name, reviewer.title ?? "");
  const snapshot: ReviewerCertificateSnapshot = {
    certificateType: "reviewer",
    recipientName: displayName,
    conferenceName: conference.name,
    conferenceAcronym: conference.acronym ?? "GLOGIFT",
    conferenceYear: conference.year ?? 2027,
  };

  const signatures = await loadSignatures(admin);
  const pdfBytes = await generateCertificatePdf({
    certificate: {
      certificate_number: `PREVIEW-R-${randomBytes(2).toString("hex").toUpperCase()}`,
      certificate_type: "reviewer",
      issued_at: new Date().toISOString(),
      display_name: displayName,
      data_snapshot: snapshot,
    },
    signatures,
  });
  return { ok: true, pdfBytes, filename: "preview-reviewer-certificate.pdf" };
}

/**
 * Build (but do not store/email) a participation certificate for the FIRST
 * eligible paper the person appears on — a representative preview. Same
 * attended-and-paid gate as the Generate action.
 */
export async function buildParticipationCertificatePreview(
  admin: Admin,
  email: string
): Promise<PreviewResult> {
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

  const attended = eligible.some((r) => r.attended_confirmed);
  const paid = eligible.some((r) => r.registration_fee_paid);
  if (!attended || !paid) {
    return {
      ok: false,
      message:
        "Mark the author as attended and fee-paid before previewing the certificate.",
    };
  }

  const row = eligible[0];
  const sub = row.submissions;

  const [{ data: conf }, { data: track }, { data: coRows }, { data: prof }] =
    await Promise.all([
      admin
        .from("conferences")
        .select("name, acronym, year")
        .eq("id", sub.conference_id)
        .maybeSingle(),
      admin.from("tracks").select("name").eq("id", sub.track_id).maybeSingle(),
      admin
        .from("submission_authors")
        .select("id, full_name, author_order")
        .eq("submission_id", sub.id)
        .order("author_order"),
      row.profile_id
        ? admin.from("profiles").select("title").eq("id", row.profile_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
    ]);
  const conference = conf ?? { name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 };

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
    conferenceName: conference.name,
    conferenceAcronym: conference.acronym ?? "GLOGIFT",
    conferenceYear: conference.year ?? 2027,
  };

  const signatures = await loadSignatures(admin);
  const pdfBytes = await generateCertificatePdf({
    certificate: {
      certificate_number: `PREVIEW-PC-${randomBytes(2).toString("hex").toUpperCase()}`,
      certificate_type: "participant",
      issued_at: new Date().toISOString(),
      display_name: displayName,
      data_snapshot: snapshot,
    },
    signatures,
  });
  return { ok: true, pdfBytes, filename: "preview-participation-certificate.pdf" };
}

export type TrackEditorCertResult =
  | {
      ok: true;
      pdfBytes: Uint8Array;
      filename: string;
      profileId: string;
      recipientEmail: string | null;
      displayName: string;
      certNumber: string;
      conferenceName: string;
      conferenceAcronym: string;
      conferenceYear: number;
    }
  | { ok: false; message: string };

/**
 * Build the track-editor Certificate of Appreciation. Gated on the editor
 * having taken at least one final, active decision. Returns everything the
 * generate action needs to store + email; the preview route uses only the
 * pdfBytes/filename. Nothing here is persisted.
 */
export async function buildTrackEditorCertificate(
  admin: Admin,
  email: string
): Promise<TrackEditorCertResult> {
  const { data: prof } = await admin
    .from("profiles")
    .select("id, full_name, email, title")
    .ilike("email", email)
    .maybeSingle();
  if (!prof) return { ok: false, message: "Track editor profile not found." };

  // Eligibility: at least one final, active decision by this editor.
  const { data: dec } = await admin
    .from("decisions")
    .select("submission_id, submissions!inner(conference_id)")
    .eq("decided_by", prof.id)
    .eq("is_final", true)
    .is("superseded_at", null)
    .limit(1)
    .maybeSingle();
  if (!dec) {
    return {
      ok: false,
      message: "This track editor has not taken any decision yet.",
    };
  }

  // Tracks they chair (accepted) → the certificate's track label.
  const { data: teRows } = await admin
    .from("track_editors")
    .select("status, tracks(name)")
    .eq("profile_id", prof.id);
  const trackNames = [
    ...new Set(
      ((teRows ?? []) as any[])
        .filter((t) => t.status === "accepted")
        .map((t) => t.tracks?.name)
        .filter(Boolean)
    ),
  ];
  const trackLabel =
    trackNames.length === 0
      ? "Conference Track"
      : trackNames.join(", ");

  const { data: conf } = await admin
    .from("conferences")
    .select("name, acronym, year")
    .eq("id", (dec as any).submissions.conference_id)
    .maybeSingle();
  const conference = conf ?? { name: "GLOGIFT 27", acronym: "GLOGIFT", year: 2027 };

  const displayName = withSalutation(prof.full_name, prof.title ?? "");
  const snapshot: TrackEditorCertificateSnapshot = {
    certificateType: "track_editor",
    recipientName: displayName,
    trackName: trackLabel,
    conferenceName: conference.name,
    conferenceAcronym: conference.acronym ?? "GLOGIFT",
    conferenceYear: conference.year ?? 2027,
  };

  const signatures = await loadSignatures(admin);
  const certNumber = `GLOGIFT${conference.year ?? 2027}-TE-${randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
  const pdfBytes = await generateCertificatePdf({
    certificate: {
      certificate_number: certNumber,
      certificate_type: "track_editor",
      issued_at: new Date().toISOString(),
      display_name: displayName,
      data_snapshot: snapshot,
    },
    signatures,
  });
  return {
    ok: true,
    pdfBytes,
    filename: "preview-track-editor-certificate.pdf",
    profileId: prof.id,
    recipientEmail: prof.email,
    displayName,
    certNumber,
    conferenceName: conference.name,
    conferenceAcronym: conference.acronym ?? "GLOGIFT",
    conferenceYear: conference.year ?? 2027,
  };
}
