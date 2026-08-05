import { createAdminClient } from "@/lib/supabase/server";

/** Certificates are generated from 25 Feb 2027; the dashboard box appears only
 *  from that date (before then nothing is issued and nothing should show). */
export function certificatesReleased(): boolean {
  return Date.now() >= Date.parse("2027-02-25T00:00:00+05:30");
}

/**
 * Certificates may be *generated and downloaded* at any time, but the
 * system-generated "thank-you" email to the author / reviewer / track editor is
 * only sent while the conference email window is open: 25 Feb – 30 Mar 2027.
 * Outside the window the certificate is still issued and downloadable; only the
 * notification email is held back.
 */
export function certificatesEmailable(): boolean {
  const now = Date.now();
  return (
    now >= Date.parse("2027-02-25T00:00:00+05:30") &&
    now <= Date.parse("2027-03-30T23:59:59+05:30")
  );
}

export type MyCertificate = {
  id: string;
  certificate_number: string;
  certificate_type: "participant" | "reviewer" | "track_editor";
  display_name: string;
  issued_at: string;
};

/**
 * Active (non-revoked) certificates issued to this profile — as a participant
 * (via their submission_authors rows), a reviewer, or a track editor. Read with
 * the service client because the issuance table is Editorial-Office-only; the
 * caller has already been authenticated as this profile. Returns [] if the
 * certificate tables are not present yet (migration 0050 unapplied).
 */
export async function listMyCertificates(profileId: string): Promise<MyCertificate[]> {
  const admin = createAdminClient();
  const [{ data: sa }, { data: te }] = await Promise.all([
    admin.from("submission_authors").select("id").eq("profile_id", profileId),
    admin.from("track_editors").select("id").eq("profile_id", profileId),
  ]);
  const saIds = ((sa ?? []) as any[]).map((r) => r.id);
  const teIds = ((te ?? []) as any[]).map((r) => r.id);
  const ors = [`recipient_profile_id.eq.${profileId}`];
  if (saIds.length) ors.push(`submission_author_id.in.(${saIds.join(",")})`);
  if (teIds.length) ors.push(`track_editor_id.in.(${teIds.join(",")})`);

  const { data } = await admin
    .from("certificate_issuances")
    .select("id, certificate_number, certificate_type, display_name, issued_at")
    .is("revoked_at", null)
    .or(ors.join(","))
    .order("issued_at", { ascending: false });
  return ((data ?? []) as MyCertificate[]);
}

/** Whether a profile is the recipient of a specific certificate (download gate). */
export async function isCertificateRecipient(
  cert: {
    recipient_profile_id?: string | null;
    submission_author_id?: string | null;
    track_editor_id?: string | null;
  },
  profileId: string
): Promise<boolean> {
  if (cert.recipient_profile_id && cert.recipient_profile_id === profileId) return true;
  const admin = createAdminClient();
  if (cert.submission_author_id) {
    const { data } = await admin
      .from("submission_authors")
      .select("profile_id")
      .eq("id", cert.submission_author_id)
      .maybeSingle();
    if ((data as any)?.profile_id === profileId) return true;
  }
  if (cert.track_editor_id) {
    const { data } = await admin
      .from("track_editors")
      .select("profile_id")
      .eq("id", cert.track_editor_id)
      .maybeSingle();
    if ((data as any)?.profile_id === profileId) return true;
  }
  return false;
}
