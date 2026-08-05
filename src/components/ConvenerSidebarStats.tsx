import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { feeForTier, isEarlyBird } from "@/lib/registrationFees";
import { getUsdInrRate, usdToInr } from "@/lib/fx";

/** Format a money amount; falls back gracefully for unknown currency codes. */
function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

/**
 * All the data behind the Convener sidebar metrics, computed once per request.
 * React.cache matters here: the shell renders this component TWICE (mobile
 * Menu disclosure + desktop aside), and without the cache every count, the
 * revenue scan and the FX lookup would run twice.
 */
const getConvenerStats = cache(async () => {
  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ count: emailToday }, { count: emailTotal }] = await Promise.all([
    supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
    supabase.from("email_log").select("id", { count: "exact", head: true }),
  ]);

  const [{ count: vToday }, { count: vTotal }] = await Promise.all([
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("visited_at", startOfToday.toISOString()),
    supabase.from("site_visits").select("id", { count: "exact", head: true }),
  ]);

  // Registration revenue — one fee per fee-paid person, USD folded into INR.
  const { data: paidRows } = await supabase
    .from("submission_authors")
    .select("email, participant_category, registration_fee_tier, registration_fee_paid")
    .eq("registration_fee_paid", true);

  const perPerson = new Map<
    string,
    { email: string; category: string | null; tier: "early" | "regular" | null }
  >();
  for (const r of (paidRows ?? []) as any[]) {
    const key = (r.email ?? "").trim().toLowerCase();
    if (!key || perPerson.has(key)) continue;
    perPerson.set(key, {
      email: (r.email ?? "").trim(),
      category: r.participant_category ?? null,
      tier: (r.registration_fee_tier as "early" | "regular" | null) ?? null,
    });
  }
  const emails = [...perPerson.values()].map((v) => v.email);
  const memberByEmail = new Map<string, boolean>();
  if (emails.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("email, glogift_member")
      .in("email", emails);
    for (const p of (profs ?? []) as any[]) {
      memberByEmail.set(
        (p.email ?? "").trim().toLowerCase(),
        Boolean(p.glogift_member)
      );
    }
  }

  const { rate: usdInr } = await getUsdInrRate();
  const timelineTier: "early" | "regular" = isEarlyBird() ? "early" : "regular";
  let feesInr = 0;
  for (const [key, info] of perPerson) {
    const tier = info.tier ?? timelineTier;
    const fee = feeForTier(info.category, memberByEmail.get(key) ?? false, tier);
    if (!fee.known) continue;
    feesInr += fee.currency === "USD" ? usdToInr(fee.amount, usdInr) : fee.amount;
  }
  const revenue = { fees: feesInr, tax: feesInr * 0.18, total: feesInr * 1.18 };

  return {
    emailToday: emailToday ?? 0,
    emailTotal: emailTotal ?? 0,
    vToday: vToday ?? 0,
    vTotal: vTotal ?? 0,
    revenue,
  };
});

/**
 * Convener sidebar metrics — emails sent, website visits and registration
 * revenue. These are the heaviest part of the shell (several counts + a live
 * FX lookup), so they are rendered inside a <Suspense> boundary and STREAM in
 * after the dashboard has already painted.
 */
export async function ConvenerSidebarStats() {
  const { emailToday, emailTotal, vToday, vTotal, revenue } =
    await getConvenerStats();

  const twoStat = (label: string, today: number, total: number) => (
    <section className="mt-6">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
        {label}
      </p>
      <div className="space-y-1.5">
        <div className="card px-2.5 py-1">
          <p className="text-[10px] text-slate-500 leading-tight">Today</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {today}
          </p>
        </div>
        <div className="card px-2.5 py-1">
          <p className="text-[10px] text-slate-500 leading-tight">Total to date</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {total}
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <>
      {twoStat("Emails sent", emailToday ?? 0, emailTotal ?? 0)}
      {twoStat("Website visits", vToday ?? 0, vTotal ?? 0)}
      <section className="mt-6">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Revenue Summary
        </p>
        <div className="space-y-1.5">
          {(
            [
              ["Registration Fees Collected", revenue.fees],
              ["Tax Amount Collected", revenue.tax],
              ["Total Fees Collected", revenue.total],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className="card px-2.5 py-1">
              <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {money("INR", value)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
