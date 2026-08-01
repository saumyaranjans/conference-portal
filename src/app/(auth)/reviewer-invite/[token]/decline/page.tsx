import { createAdminClient } from "@/lib/supabase/server";
import { ReviewerInviteDecline } from "@/components/ReviewerInviteDecline";

/** Decline landing for a NEW-person reviewer invitation (token-authorised, no sign-in). */
export default async function ReviewerInviteDeclinePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: inv } = await createAdminClient()
    .from("reviewer_invitations")
    .select("status, submissions(title, paper_id)")
    .eq("token", token)
    .maybeSingle();
  const row = inv as { status?: string; submissions?: { title?: string; paper_id?: string } } | null;
  return (
    <ReviewerInviteDecline
      token={token}
      valid={!!row && row.status !== "accepted"}
      paperId={row?.submissions?.paper_id ?? null}
      title={row?.submissions?.title ?? null}
    />
  );
}
