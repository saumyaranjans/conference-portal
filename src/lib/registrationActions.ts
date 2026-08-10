"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { computeRegistrationFee, GST_RATE } from "@/lib/registrationFees";
import { REFUND_POLICY_VERSION } from "@/lib/refundPolicy";
import { paymentProvider, paymentsOpen } from "@/lib/payments";
// Coupons are validated here but redeemed in the payment callback: a delegate
// who abandons checkout must not lose their discount to an unpaid attempt.
import { validateCoupon, type CouponRow } from "@/lib/coupons";
import {
  PARTICIPATION_MODES,
  PRESENTING_STATUSES,
  isPresentable,
} from "@/lib/types";
import type { ActionResult } from "@/lib/actions";
import type { Checkout } from "@/lib/payments";

export type RegistrationOutcome = ActionResult & {
  /** Present when the delegate should be handed to the gateway. */
  checkout?: Checkout;
};

/** A human-quotable order reference: GLOGIFT27-XXXXXXXX. */
function newOrderId(): string {
  return `GLOGIFT27-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * The papers this profile may register against (as author or co-author).
 *
 * Carries the pathway, the participation mode and the track alongside the
 * title: registration does not re-ask for any of them, it shows back what the
 * submission already recorded.
 */
const PRESENTABLE_FIELDS =
  "id, paper_id, title, status, submission_type, participation_mode, tracks(code, name)";

export async function myPresentableSubmissions(profileId: string) {
  const admin = createAdminClient();

  const { data: own } = await admin
    .from("submissions")
    .select(PRESENTABLE_FIELDS)
    .eq("author_id", profileId)
    .in("status", [...PRESENTING_STATUSES]);

  const { data: co } = await admin
    .from("submission_authors")
    .select(`submissions(${PRESENTABLE_FIELDS})`)
    .eq("profile_id", profileId);

  const rows = [
    ...((own as any[]) ?? []),
    ...(((co as any[]) ?? [])
      .map((r) => r.submissions)
      .filter((s) => s && isPresentable(s.status))),
  ];

  // A co-author who is also the corresponding author appears twice.
  const seen = new Set<string>();
  return rows.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

/** The delegate's unused coupon, if staff have verified their membership. */
export async function myActiveCoupon(profileId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("registration_coupons")
    .select("code, discount_percent")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();
  return (data as { code: string; discount_percent: number } | null) ?? null;
}

/**
 * The delegate's current registration, if any. Latest first.
 *
 * Carries the linked paper so the paid summary can show what was registered
 * for, not just what it cost.
 */
export async function myRegistration(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      "*, payment_orders(*), " +
        "submissions(paper_id, title, submission_type, participation_mode, tracks(code, name))"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any;
}

/**
 * Create a registration and, when the gateway is live, an order to pay it.
 *
 * The amount is computed HERE, from the signed-in profile, and never read from
 * the form. The page shows the delegate a figure for information; this action
 * decides what is actually charged.
 */
export async function submitRegistration(
  formData: FormData
): Promise<RegistrationOutcome> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  // --- consent -----------------------------------------------------------
  if (String(formData.get("refund_policy") ?? "") !== "1") {
    return {
      ok: false,
      message: "Please accept the refund policy before continuing.",
    };
  }

  // --- already paid? -----------------------------------------------------
  const { data: paid } = await admin
    .from("registrations")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("status", "paid")
    .maybeSingle();
  if (paid) {
    return {
      ok: false,
      message: "You are already registered. Only one registration per delegate is needed.",
    };
  }

  // --- the paper, if they named one --------------------------------------
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  let linkedSubmission: string | null = null;
  let linkedMode = "";
  if (submissionId) {
    const eligible = await myPresentableSubmissions(profile.id);
    const paper = (eligible as any[]).find((s) => s.id === submissionId);
    if (!paper) {
      return {
        ok: false,
        message: "That paper is not one you can register against.",
      };
    }
    linkedSubmission = submissionId;
    linkedMode = String(paper.participation_mode ?? "");
  }

  // --- participation mode ------------------------------------------------
  //
  // Taken from the submission, not the form, whenever a paper is linked. The
  // author chose virtual or on-site when they submitted and were told it
  // cannot be changed afterwards, so registration shows that choice back
  // rather than re-asking — and a form field claiming otherwise is ignored.
  // Only a delegate registering without a paper picks a mode here.
  const mode = linkedMode || String(formData.get("participation_mode") ?? "");
  if (!PARTICIPATION_MODES.some((m) => m.value === mode)) {
    return {
      ok: false,
      message: linkedSubmission
        ? "That paper has no participation mode recorded. Please contact the Editorial Office."
        : "Please choose how you will attend.",
    };
  }

  // --- the coupon, if they typed one -------------------------------------
  //
  // This is the ONLY route to the GIFT discount. profile.glogift_member is the
  // delegate's own unverified claim and is deliberately NOT consulted here:
  // it is editable from their profile, so honouring it would hand 20% off to
  // anyone who ticked a box. Staff verify the claim, verification mints the
  // coupon, and the coupon moves the price.
  const rawCoupon = String(formData.get("coupon_code") ?? "").trim();
  let coupon: CouponRow | null = null;

  if (rawCoupon) {
    const check = await validateCoupon(rawCoupon, profile.id);
    if (!check.ok) return { ok: false, message: check.reason };
    coupon = check.coupon;
  }

  // --- the money ---------------------------------------------------------
  const fee = computeRegistrationFee(
    profile.participant_category,
    !!coupon,
    undefined,
    profile.country
  );
  if (!fee.known) {
    return {
      ok: false,
      message:
        "We could not work out your registration fee, because your profile has " +
        "no participant category. Please set it on your profile and try again.",
    };
  }

  const { data: conference } = await admin
    .from("conferences")
    .select("id")
    .eq("acronym", "GLOGIFT")
    .maybeSingle();

  const { data: registration, error } = await admin
    .from("registrations")
    .insert({
      profile_id: profile.id,
      conference_id: (conference as any)?.id ?? null,
      submission_id: linkedSubmission,
      participant_category: profile.participant_category ?? "",
      country: profile.country ?? "",
      // "Member" on the registration record means "a verified coupon was
      // applied", not "claimed membership at sign-up".
      is_member: !!coupon,
      coupon_id: coupon?.id ?? null,
      coupon_code: coupon?.code ?? "",
      fee_tier: fee.tier,
      currency: fee.currency,
      base_amount: fee.base,
      discount_amount: fee.discount,
      amount: fee.amount,
      tax_rate: GST_RATE,
      tax_amount: fee.tax,
      total_amount: fee.total,
      participation_mode: mode,
      status: "pending",
      refund_policy_accepted_at: new Date().toISOString(),
      refund_policy_version: REFUND_POLICY_VERSION,
    })
    .select("id, amount, tax_amount, total_amount, currency")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/registration");

  // --- hand off to the bank, if it is ready ------------------------------
  if (!paymentsOpen()) {
    return {
      ok: true,
      message:
        "Your registration is saved. Online payment with ICICI Bank is not " +
        "open yet — we will email you the payment link as soon as it is live.",
    };
  }

  const provider = paymentProvider()!;
  const orderId = newOrderId();

  // The gateway collects the GST-INCLUSIVE figure. `amount` is the fee before
  // tax and must never be what is sent to the bank.
  const charge = (registration as any).total_amount as number;

  const { error: orderError } = await admin.from("payment_orders").insert({
    registration_id: (registration as any).id,
    order_id: orderId,
    provider: provider.id,
    amount: charge,
    currency: (registration as any).currency,
    status: "created",
  });
  if (orderError) return { ok: false, message: orderError.message };

  try {
    const checkout = await provider.createCheckout({
      orderId,
      amount: charge,
      currency: (registration as any).currency,
      description: `GLOGIFT 2027 registration — ${profile.full_name}`,
      payer: {
        name: profile.full_name ?? "",
        email: profile.email ?? "",
        mobile: (profile as any).mobile ?? "",
        country: profile.country ?? "",
      },
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/payments/callback`,
    });
    return { ok: true, checkout };
  } catch (e) {
    // The registration row stays — the delegate's details are not lost just
    // because the gateway is unreachable.
    return {
      ok: true,
      message:
        "Your registration is saved, but the payment gateway could not be " +
        "reached. Please try paying again shortly. " +
        (e instanceof Error ? e.message : ""),
    };
  }
}
