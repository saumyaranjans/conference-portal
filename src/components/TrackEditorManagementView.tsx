import { createAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import {
  TrackEditorManagement,
  type TrackEditorRow,
  type TEChairedTrack,
  type TEPaper,
} from "@/components/TrackEditorManagement";

const DROPPED = ["draft", "withdrawn"];

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
            "id, paper_id, status, assigned_editor_id, editor_accepted_at, tracks(code, name)"
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
      return {
        paperId: s.paper_id ?? "—",
        trackCode: s.tracks?.code ?? "—",
        accepted: !!s.editor_accepted_at,
        decided,
        decision: decisionBySub.get(s.id) ?? null,
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

  return (
    <>
      <PageHeader
        title="Track Editor Management"
        subtitle="Every Track Editor — the tracks they chair, the papers assigned to them, and their decision workload."
      />
      <TrackEditorManagement rows={rows} tracks={tracks} />
    </>
  );
}
