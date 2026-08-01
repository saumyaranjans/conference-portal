import { createAdminClient } from "@/lib/supabase/server";
import { PaperAssignmentReject } from "@/components/PaperAssignmentReject";

/** Reject landing for a paper-assignment email (token-authorised, no sign-in). */
export default async function PaperAssignmentRejectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: sub } = await createAdminClient()
    .from("submissions")
    .select("paper_id, title, assigned_editor_id")
    .eq("editor_assignment_token", token)
    .maybeSingle();
  const s = sub as { paper_id?: string; title?: string; assigned_editor_id?: string } | null;
  return (
    <PaperAssignmentReject
      token={token}
      valid={!!s && !!s.assigned_editor_id}
      paperId={s?.paper_id ?? null}
      title={s?.title ?? null}
    />
  );
}
