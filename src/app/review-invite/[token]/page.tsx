import { createAdminClient } from "@/lib/supabase/server";
import { ReviewInvite } from "@/components/ReviewInvite";

/**
 * Combined Accept / Decline landing for a review invitation (existing account),
 * reached from the in-app notification. Token-authorised, no sign-in required.
 */
export default async function ReviewInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: a } = await createAdminClient()
    .from("assignments")
    .select("status, submissions(title, paper_id)")
    .eq("invite_token", token)
    .maybeSingle();
  const row = a as { status?: string; submissions?: { title?: string; paper_id?: string } } | null;
  return (
    <ReviewInvite
      token={token}
      valid={!!row && row.status !== "declined"}
      paperId={row?.submissions?.paper_id ?? null}
      title={row?.submissions?.title ?? null}
    />
  );
}
