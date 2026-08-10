"use server";

import { revalidatePath } from "next/cache";
import { requireConvenerManage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { settleRegistration } from "@/lib/registrationSettle";
import type { ActionResult } from "@/lib/actions";

/**
 * Registrations the bank may have taken money for while the portal still shows
 * them unpaid.
 *
 * Every one of these is a delegate who may be out of pocket with nothing to
 * show for it, so the list is deliberately wide: `pending` covers a lost
 * callback or a closed tab, and `failed` covers the case the callback refused
 * to settle — an amount mismatch, or a signature that would not verify — where
 * the money can still have moved.
 */
export async function pendingPayments() {
  // The roles MUST be named. requireConvenerManage() forwards them to
  // requireRole(), and `[].some(...)` is false — calling it bare redirects
  // everyone to /denied, including the Convener whose page this is.
  await requireConvenerManage("chief", "admin");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("registrations")
    .select(
      "id, status, currency, total_amount, amount, created_at, participant_category, " +
        "profiles(full_name, email), payment_orders(order_id, status, provider_ref)"
    )
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[recovery] pendingPayments failed: %s", error.message);
    return [];
  }
  return (data as any[]) ?? [];
}

/**
 * Confirm, by hand, a payment the bank took but the portal never settled.
 *
 * Convener-with-manage-rights only, and never a bare "mark as paid": the bank
 * reference is required, so a confirmation always cites the record it was
 * checked against and can be reconciled later by someone who was not in the
 * room. Who confirmed it and when are stored alongside, because a registration
 * settled by a human should never be indistinguishable from one the gateway
 * settled itself.
 *
 * The actual settling is shared with the callback, so a recovered payment
 * redeems its coupon, writes through to the Editorial Office register and
 * produces the same invoice as any other.
 */
export async function confirmPaymentManually(
  formData: FormData
): Promise<ActionResult> {
  const staff = await requireConvenerManage("chief", "admin");

  const registrationId = String(formData.get("registration_id") ?? "").trim();
  const bankReference = String(formData.get("bank_reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!registrationId) {
    return { ok: false, message: "No registration was named." };
  }
  if (!bankReference) {
    return {
      ok: false,
      message:
        "Enter the bank reference (UTR / RRN / transaction id) you checked " +
        "this against. A manual confirmation has to cite its evidence.",
    };
  }

  const result = await settleRegistration(registrationId, {
    confirmedBy: staff.id,
    bankReference,
    note,
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? "The confirmation failed." };
  }
  if (result.alreadyPaid) {
    return {
      ok: true,
      message: "That registration was already marked paid — nothing changed.",
    };
  }

  revalidatePath("/chief");
  revalidatePath("/admin");
  revalidatePath("/registration");
  revalidatePath("/author");

  return {
    ok: true,
    message:
      "Payment confirmed. The delegate is now registered and can download " +
      "their invoice.",
  };
}
