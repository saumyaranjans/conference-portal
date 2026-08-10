"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireConvenerManage } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { giftMemberCouponEmail } from "@/lib/emailTemplates";
import { issueCouponFor } from "@/lib/coupons";
import type { ActionResult } from "@/lib/actions";

/**
 * Verify a delegate's GIFT Society membership, and issue + email their coupon.
 *
 * Open to the Convener AND the Editorial Office ("chief", "admin") — both run
 * the membership desk. requireConvenerManage additionally blocks a view-only
 * Convener, who can see the list but not act on it.
 *
 * Verification and issuing are one action deliberately. A verified membership
 * with no coupon is worth nothing to the delegate, and leaving the two as
 * separate buttons is how someone ends up verified but never told.
 */
export async function verifyGiftMembership(
  formData: FormData
): Promise<ActionResult> {
  const staff = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) return { ok: false, message: "No delegate specified." };

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email, glogift_member, glogift_membership_no, glogift_membership_verified")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, message: "That delegate no longer exists." };

  const row = profile as any;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      glogift_membership_verified: true,
      glogift_membership_verified_at: new Date().toISOString(),
      glogift_membership_verified_by: staff.id,
    })
    .eq("id", profileId);
  if (updateError) return { ok: false, message: updateError.message };

  const { coupon, created, error } = await issueCouponFor(profileId, staff.id);
  if (!coupon) {
    return {
      ok: false,
      message: `Membership verified, but the coupon could not be issued: ${error ?? "unknown error"}`,
    };
  }

  // Send only for a NEWLY minted coupon, or one whose earlier send failed.
  // Re-verifying somebody must not spam them with a code they already have.
  const needsEmail = created || !coupon.emailed_at;
  if (needsEmail && emailConfigured() && row.email) {
    const letter = giftMemberCouponEmail({
      name: row.full_name,
      code: coupon.code,
      discountPercent: coupon.discount_percent,
      membershipNo: row.glogift_membership_no,
    });
    const { sent } = await sendEmail({
      to: row.email,
      subject: letter.subject,
      text: letter.body,
      kind: "gift_member_coupon",
      sentBy: staff.id,
    });
    if (sent) {
      await admin
        .from("registration_coupons")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", coupon.id);
    } else {
      return {
        ok: true,
        message: `Verified and coupon ${coupon.code} issued, but the email could not be sent. Please pass the code on manually.`,
      };
    }
  }

  revalidatePath("/chief/gift-members");
  revalidatePath("/admin/gift-members");

  return {
    ok: true,
    message: created
      ? `Verified. Coupon ${coupon.code} issued and emailed.`
      : `Already verified — ${row.full_name} holds coupon ${coupon.code}.`,
  };
}

/**
 * Withdraw a verification: clears the flag and revokes any unused coupon.
 *
 * A REDEEMED coupon is left alone. The discount has already been taken and the
 * registration priced against it; revoking it retrospectively would make the
 * payment record inconsistent with what was charged.
 */
export async function revokeGiftMembership(
  formData: FormData
): Promise<ActionResult> {
  const staff = await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) return { ok: false, message: "No delegate specified." };

  await admin
    .from("profiles")
    .update({
      glogift_membership_verified: false,
      glogift_membership_verified_at: null,
      glogift_membership_verified_by: staff.id,
    })
    .eq("id", profileId);

  const { data: revoked } = await admin
    .from("registration_coupons")
    .update({ status: "revoked" })
    .eq("profile_id", profileId)
    .eq("status", "active")
    .select("code");

  revalidatePath("/chief/gift-members");
  revalidatePath("/admin/gift-members");

  const codes = ((revoked as any[]) ?? []).map((r) => r.code);
  return {
    ok: true,
    message: codes.length
      ? `Verification withdrawn and coupon ${codes.join(", ")} revoked.`
      : "Verification withdrawn.",
  };
}
