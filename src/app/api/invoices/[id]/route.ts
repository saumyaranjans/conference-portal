import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { participationModeLabel } from "@/lib/types";
import { myPresentableSubmissions } from "@/lib/registrationActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The registration invoice, built on demand from the registration row.
 *
 * Generated rather than stored, unlike certificates: a certificate is an
 * artefact that must stay byte-identical once issued (hence the stored file
 * and its checksum), whereas an invoice is a rendering of a ledger row that
 * cannot change after payment. Nothing to store, nothing to drift.
 *
 * Only a PAID registration produces one. A pending row means no money has
 * moved, and a receipt for an unpaid registration is a document nobody should
 * be able to wave at a finance office.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ?inline=1 renders the receipt in the page instead of downloading it —
  // the thank-you shows the delegate what they are about to save, which is
  // the difference between a receipt they trust and a file they hope is right.
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const profile = await getProfile();
  if (!profile) {
    return new NextResponse("Authentication required.", { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: reg, error } = await admin
    .from("registrations")
    .select(
      "id, profile_id, status, currency, base_amount, discount_amount, coupon_code, " +
        "tax_rate, tax_amount, total_amount, participation_mode, participant_category, " +
        "country, paid_at, created_at, " +
        "payment_orders(order_id, status), profiles(full_name, email)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[invoice] lookup failed for %s: %s", id, error.message);
    return new NextResponse("The invoice could not be loaded.", { status: 503 });
  }
  if (!reg) return new NextResponse("Registration not found.", { status: 404 });

  // The Editorial Office may open any invoice; everyone else only their own.
  const r = reg as any;
  if (r.profile_id !== profile.id && !profile.roles.includes("admin")) {
    return new NextResponse("You may only download your own invoice.", {
      status: 403,
    });
  }

  if (r.status !== "paid") {
    return new NextResponse(
      "An invoice is issued once payment has been received.",
      { status: 409 }
    );
  }

  // Every accepted paper, not only the one the registration is filed against.
  // The row carries a single submission_id because a registration has to point
  // somewhere, but the fee covers the delegate and everything they present.
  const eligible = (await myPresentableSubmissions(r.profile_id)) as any[];
  const papers = eligible.map((s) => ({
    reference: s.paper_id ?? "",
    title: s.title ?? "",
  }));

  // The delegate the invoice is FOR, not whoever is downloading it. The
  // Editorial Office may open anyone's receipt, and reading the signed-in
  // profile here would print the staff member's name on the delegate's bill.
  const owner = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;

  const orders = Array.isArray(r.payment_orders)
    ? r.payment_orders
    : r.payment_orders
      ? [r.payment_orders]
      : [];
  const paidOrder = orders.find((o: any) => o.status === "paid") ?? orders[0];

  const asDate = (v: string | null) =>
    v
      ? new Date(v).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const pdf = await generateInvoicePdf({
    // Derived from the registration id, so the same registration always
    // produces the same invoice number however often it is downloaded.
    invoiceNumber: `INV-GLOGIFT27-${String(r.id).slice(0, 8).toUpperCase()}`,
    issuedOn: asDate(r.paid_at ?? r.created_at) ?? "",
    paidOn: asDate(r.paid_at),
    orderId: paidOrder?.order_id ?? null,
    delegate: {
      name: owner?.full_name ?? "",
      email: owner?.email ?? "",
      category: r.participant_category ?? "",
      country: r.country ?? "",
    },
    papers,
    currency: (r.currency ?? "INR") as "INR" | "USD",
    base: r.base_amount ?? 0,
    discount: r.discount_amount ?? 0,
    couponCode: r.coupon_code ?? "",
    taxRate: r.tax_rate ?? 0,
    tax: r.tax_amount ?? 0,
    total: r.total_amount ?? 0,
    participationMode: participationModeLabel(r.participation_mode ?? ""),
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${
        inline ? "inline" : "attachment"
      }; filename="GLOGIFT27-invoice-${String(r.id).slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
