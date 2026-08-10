import { createAdminClient } from "@/lib/supabase/server";
import { Section, StatCard } from "@/components/ui/Primitives";
import { formatMoney } from "@/lib/registrationFees";

/**
 * Registrations taken through the payment gateway, for the Convener and the
 * Editorial Office.
 *
 * Distinct from the "Registration collections" figure on the Convener page,
 * which totals what STAFF have ticked as received on the Participation desk.
 * The two should converge once the gateway is live — every online payment
 * writes through to those same flags (see registrationSync.ts) — but they are
 * shown separately because a divergence is exactly what staff need to see:
 * it means money arrived by a route nobody recorded, or a flag was ticked for
 * a payment that never landed.
 */
export async function OnlineRegistrations() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("registrations")
    .select("status, currency, amount, tax_amount, total_amount");

  // The table does not exist until migration 0079 is applied. Render nothing
  // rather than an error card.
  if (error) return null;

  const rows = (data as any[]) ?? [];
  const paid = rows.filter((r) => r.status === "paid");
  const pending = rows.filter((r) => r.status === "pending");

  const totalBy = (currency: "INR" | "USD") =>
    paid
      .filter((r) => r.currency === currency)
      .reduce((sum, r) => sum + (r.total_amount ?? r.amount ?? 0), 0);

  const inr = totalBy("INR");
  const usd = totalBy("USD");

  return (
    <Section title="Online registrations">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Paid"
          value={paid.length}
          hint="Confirmed by the bank"
        />
        <StatCard
          label="Started, unpaid"
          value={pending.length}
          hint="Registered but not yet paid"
        />
        <StatCard
          label="Collected (INR)"
          value={inr ? formatMoney("INR", inr) : "—"}
          hint="Including GST"
        />
        <StatCard
          label="Collected (USD)"
          value={usd ? formatMoney("USD", usd) : "—"}
          hint="Including GST"
        />
      </div>
      {rows.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          No online registrations yet. Payments recorded by hand on the
          Participation desk are not counted here.
        </p>
      )}
    </Section>
  );
}
