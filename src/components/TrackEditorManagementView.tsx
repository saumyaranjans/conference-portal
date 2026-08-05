import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import {
  TrackEditorManagement,
  type TrackEditorRow,
  type TEChairedTrack,
  type TEPaper,
} from "@/components/TrackEditorManagement";

const DROPPED = ["draft", "withdrawn"];

function decLabelV(d: string | null): string {
  if (!d) return "";
  return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Track Editor Management — a per-editor directory: the tracks they chair
 * (invited / accepted), the papers assigned to them (awaiting acceptance /
 * pending decision / decided), and workload counts.
 */
export async function TrackEditorManagementView() {
  const admin = createAdminClient();

  const { data: teData } = await admin
    .from("track_editors")
    .select(
      "id, status, track_id, profile_id, profile:profiles!track_editors_profile_id_fkey(id, full_name, email, mobile, affiliation, institution), tracks(code, name)"
    );

  const memberships = ((teData ?? []) as any[]).filter(
    (m) => m.profile && m.profile.email
  );
  const profileIds = [...new Set(memberships.map((m) => m.profile_id))];

  // Which editors already have a generated track-editor certificate.
  const { data: teCerts } = profileIds.length
    ? await admin
        .from("track_editor_certificates")
        .select("recipient_profile_id")
        .in("recipient_profile_id", profileIds)
    : { data: [] as any[] };
  const certSet = new Set(
    ((teCerts ?? []) as any[]).map((c) => c.recipient_profile_id)
  );

  const [{ data: papersData }, { data: decisionsData }] = await Promise.all([
    profileIds.length
      ? admin
          .from("submissions")
          .select(
            "id, paper_id, title, status, submitted_at, created_at, assigned_editor_id, editor_accepted_at, tracks(code, name), submission_authors(full_name, is_corresponding, author_order), assignments(status, reviewer_number, reviewer:profiles!assignments_reviewer_id_fkey(full_name), reviews(recommendation, is_submitted))"
          )
          .in("assigned_editor_id", profileIds)
      : Promise.resolve({ data: [] as any[] }),
    profileIds.length
      ? admin
          .from("decisions")
          .select("submission_id, decided_by, decision")
          .in("decided_by", profileIds)
          .eq("is_final", true)
          .is("superseded_at", null)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // decision (final, active) by submission id.
  const decisionBySub = new Map<string, string>();
  for (const d of (decisionsData ?? []) as any[]) {
    decisionBySub.set(d.submission_id, d.decision);
  }

  // Full decision + activity history per submission (ALL rows, incl. superseded),
  // with the decider's name resolved separately (decisions has two FKs to
  // profiles, so a bare embed would be ambiguous).
  const submissionIds = ((papersData ?? []) as any[]).map((s) => s.id);
  const { data: historyData } = submissionIds.length
    ? await admin
        .from("decisions")
        .select(
          "submission_id, decision, is_final, superseded_at, created_at, decided_by"
        )
        .in("submission_id", submissionIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };
  const deciderIds = [
    ...new Set(
      ((historyData ?? []) as any[]).map((d) => d.decided_by).filter(Boolean)
    ),
  ];
  const { data: deciderProfs } = deciderIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", deciderIds)
    : { data: [] as any[] };
  const deciderName = new Map(
    ((deciderProfs ?? []) as any[]).map((p) => [p.id, p.full_name])
  );
  const historyBySub = new Map<string, any[]>();
  for (const d of (historyData ?? []) as any[]) {
    const arr = historyBySub.get(d.submission_id) ?? [];
    arr.push(d);
    historyBySub.set(d.submission_id, arr);
  }

  // Papers grouped by the editor they are assigned to.
  const papersByEditor = new Map<string, any[]>();
  for (const s of (papersData ?? []) as any[]) {
    if (DROPPED.includes(s.status)) continue;
    const arr = papersByEditor.get(s.assigned_editor_id) ?? [];
    arr.push(s);
    papersByEditor.set(s.assigned_editor_id, arr);
  }

  // Group memberships per editor (by email).
  const byEmail = new Map<string, any[]>();
  for (const m of memberships) {
    const key = (m.profile.email ?? "").trim().toLowerCase();
    if (!key) continue;
    const arr = byEmail.get(key) ?? [];
    arr.push(m);
    byEmail.set(key, arr);
  }

  const rows: TrackEditorRow[] = [...byEmail.values()].map((items) => {
    const p = items[0].profile;
    const tracks: TEChairedTrack[] = items.map((m) => ({
      code: m.tracks?.code ?? "—",
      name: m.tracks?.name ?? "—",
      status: m.status === "accepted" ? "accepted" : "invited",
    }));
    const assigned = papersByEditor.get(p.id) ?? [];
    const papers: TEPaper[] = assigned.map((s) => {
      const decided = decisionBySub.has(s.id);
      const authors = [...(s.submission_authors ?? [])].sort(
        (a: any, b: any) => (a.author_order ?? 0) - (b.author_order ?? 0)
      );
      const corresponding =
        authors.find((a: any) => a.is_corresponding)?.full_name ?? null;
      const coAuthors = authors
        .filter((a: any) => !a.is_corresponding)
        .map((a: any) => a.full_name)
        .filter(Boolean);
      const reviewers = ((s.assignments ?? []) as any[])
        .filter((a) => a.reviewer)
        .map((a) => {
          const rev = Array.isArray(a.reviews) ? a.reviews[0] : a.reviews;
          return {
            name: a.reviewer.full_name as string,
            number: (a.reviewer_number ?? null) as number | null,
            status: a.status as string,
            recommendation: (rev?.is_submitted
              ? rev.recommendation ?? null
              : null) as string | null,
          };
        });
      const activity: { label: string; at: string | null }[] = [];
      if (s.submitted_at || s.created_at)
        activity.push({ label: "Submitted", at: s.submitted_at ?? s.created_at });
      if (s.editor_accepted_at)
        activity.push({
          label: "Track Editor accepted the paper",
          at: s.editor_accepted_at,
        });
      for (const d of historyBySub.get(s.id) ?? []) {
        const who = deciderName.get(d.decided_by) ?? "Track Editor";
        const tag = d.superseded_at
          ? " (superseded)"
          : d.is_final
            ? " (final)"
            : "";
        activity.push({
          label: `Decision — ${decLabelV(d.decision)} by ${who}${tag}`,
          at: d.created_at,
        });
      }
      activity.sort(
        (a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
      );
      return {
        paperId: s.paper_id ?? "—",
        trackCode: s.tracks?.code ?? "—",
        trackName: s.tracks?.name ?? "—",
        title: s.title ?? "",
        accepted: !!s.editor_accepted_at,
        decided,
        decision: decisionBySub.get(s.id) ?? null,
        corresponding,
        coAuthors,
        reviewers,
        activity,
      };
    });
    const counts = {
      tracksAccepted: tracks.filter((t) => t.status === "accepted").length,
      tracksInvited: tracks.filter((t) => t.status === "invited").length,
      papersAssigned: papers.length,
      awaitingAcceptance: papers.filter((x) => !x.accepted).length,
      decisionsTaken: papers.filter((x) => x.decided).length,
      pendingDecisions: papers.filter((x) => x.accepted && !x.decided).length,
    };
    return {
      profileId: p.id,
      name: p.full_name || p.email,
      mobile: p.mobile || null,
      email: p.email,
      affiliation: p.affiliation || p.institution || null,
      certGenerated: certSet.has(p.id),
      tracks,
      papers,
      trackCodes: [...new Set(tracks.map((t) => t.code))].filter((c) => c !== "—"),
      counts,
    };
  });

  const tracks = [
    ...new Map(
      memberships
        .filter((m) => m.tracks?.code)
        .map((m) => [m.tracks.code, { code: m.tracks.code, name: m.tracks.name }])
    ).values(),
  ].sort((a, b) => a.code.localeCompare(b.code));

  // Convener account(s) — the "Handling Convener" and Remind-Convener target.
  const { data: convData } = await admin
    .from("profiles")
    .select("id, full_name")
    .contains("roles", ["chief"])
    .order("full_name");
  const conveners = ((convData ?? []) as any[]).map((c) => ({
    id: c.id as string,
    full_name: (c.full_name ?? null) as string | null,
  }));

  return (
    <>
      <PageHeader
        title="Track Editor Management"
        subtitle="Every Track Editor — the tracks they chair, the papers assigned to them, and their decision workload."
      />
      <TrackEditorManagement rows={rows} tracks={tracks} conveners={conveners} />
    </>
  );
}
