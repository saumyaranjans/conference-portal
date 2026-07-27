import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmissionAnalytics } from "@/components/SubmissionAnalytics";
import { EmptyState, PageHeader } from "@/components/ui/Primitives";
import type { Submission, Track } from "@/lib/types";

export default async function EditorAnalyticsPage() {
  const profile = await requireRole("editor");
  const supabase = await createClient();

  // Scope to the tracks this person chairs.
  const { data: chairRows } = await supabase
    .from("track_editors")
    .select("track_id, tracks(id, name)")
    .eq("profile_id", profile.id);

  const tracks = ((chairRows ?? []) as any[])
    .map((r) => r.tracks)
    .filter(Boolean) as Track[];
  const trackIds = tracks.map((t) => t.id);

  const { data: subs } = trackIds.length
    ? await supabase
        .from("submissions")
        .select("*, tracks(name, code)")
        .in("track_id", trackIds)
        .neq("status", "draft")
    : { data: [] };

  // Conflict of interest: exclude papers the chair authored.
  const submissions = ((subs ?? []) as (Submission & { tracks: any })[]).filter(
    (s) => s.author_id !== profile.id
  );

  return (
    <>
      <PageHeader
        title="Track Analytics"
        subtitle={
          tracks.length
            ? `Abstract and full-paper progress for: ${tracks
                .map((t) => t.name)
                .join(", ")}`
            : undefined
        }
      />
      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Analytics will appear here as papers are submitted to your track."
        />
      ) : (
        <SubmissionAnalytics rows={submissions as any} />
      )}
    </>
  );
}
