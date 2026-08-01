import { createAdminClient } from "@/lib/supabase/server";
import { ReviewInviteAgree } from "@/components/ReviewInviteAgree";

/** Accept landing for a reviewer invitation email (existing reviewer, token-authorised, no sign-in). */
export default async function ReviewInviteAgreePage({
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
    <ReviewInviteAgree
      token={token}
      valid={!!row && row.status !== "declined"}
      paperId={row?.submissions?.paper_id ?? null}
      title={row?.submissions?.title ?? null}
    />
  );
}
