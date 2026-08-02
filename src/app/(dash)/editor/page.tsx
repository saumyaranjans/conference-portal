import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import { versionTag, type ReviewStats, type Submission, type Track } from "@/lib/types";
import { MyCertificates } from "@/components/MyCertificates";
import { listMyCertificates, certificatesReleased } from "@/lib/certificateAccess";
import {
  AcceptTrackButton,
  AcceptPaperButtons,
} from "@/components/PendingAcceptances";

export default async function EditorDashboard() {
  const profile = await requireRole("editor");
  const certificates = certificatesReleased()
    ? await listMyCertificates(profile.id)
    : [];
  const supabase = await createClient();

  // The tracks this person chairs define their whole queue.
  const { data: chairRows } = await supabase
    .from("track_editors")
    .select("track_id, status, tracks(id, name)")
    .eq("profile_id", profile.id);

  const chairAll = ((chairRows ?? []) as any[]);
  const pendingTracks = chairAll
    .filter((r) => r.status !== "accepted" && r.tracks)
    .map((r) => r.tracks) as Track[];
  const tracks = chairAll
    .filter((r) => r.status === "accepted")
    .map((r) => r.tracks)
    .filter(Boolean) as Track[];
  const trackIds = tracks.map((t) => t.id);

  const { data: subs } = trackIds.length
    ? await supabase
        .from("submissions")
        .select("*, tracks(name, code)")
        .in("track_id", trackIds)
        .neq("status", "draft")
        .order("submitted_at", { ascending: true })
    : { data: [] };

  // Conflict of interest: a chair does not handle a paper they authored.
  const submissions = ((subs ?? []) as (Submission & {
    tracks: { name: string } | null;
  })[]).filter((s) => s.author_id !== profile.id);

  const offered = submissions.filter(
    (s) =>
      (s as any).assigned_editor_id === profile.id &&
      (s as any).editor_accepted_at === null
  );

  const { data: statsRows } = submissions.length
    ? await supabase
        .from("submission_review_stats")
        .select("*")
        .in(
          "submission_id",
          submissions.map((s) => s.id)
        )
    : { data: [] };

  const stats = new Map<string, ReviewStats>(
    ((statsRows ?? []) as ReviewStats[]).map((r) => [r.submission_id, r])
  );

  const needsReviewers = submissions.filter(
    (s) =>
      ["submitted", "under_review"].includes(s.status) &&
      (stats.get(s.id)?.assigned_count ?? 0) < 3
  ).length;

  const readyToDecide = submissions.filter((s) => {
    const st = stats.get(s.id);
    return (
      s.status === "under_review" &&
      st &&
      st.completed_count >= 2 &&
      st.completed_count >= st.accepted_count
    );
  }).length;

  if (trackIds.length === 0) {
    return (
      <>
        <PageHeader title="Track Queue" />
        <MyCertificates certificates={certificates} types={["track_editor"]} />
        <EmptyState
          title="You are not assigned to a track yet"
          description="The Convener assigns track editors to tracks. Once assigned, submissions will appear here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Track Queue"
        subtitle={`Editing: ${((tracks ?? []) as Track[])
          .map((t) => t.name)
          .join(", ")}`}
      />

      <MyCertificates certificates={certificates} types={["track_editor"]} />

      {/* ---- Summary (on top) ---- */}
      <Section title="Summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="In queue" value={submissions.length} />
          <StatCard
            label="Need reviewers"
            value={needsReviewers}
            hint="Fewer than 3 assigned"
          />
          <StatCard
            label="Ready to decide"
            value={readyToDecide}
            hint="2+ reviews complete"
          />
          <StatCard
            label="Decided"
            value={
              submissions.filter((s) =>
                ["accepted", "rejected", "revisions_requested"].includes(s.status)
              ).length
            }
          />
        </div>
      </Section>

      {pendingTracks.length > 0 && (
        <Section title="Invitations to chair">
          <div className="card divide-y divide-slate-100">
            {pendingTracks.map((t) => (
              <div
                key={t.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The Convener has invited you to be Track Editor for this
                    track. Papers reach you one at a time after you accept.
                  </p>
                </div>
                <AcceptTrackButton trackId={t.id} trackName={t.name} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {offered.length > 0 && (
        <Section title="Papers awaiting your acceptance">
          <div className="card divide-y divide-slate-100">
            {offered.map((s) => (
              <div
                key={s.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {s.paper_id ? `${s.paper_id} — ` : ""}
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigned to you by the Convener. Accept to begin, or hand it
                    back for someone else.
                  </p>
                </div>
                <AcceptPaperButtons submissionId={s.id} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- Submissions ---- */}
      <Section title="Submissions">
        {submissions.length === 0 ? (
          <EmptyState
            title="No papers assigned to you yet"
            description="Chairing a track does not hand you its papers. Each one appears here when the Convener assigns it to you."
          />
        ) : (
          <DataTable
            headers={[
              "Paper ID",
              "Title",
              "Status",
              "Reviews",
              "Avg score",
              "Submitted",
              "",
            ]}
          >
            {submissions.map((s) => {
              const st = stats.get(s.id);
              const complete = st?.completed_count ?? 0;
              const assigned = st?.assigned_count ?? 0;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                    {s.paper_id ?? "—"}
                  </td>
                  <td className="td font-medium text-slate-900 max-w-sm">
                    {s.title}
                    <span className="block text-xs font-normal text-slate-400">
                      {versionTag(s.version)}
                    </span>
                  </td>
                  <td className="td">
                    <StatusBadge
                      status={s.status}
                      submissionType={(s as any).submission_type}
                      stage={(s as any).stage}
                    />
                  </td>
                  <td className="td">
                    <span
                      className={
                        assigned === 0
                          ? "text-red-600 font-medium"
                          : complete < 2
                            ? "text-amber-600"
                            : "text-emerald-700"
                      }
                    >
                      {complete}/{assigned}
                    </span>
                  </td>
                  <td className="td">{st?.avg_score ?? "—"}</td>
                  <td className="td text-slate-500">
                    {formatDate(s.submitted_at)}
                  </td>
                  <td className="td text-right">
                    <Link
                      href={`/editor/submissions/${s.id}`}
                      className="text-blue-700 hover:underline text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Section>
    </>
  );
}
