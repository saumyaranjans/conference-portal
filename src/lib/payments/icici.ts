/**
 * ICICI Bank payment adapter — DELIBERATELY NOT IMPLEMENTED.
 *
 * ---------------------------------------------------------------------------
 * Read this before filling it in.
 * ---------------------------------------------------------------------------
 * "The ICICI payment gateway" is not one product, and the two the conference
 * is likely to be offered differ in every respect that matters here:
 *
 *   Eazypay   — ICICI's own collections platform, the usual one for
 *               institutional fee collection. Request is a form POST carrying
 *               a mandatory-fields string; integrity is a hash over those
 *               fields in a FIXED order using the merchant's key. The response
 *               comes back as an encrypted/­encoded parameter that has to be
 *               decoded before it means anything.
 *
 *   CCAvenue  — an aggregator ICICI resells. Request and response are both
 *               AES-encrypted (CBC) under a per-merchant "working key", with
 *               an access code identifying the merchant. Nothing about the
 *               Eazypay integration transfers.
 *
 * Both specifications are handed over with the merchant credentials and are
 * not public in a form worth coding against. Guessing the field order of a
 * checksum produces something that looks finished, fails only against the live
 * gateway, and — far worse — a verifyCallback that cannot actually tell a real
 * settlement from a forged POST. A wrong implementation here marks unpaid
 * delegates as paid. So this adapter refuses rather than approximates.
 *
 * ---------------------------------------------------------------------------
 * To finish it
 * ---------------------------------------------------------------------------
 * 1. Get the integration kit from the ICICI merchant onboarding team, and set
 *    PAYMENT_PROVIDER to `icici_eazypay` or `icici_ccavenue`.
 * 2. Fill in createCheckout: build the field map, compute the signature over
 *    the EXACT field order the spec gives, return { method: "post", url,
 *    fields }. The self-submitting form is already written (PaymentRedirect).
 * 3. Fill in verifyCallback. The rules that are not negotiable:
 *      - Recompute the signature over the response and compare it in constant
 *        time (crypto.timingSafeEqual). Reject on mismatch — throw, never
 *        return "paid".
 *      - Treat the amount in the callback as untrusted. The caller re-checks
 *        it against payment_orders.amount; do not "fix up" a mismatch here.
 *      - Be idempotent-friendly: a gateway may deliver the same callback more
 *        than once, so decode without side effects.
 * 4. Test against the UAT/staging endpoint before pointing at production.
 *
 * Until then the registration page collects everything and tells the delegate
 * that online payment is not open yet — which is true, and better than a
 * button that fails at the bank.
 */

import {
  PaymentNotConfiguredError,
  type Checkout,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentResult,
} from "./types";

type Variant = "icici_eazypay" | "icici_ccavenue";

const LABELS: Record<Variant, string> = {
  icici_eazypay: "ICICI Bank (Eazypay)",
  icici_ccavenue: "ICICI Bank (CCAvenue)",
};

/** Credentials, per variant. Absent in every environment until onboarding. */
function credentials(variant: Variant): Record<string, string> {
  if (variant === "icici_eazypay") {
    return {
      merchantId: process.env.ICICI_EAZYPAY_MERCHANT_ID ?? "",
      encryptionKey: process.env.ICICI_EAZYPAY_ENCRYPTION_KEY ?? "",
      subMerchantId: process.env.ICICI_EAZYPAY_SUB_MERCHANT_ID ?? "",
      endpoint: process.env.ICICI_EAZYPAY_ENDPOINT ?? "",
    };
  }
  return {
    merchantId: process.env.ICICI_CCAVENUE_MERCHANT_ID ?? "",
    accessCode: process.env.ICICI_CCAVENUE_ACCESS_CODE ?? "",
    workingKey: process.env.ICICI_CCAVENUE_WORKING_KEY ?? "",
    endpoint: process.env.ICICI_CCAVENUE_ENDPOINT ?? "",
  };
}

const NOT_READY =
  "The ICICI payment gateway is not configured yet. Once the merchant " +
  "credentials and integration kit are available, complete " +
  "src/lib/payments/icici.ts and set the ICICI_* environment variables.";

export function iciciProvider(variant: Variant): PaymentProvider {
  return {
    id: variant,
    label: LABELS[variant],

    isConfigured(): boolean {
      const c = credentials(variant);
      // Every credential must be present. A half-configured gateway is worse
      // than an unconfigured one: it gets as far as the bank and fails there.
      return Object.values(c).every((v) => v.trim().length > 0);
    },

    async createCheckout(_order: PaymentOrder): Promise<Checkout> {
      throw new PaymentNotConfiguredError(NOT_READY);
    },

    async verifyCallback(
      _payload: Record<string, string>
    ): Promise<PaymentResult> {
      // Refusing is the correct behaviour: an unimplemented verifier that
      // returned "paid" would accept a forged callback from anyone on the
      // internet.
      throw new PaymentNotConfiguredError(NOT_READY);
    },
  };
}
