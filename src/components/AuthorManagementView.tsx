import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import { AuthorManagement, type PersonRow } from "@/components/AuthorManagement";
import { computeRegistrationFee } from "@/lib/registrationFees";

/**
 * Author Management — a per-PERSON directory (deduped by email): the papers each
 * author is on and their role, sign-up / registration status, declared intention
 * to attend, and the registration amount (applicable only when attending).
 * Shared by the Convener and Editorial Office.
 */
export async function AuthorManagementView() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("submission_authors")
    .select(
      "id, full_name, email, mobile, participant_category, profile_id, is_corresponding, attendance, attended_confirmed, registration_confirmed, registration_fee_paid, registration_fee_tier, submissions!inner(paper_id, title, status, submission_type, participation_mode, tracks(code, name))"
    );

  const authors = ((data ?? []) as any[]).filter(
    (a) => a.submissions && a.submissions.status !== "draft" && (a.email ?? "").trim()
  );

  // Which submission_author rows already have a participation certificate.
  const authorIds = authors.map((a) => a.id).filter(Boolean);
  const { data: certs } = authorIds.length
    ? await supabase
        .from("participation_certificates")
        .select("submission_author_id")
        .in("submission_author_id", authorIds)
    : { data: [] as any[] };
  const certSet = new Set(
    ((certs ?? []) as any[]).map((c) => c.submission_author_id)
  );
  // A row can earn a certificate unless the paper was dropped.
  const CERT_ELIGIBLE_EXCLUDE = ["draft", "rejected", "withdrawn"];

  // Accounts (sign-up) + membership + category live on profiles; match by email.
  const emails = [...new Set(authors.map((a) => (a.email ?? "").trim()).filter(Boolean))];
  const { data: profs } = emails.length
    ? await supabase
        .from("profiles")
        .select("email, glogift_member, participant_category, mobile")
        .in("email", emails)
    : { data: [] as any[] };
  const profByEmail = new Map(
    ((profs ?? []) as any[]).map((p) => [(p.email ?? "").trim().toLowerCase(), p])
  );

  // Group author rows into one row per person.
  const byEmail = new Map<string, any[]>();
  for (const a of authors) {
    const key = a.email.trim().toLowerCase();
    const arr = byEmail.get(key) ?? [];
    arr.push(a);
    byEmail.set(key, arr);
  }

  const now = new Date();
  const rows: PersonRow[] = [...byEmail.entries()].map(([key, list]) => {
    const prof = profByEmail.get(key) ?? null;
    const papers = list.map((a) => ({
      paperId: a.submissions.paper_id ?? "—",
      trackCode: a.submissions.tracks?.code ?? "—",
      role: (a.is_corresponding ? "Corresponding" : "Co-author") as
        | "Corresponding"
        | "Co-author",
      pathway: (a.submissions.submission_type === "full_paper_presentation"
        ? "B"
        : "A") as "A" | "B",
      title: a.submissions.title ?? "",
      trackName: a.submissions.tracks?.name ?? "—",
    }));
    const roles = [...new Set(papers.map((p) => p.role))];
    const trackCodes = [...new Set(papers.map((p) => p.trackCode))];
    const intention: PersonRow["intention"] = list.some(
      (a) => a.attendance === "attending"
    )
      ? "attending"
      : list.some((a) => a.attendance === "not_attending")
        ? "not"
        : "undeclared";
    const category =
      list.map((a) => a.participant_category).find(Boolean) ||
      prof?.participant_category ||
      null;
    const member = Boolean(prof?.glogift_member);
    // A delegate attends in one mode; prefer the mode declared on the paper they
    // lead (corresponding author), otherwise their first paper's mode.
    const modeSource =
      list.find((a) => a.is_corresponding) ?? list[0];
    const mode: string | null =
      modeSource?.submissions?.participation_mode || null;
    // Certificate state: eligible papers (not dropped) and how many already
    // carry a participation certificate.
    const certEligible = list.filter(
      (a) => !CERT_ELIGIBLE_EXCLUDE.includes(a.submissions?.status)
    );
    const certsGenerated = certEligible.filter((a) => certSet.has(a.id)).length;
    return {
      name: list.map((a) => a.full_name).find(Boolean) || key,
      mobile:
        (list.map((a) => a.mobile).find(Boolean) as string | undefined) ||
        prof?.mobile ||
        null,
      email: list[0].email.trim(),
      papers,
      trackCodes,
      roles,
      signedUp: Boolean(prof),
      registered: list.some((a) => a.registration_confirmed),
      paid: list.some((a) => a.registration_fee_paid),
      paidTier:
        (list.map((a) => a.registration_fee_tier).find(Boolean) as
          | "early"
          | "regular"
          | undefined) ?? null,
      attended: list.some((a) => a.attended_confirmed),
      certEligiblePapers: certEligible.length,
      certsGenerated,
      intention,
      category,
      member,
      mode,
      fee: computeRegistrationFee(category, member, now),
    };
  });

  const tracks = [
    ...new Map(
      authors
        .filter((a) => a.submissions.tracks?.code)
        .map((a) => [
          a.submissions.tracks.code,
          { code: a.submissions.tracks.code, name: a.submissions.tracks.name },
        ])
    ).values(),
  ].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <PageHeader
        title="Author Management"
        subtitle="Every author and co-author across all submissions — their papers and role, sign-up and registration status, intention to attend, and registration amount."
      />
      <AuthorManagement rows={rows} tracks={tracks} />
    </>
  );
}
