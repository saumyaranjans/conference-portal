import { createAdminClient } from "@/lib/supabase/server";

/**
 * Write a confirmed online payment through to the Editorial Office register.
 *
 * The desk's three toggles on submission_authors — registered / fee paid /
 * which tier — predate online payment and were the only record of a delegate
 * having paid. Now the gateway can answer the same question authoritatively,
 * so a positive handshake fills them in and staff need not key anything.
 *
 * The manual toggles stay exactly where they are. They remain the route for
 * money that never touches the gateway (NEFT, cheque, a waiver, an on-desk
 * cash payment) and the correction path when something needs overriding, so
 * this automates the common case without removing the fallback.
 *
 * Matching is by profile_id AND by email. A co-author listed on a paper before
 * they ever created an account has a submission_authors row carrying only
 * their email; if they later register, that row is still theirs and should
 * reflect the payment.
 *
 * Runs under the service-role key, which is what
 * protect_submission_author_office_fields() admits — a delegate cannot reach
 * these columns, and that stays true.
 */
export async function syncPaidRegistrationToRegister(
  registrationId: string
): Promise<{ rowsUpdated: number }> {
  const admin = createAdminClient();

  const { data: reg } = await admin
    .from("registrations")
    .select("profile_id, fee_tier, status, paid_at")
    .eq("id", registrationId)
    .maybeSingle();

  // Only a paid registration writes through. Anything else is a no-op rather
  // than an error: the callback calls this on every settled order.
  if (!reg || (reg as any).status !== "paid") return { rowsUpdated: 0 };

  const profileId = (reg as any).profile_id as string;
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();

  const email = ((profile as any)?.email ?? "").trim().toLowerCase();
  const paidAt = (reg as any).paid_at ?? new Date().toISOString();

  const office = {
    registration_confirmed: true,
    registration_confirmed_at: paidAt,
    // Left null deliberately: no member of staff confirmed this, the bank did.
    // A name here would misattribute an automated write to a person.
    registration_confirmed_by: null,
    registration_fee_paid: true,
    registration_fee_paid_at: paidAt,
    registration_fee_paid_by: null,
    registration_fee_tier: (reg as any).fee_tier,
  };

  const { data: byProfile } = await admin
    .from("submission_authors")
    .update(office)
    .eq("profile_id", profileId)
    .select("id");

  let rows = ((byProfile as any[]) ?? []).length;

  if (email) {
    const { data: byEmail } = await admin
      .from("submission_authors")
      .update(office)
      .is("profile_id", null)
      .ilike("email", email)
      .select("id");
    rows += ((byEmail as any[]) ?? []).length;
  }

  return { rowsUpdated: rows };
}
