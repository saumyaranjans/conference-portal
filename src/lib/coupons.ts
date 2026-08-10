import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";

/**
 * GIFT Society discount coupons.
 *
 * A coupon is the ONLY thing that moves the registration price. The
 * self-declared `glogift_member` flag on a profile is a claim, not an
 * entitlement — staff verify it, verification mints a coupon, and the coupon
 * is what checkout honours. That matches the published fee table, which has
 * always said the discount applies "only by applying the coupon code shared by
 * the conference organizers or the GIFT Society".
 */

/**
 * Unambiguous alphabet: no O/0, I/1, S/5, B/8. Coupons get read off a phone
 * screen and typed by hand, and a code that cannot be misread is worth more
 * than the handful of extra combinations.
 */
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXYZ2346789";

function randomCode(): string {
  const pick = () => ALPHABET[randomInt(ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `GIFT-${block()}-${block()}`;
}

export type CouponRow = {
  id: string;
  code: string;
  profile_id: string;
  discount_percent: number;
  status: "active" | "redeemed" | "revoked";
  issued_at: string;
  emailed_at: string | null;
  redeemed_at: string | null;
};

/**
 * Mint a coupon for a profile, or return the active one they already hold.
 *
 * Idempotent by design: verification and the coupon email are one staff
 * action, and a retry after a failed send must not produce a second code. The
 * partial unique index on (profile_id) where status = 'active' is the backstop
 * if two requests race.
 */
export async function issueCouponFor(
  profileId: string,
  issuedBy: string | null
): Promise<{ coupon: CouponRow | null; created: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("registration_coupons")
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return { coupon: existing as CouponRow, created: false };

  // Retry on the astronomically unlikely code collision rather than failing
  // the staff action for it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("registration_coupons")
      .insert({
        code: randomCode(),
        profile_id: profileId,
        discount_percent: MEMBER_DISCOUNT_PERCENT,
        status: "active",
        issued_by: issuedBy,
      })
      .select("*")
      .single();

    if (!error) return { coupon: data as CouponRow, created: true };
    // 23505 = unique violation: either the code clashed (retry) or another
    // request just minted the active coupon (fetch and return it).
    if (error.code !== "23505") return { coupon: null, created: false, error: error.message };

    const { data: raced } = await admin
      .from("registration_coupons")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .maybeSingle();
    if (raced) return { coupon: raced as CouponRow, created: false };
  }

  return { coupon: null, created: false, error: "Could not generate a unique coupon code." };
}

export type CouponCheck =
  | { ok: true; coupon: CouponRow }
  | { ok: false; reason: string };

/**
 * Is this code usable by this person, right now?
 *
 * Bound to the profile deliberately: a coupon forwarded to a colleague is
 * refused rather than quietly discounting someone who is not a member.
 */
export async function validateCoupon(
  rawCode: string,
  profileId: string
): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a coupon code." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("registration_coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!data) return { ok: false, reason: "That coupon code was not recognised." };

  const coupon = data as CouponRow;
  if (coupon.profile_id !== profileId)
    return {
      ok: false,
      reason: "That coupon was issued to a different delegate and cannot be used on this registration.",
    };
  if (coupon.status === "redeemed")
    return { ok: false, reason: "That coupon has already been used." };
  if (coupon.status === "revoked")
    return { ok: false, reason: "That coupon is no longer valid. Please contact the Editorial Office." };

  return { ok: true, coupon };
}

/**
 * Burn a coupon against a registration.
 *
 * Conditional on status still being 'active', so two checkouts racing the same
 * code cannot both take the discount — the second update matches no row.
 */
export async function redeemCoupon(
  couponId: string,
  registrationId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("registration_coupons")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      registration_id: registrationId,
    })
    .eq("id", couponId)
    .eq("status", "active")
    .select("id");

  return ((data as any[]) ?? []).length > 0;
}
