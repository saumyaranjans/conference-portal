import { createHmac, timingSafeEqual } from "node:crypto";
import {
  type Checkout,
  type Currency,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentResult,
} from "./types";

/**
 * A stand-in bank, for testing the registration flow before ICICI is wired.
 *
 * It is NOT a mock in the usual sense — it does not shortcut anything. It
 * signs the hand-off, and the callback it produces is verified with a real
 * HMAC comparison in constant time, exactly as the ICICI adapter will have to.
 * That means the whole path downstream of the gateway gets exercised for real:
 * signature rejection, the amount-mismatch hold, coupon redemption, the write
 * through to the Editorial Office register, and every delegate-facing outcome
 * screen. The only fiction is that no money moves.
 *
 * Treat this file as the reference for icici.ts. What it does with
 * SANDBOX_PAYMENT_SECRET, ICICI will do with the merchant working key.
 *
 * SAFETY: refuses to run in production unless ALLOW_SANDBOX_PAYMENTS=1 is set
 * deliberately. A test gateway silently enabled against the live site would
 * mark real delegates as paid without taking a rupee.
 */

const SIGNED_FIELDS = ["orderId", "amount", "currency", "status"] as const;

function secret(): string {
  return (
    process.env.SANDBOX_PAYMENT_SECRET?.trim() ||
    // Dev-only fallback so the sandbox works with no configuration at all.
    // Never reached in production: productionBlocked() refuses first.
    "glogift-sandbox-development-only"
  );
}

/** HMAC over the fields in a FIXED order — the thing a real gateway spec
 *  pins down, and the thing that is fatal to get wrong. */
export function sandboxSignature(payload: Record<string, string>): string {
  const base = SIGNED_FIELDS.map((f) => `${f}=${payload[f] ?? ""}`).join("|");
  return createHmac("sha256", secret()).update(base).digest("hex");
}

function signatureMatches(payload: Record<string, string>): boolean {
  const expected = Buffer.from(sandboxSignature(payload), "utf8");
  const given = Buffer.from(String(payload.signature ?? ""), "utf8");
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export function productionBlocked(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_SANDBOX_PAYMENTS !== "1"
  );
}

/** The outcomes a tester can pick, each pre-signed by the server so the
 *  sandbox page cannot mint a "paid" the server did not authorise. */
export function sandboxOutcomes(o: {
  orderId: string;
  amount: string;
  currency: string;
}) {
  return (["paid", "failed", "cancelled"] as const).map((status) => {
    const fields = { ...o, status };
    return { status, fields, signature: sandboxSignature(fields) };
  });
}

export function sandboxProvider(): PaymentProvider {
  return {
    id: "sandbox",
    label: "Sandbox gateway (test — no money moves)",

    isConfigured(): boolean {
      return !productionBlocked();
    },

    async createCheckout(order: PaymentOrder): Promise<Checkout> {
      if (productionBlocked()) {
        throw new Error(
          "The sandbox gateway is disabled in production. Set ALLOW_SANDBOX_PAYMENTS=1 only if you really intend to test against the live site."
        );
      }

      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const params = new URLSearchParams({
        orderId: order.orderId,
        amount: String(order.amount),
        currency: order.currency,
        description: order.description,
        payer: order.payer.name,
        returnUrl: order.returnUrl,
      });

      return { method: "redirect", url: `${base}/sandbox-gateway?${params}` };
    },

    async verifyCallback(
      payload: Record<string, string>
    ): Promise<PaymentResult> {
      if (!signatureMatches(payload)) {
        // Exactly what the real adapter must do: refuse, never downgrade to a
        // "pending" that some later code path might treat as success.
        throw new Error("Sandbox callback signature did not verify.");
      }

      const status = payload.status;
      if (status !== "paid" && status !== "failed" && status !== "cancelled") {
        throw new Error(`Sandbox callback carried an unknown status: ${status}`);
      }

      const amount = Number(payload.amount);
      const currency = payload.currency as Currency;

      return {
        orderId: payload.orderId,
        status,
        providerRef: `SANDBOX-${payload.orderId}`,
        amount: Number.isFinite(amount) ? amount : null,
        currency: currency === "INR" || currency === "USD" ? currency : null,
        raw: { ...payload, _sandbox: true },
      };
    },
  };
}
