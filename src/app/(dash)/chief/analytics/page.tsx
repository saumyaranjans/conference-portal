import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmissionAnalytics } from "@/components/SubmissionAnalytics";
import { EmptyState, PageHeader } from "@/components/ui/Primitives";
import type { Submission } from "@/lib/types";

export default async function ChiefAnalyticsPage() {
  await requireRole("chief");
  const supabase = await createClient();

  const { data: subs } = await supabase
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
