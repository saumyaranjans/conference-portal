import { createAdminClient } from "@/lib/supabase/server";
import { redeemCoupon } from "@/lib/coupons";
import { syncPaidRegistrationToRegister } from "@/lib/registrationSync";

/**
 * Everything that must happen when a registration becomes paid, in one place.
 *
 * There are two ways in: the gateway callback settling it, and the Convener
 * confirming it by hand against the bank's record. They must leave identical
 * rows behind — a delegate whose payment was recovered manually is exactly as
 * registered as one whose callback arrived, and their invoice must look the
 * same. Two copies of this sequence would drift, and the half that drifted
 * would be the rare one nobody exercises.
 *
 * Idempotent: settling an already-paid registration changes nothing and
 * reports it, so a repeat callback and an over-eager manual confirmation are
 * both harmless.
 */
export async function settleRegistration(
  registrationId: string,
  manual?: {
    confirmedBy: string;
    bankReference: string;
    note: string;
  }
): Promise<{ ok: boolean; alreadyPaid: boolean; message?: string }> {
  const admin = createAdminClient();

  const { data: existing, error: readError } = await admin
    .from("registrations")
    .select("id, status, coupon_id, paid_at")
    .eq("id", registrationId)
    .maybeSingle();

  if (readError) {
    console.error("[settle] read failed for %s: %s", registrationId, readError.message);
    return { ok: false, alreadyPaid: false, message: readError.message };
  }
  if (!existing) {
    return { ok: false, alreadyPaid: false, message: "Registration not found." };
  }
  if ((existing as any).status === "paid") {
    return { ok: true, alreadyPaid: true };
  }

  const paidAt = new Date().toISOString();

  // paid_at is set HERE and not only in the callback: it was previously left
  // null on settlement, so the dashboard said "paid" with no date and the
  // invoice fell back to the created date.
  const patch: Record<string, unknown> = { status: "paid", paid_at: paidAt };
  if (manual) {
    patch.manual_confirmed_by = manual.confirmedBy;
    patch.manual_confirmed_at = paidAt;
    patch.bank_reference = manual.bankReference;
    patch.manual_note = manual.note;
  }

  const { error: updateError } = await admin
    .from("registrations")
    .update(patch)
    .eq("id", registrationId);

  if (updateError) {
    console.error("[settle] update failed for %s: %s", registrationId, updateError.message);
    return { ok: false, alreadyPaid: false, message: updateError.message };
  }

  // Burn the coupon only once the payment has actually settled, so an
  // abandoned attempt does not cost the delegate their discount.
  if ((existing as any).coupon_id) {
    try {
      await redeemCoupon((existing as any).coupon_id, registrationId);
    } catch (e) {
      // The money is taken and the place is booked either way; a coupon that
      // failed to burn is a staff cleanup, not a reason to fail the payment.
      console.error("[settle] coupon redeem failed for %s: %s", registrationId, String(e));
    }
  }

  // Fill in the Editorial Office register. Same reasoning: never lose a
  // settled payment because a downstream convenience failed.
  try {
    await syncPaidRegistrationToRegister(registrationId);
  } catch (e) {
    console.error("[settle] register sync failed for %s: %s", registrationId, String(e));
  }

  return { ok: true, alreadyPaid: false };
}
