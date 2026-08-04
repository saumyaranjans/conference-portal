import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { SubmissionAnalytics } from "@/components/SubmissionAnalytics";
import { EmptyState, PageHeader } from "@/components/ui/Primitives";
import type { Submission } from "@/lib/types";

/**
 * Conference-wide submission analytics, surfaced on the Track Editor dashboard
 * so editors see abstract / full-paper progress across all tracks (not just
 * their own). Uses the admin client for the full picture, like the Convener's.
 */
export default async function EditorSubmissionAnalyticsPage() {
  await requireRole("editor");
  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("submissions")
    .select("*, tracks(name, code)")
    .neq("status", "draft")
    .order("updated_at", { ascending: false });

  const submissions = (subs ?? []) as (Submission & { tracks: any })[];

  return (
    <>
      <PageHeader
        title="Submission Analytics"
        subtitle="Abstract and full-paper progress across all tracks."
      />
      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Analytics will appear here as authors submit."
        />
      ) : (
        <SubmissionAnalytics rows={submissions as any} showChoices />
      )}
    </>
  );
}
