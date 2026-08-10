/**
 * Where the gateway sends the delegate (and, for some products, a
 * server-to-server notification) once a payment finishes.
 *
 * This handler assumes nothing about the caller. It is a public URL that
 * anyone can POST to, so the sequence is: verify the signature first, then
 * trust nothing in the payload except the order id, then re-derive the amount
 * from OUR record rather than theirs.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { paymentProvider } from "@/lib/payments";
import { syncPaidRegistrationToRegister } from "@/lib/registrationSync";
import { redeemCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

/**
 * Send the delegate back to the registration page with an outcome.
 *
 * Resolved against the REQUEST origin, with NEXT_PUBLIC_SITE_URL preferred
 * only when it is a usable absolute URL. Depending on the env var alone threw
 * `ERR_INVALID_URL` wherever it was unset or relative, which turned every
 * callback — including a legitimate successful payment — into a 500 that left
 * the delegate staring at an error page with no idea whether they had been
 * charged.
 */
function backTo(req: NextRequest, status: string) {
  const origin = req.nextUrl.origin;
  let base = origin;

  // In production the configured site URL wins: behind Vercel's proxy the
  // request origin can be the internal deployment host rather than the custom
  // domain, and bouncing a delegate to a *.vercel.app URL mid-payment looks
  // like a phishing redirect. Locally the request origin wins, or every
  // sandbox callback would throw the tester over to the live site.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin);
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!isLocal && configured) {
    try {
      base = new URL(configured).origin;
    } catch {
      // Malformed config: the request origin is the safer answer.
    }
  }

  // A delegate who has just paid is done with the registration page — send
  // them to their dashboard, where the thank-you, the confirmed status and the
  // invoice all live. Every other outcome keeps them on /registration, which
  // is where the form they still need is.
  const path =
    status === "success"
      ? `/author?payment=success`
      : `/registration?payment=${status}`;

  return NextResponse.redirect(new URL(path, base), 303);
}

async function handle(req: NextRequest) {
  const provider = paymentProvider();
  if (!provider) return backTo(req, "unavailable");

  // Accept both encodings — gateways vary, and some send the browser back by
  // GET while notifying the server by POST.
  const payload: Record<string, string> = {};
  for (const [k, v] of req.nextUrl.searchParams) payload[k] = v;
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      Object.assign(payload, await req.json().catch(() => ({})));
    } else {
      const form = await req.formData().catch(() => null);
      if (form) for (const [k, v] of form) payload[k] = String(v);
    }
  }

  let result;
  try {
    result = await provider.verifyCallback(payload);
  } catch {
    // Unverifiable: could be a forgery, could be an unfinished adapter.
    // Either way nothing is marked paid.
    return backTo(req, "failed");
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("payment_orders")
    .select("id, registration_id, amount, currency, status")
    .eq("order_id", result.orderId)
    .maybeSingle();

  if (!order) return backTo(req, "unknown");

  // Already settled — a repeat callback must not undo or re-apply anything.
  if ((order as any).status === "paid") return backTo(req, "success");

  // The gateway's amount is untrusted input. If it disagrees with what we
  // asked for, record the payment but do NOT mark the registration paid: that
  // is a reconciliation question for the Editorial Office, not something to
  // resolve automatically in either direction.
  const mismatch =
    result.status === "paid" &&
    ((result.amount !== null && result.amount !== (order as any).amount) ||
      (result.currency !== null && result.currency !== (order as any).currency));

  await admin
    .from("payment_orders")
    .update({
      status: mismatch ? "failed" : result.status,
      provider_ref: result.providerRef,
      provider_payload: result.raw,
      verified_at: new Date().toISOString(),
    })
    .eq("id", (order as any).id);

  if (result.status === "paid" && !mismatch) {
    await admin
      .from("registrations")
      .update({ status: "paid" })
      .eq("id", (order as any).registration_id);

    // Burn the coupon now rather than at registration: a delegate who
    // abandoned an earlier attempt keeps their discount, and only a payment
    // that actually settled consumes it.
    const { data: reg } = await admin
      .from("registrations")
      .select("coupon_id")
      .eq("id", (order as any).registration_id)
      .maybeSingle();
    if ((reg as any)?.coupon_id) {
      await redeemCoupon((reg as any).coupon_id, (order as any).registration_id);
    }

    // Fill in the Editorial Office register automatically. A failure here must
    // not lose the payment — the money is taken and the registration is paid
    // either way, and staff can still tick the boxes by hand.
    try {
      await syncPaidRegistrationToRegister((order as any).registration_id);
    } catch {
      // Intentionally swallowed; see above.
    }

    return backTo(req, "success");
  }

  if (mismatch) return backTo(req, "mismatch");
  return backTo(req, result.status === "cancelled" ? "cancelled" : "failed");
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
