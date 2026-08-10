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

export const dynamic = "force-dynamic";

function backTo(status: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.redirect(`${base}/registration?payment=${status}`, 303);
}

async function handle(req: NextRequest) {
  const provider = paymentProvider();
  if (!provider) return backTo("unavailable");

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
    return backTo("failed");
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("payment_orders")
    .select("id, registration_id, amount, currency, status")
    .eq("order_id", result.orderId)
    .maybeSingle();

  if (!order) return backTo("unknown");

  // Already settled — a repeat callback must not undo or re-apply anything.
  if ((order as any).status === "paid") return backTo("success");

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

    // Fill in the Editorial Office register automatically. A failure here must
    // not lose the payment — the money is taken and the registration is paid
    // either way, and staff can still tick the boxes by hand.
    try {
      await syncPaidRegistrationToRegister((order as any).registration_id);
    } catch {
      // Intentionally swallowed; see above.
    }

    return backTo("success");
  }

  if (mismatch) return backTo("mismatch");
  return backTo(result.status === "cancelled" ? "cancelled" : "failed");
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
