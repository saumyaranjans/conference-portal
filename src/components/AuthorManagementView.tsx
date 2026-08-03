import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import { AuthorManagement, type AuthorRow } from "@/components/AuthorManagement";
import { computeRegistrationFee } from "@/lib/registrationFees";

/**
 * Author Management — a per-paper list of the corresponding author + co-authors,
 * their participant category, GLOGIFT membership and computed registration fee.
 * Shared by the Convener and Editorial Office. Client-side track + alphabetical
 * filtering lives in <AuthorManagement>.
 */
export async function AuthorManagementView() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("submissions")
    .select(
      "id, paper_id, title, tracks(name, code), submission_authors(full_name, is_corresponding, author_order, participant_category, profile_id)"
    )
    .neq("status", "draft")
    .order("paper_id");

  const subs = (data ?? []) as any[];

  // Resolve GLOGIFT membership + category from the corresponding author's profile.
  const corrProfileIds = [
    ...new Set(
      subs
        .map((s) => {
          const a = (s.submission_authors ?? []) as any[];
          const corr = a.find((x) => x.is_corresponding) ?? a[0];
          return corr?.profile_id;
        })
        .filter(Boolean)
    ),
  ];
  const { data: profs } = corrProfileIds.length
    ? await supabase
        .from("profiles")
        .select("id, glogift_member, participant_category")
        .in("id", corrProfileIds)
    : { data: [] as any[] };
  const profMap = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));

  const now = new Date();
  const rows: AuthorRow[] = subs.map((s) => {
    const authors = ((s.submission_authors ?? []) as any[])
      .slice()
      .sort((a, b) => (a.author_order ?? 99) - (b.author_order ?? 99));
    const corr = authors.find((a) => a.is_corresponding) ?? authors[0] ?? {};
    const coAuthors = authors.filter((a) => a !== corr).map((a) => a.full_name);
    const prof = corr.profile_id ? profMap.get(corr.profile_id) : null;
    const category = corr.participant_category || prof?.participant_category || null;
    const member = Boolean(prof?.glogift_member);
    return {
      paperId: s.paper_id ?? null,
      title: s.title,
      track: s.tracks?.name ?? "—",
      trackCode: s.tracks?.code ?? "—",
      author: corr.full_name ?? "—",
      category,
      coAuthors,
      member,
      fee: computeRegistrationFee(category, member, now),
    };
  });

  const tracks = [
    ...new Map(
      subs
        .filter((s) => s.tracks?.code)
        .map((s) => [s.tracks.code, { code: s.tracks.code, name: s.tracks.name }])
    ).values(),
  ].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <PageHeader
        title="Author Management"
        subtitle="Every submission's author and co-authors, participant category, GLOGIFT membership and registration fee. Filter by track or search; sort alphabetically."
      />
      <AuthorManagement rows={rows} tracks={tracks} />
    </>
  );
}
