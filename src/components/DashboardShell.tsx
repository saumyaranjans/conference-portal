import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ROLE_LABELS,
  type AppRole,
  type Profile,
  type PublicationOpportunity,
} from "@/lib/types";
import { feeForTier, isEarlyBird } from "@/lib/registrationFees";
import { getUsdInrRate, usdToInr } from "@/lib/fx";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarNav } from "@/components/SidebarNav";

const ROLE_ORDER: AppRole[] = ["author", "reviewer", "editor", "chief", "admin"];

export async function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("is_read", false);

  const { data: opportunities } = await supabase
    .from("publication_opportunities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(6);

  // Email volume + revenue, shown in the Convener's sidebar.
  const isChief = profile.roles.includes("chief") || profile.roles.includes("admin");
  let emailStats: { today: number; total: number } | undefined;
  let visitStats: { today: number; total: number } | undefined;
  let revenueStats:
    | { currency: string; fees: number; tax: number; total: number }[]
    | undefined;
  if (isChief) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [{ count: today }, { count: total }] = await Promise.all([
      supabase
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString()),
      supabase.from("email_log").select("id", { count: "exact", head: true }),
    ]);
    emailStats = { today: today ?? 0, total: total ?? 0 };

    // Website visits (one row per visitor session — see /api/visit).
    const [{ count: vToday }, { count: vTotal }] = await Promise.all([
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .gte("visited_at", startOfToday.toISOString()),
      supabase.from("site_visits").select("id", { count: "exact", head: true }),
    ]);
    visitStats = { today: vToday ?? 0, total: vTotal ?? 0 };

    // Registration revenue from the Author Management "Participation desk":
    // every person marked fee-paid contributes the fee for the tier collected
    // (Early Bird / Regular) at their category rate, less any GLOGIFT-member
    // discount. Counted ONCE per person (they pay once, even on several
    // papers). Tax is 18% on top; total is fees + tax.
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

    // GLOGIFT membership (15% discount) lives on profiles — match by email.
    const emails = [...perPerson.values()].map((v) => v.email);
    const memberByEmail = new Map<string, boolean>();
    if (emails.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("email, glogift_member")
        .in("email", emails);
      for (const p of (profs ?? []) as any[]) {
        memberByEmail.set((p.email ?? "").trim().toLowerCase(), Boolean(p.glogift_member));
      }
    }

    // Foreign (USD) fees are converted to INR at today's rate and folded into
    // a single INR revenue figure.
    const { rate: usdInr } = await getUsdInrRate();
    const timelineTier: "early" | "regular" = isEarlyBird() ? "early" : "regular";
    let feesInr = 0;
    for (const [key, info] of perPerson) {
      // Fall back to the timeline tier for any legacy paid row without one.
      const tier = info.tier ?? timelineTier;
      const fee = feeForTier(info.category, memberByEmail.get(key) ?? false, tier);
      if (!fee.known) continue;
      feesInr += fee.currency === "USD" ? usdToInr(fee.amount, usdInr) : fee.amount;
    }
    revenueStats = feesInr
      ? [{ currency: "INR", fees: feesInr, tax: feesInr * 0.18, total: feesInr * 1.18 }]
      : [];
  }

  // Admins get every nav group so they can inspect any part of the portal.
  const visibleRoles = profile.roles.includes("admin")
    ? ROLE_ORDER
    : ROLE_ORDER.filter((r) => profile.roles.includes(r));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-header backdrop-blur-md backdrop-saturate-150 border-b border-slate-200 sticky top-0 z-20">
        <div className="brand-rule" />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/glogift-logo.png"
              alt="GLOGIFT"
              className="h-9 w-auto object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-gradient w-fit">
              GLOGIFT 27
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <RoleSwitcher roles={visibleRoles} />
            <ThemeToggle />
            <NotificationBell unread={unread ?? 0} />
            <Link
              href="/profile"
              className="text-right hidden sm:block hover:opacity-80 transition-opacity"
              title="Edit my profile"
            >
              <p className="text-sm font-medium text-slate-800 leading-tight whitespace-nowrap">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight whitespace-nowrap">
                {profile.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
              </p>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        <aside className="w-56 shrink-0 hidden md:block">
          <SidebarNav
            roles={visibleRoles}
            opportunities={(opportunities ?? []) as PublicationOpportunity[]}
            emailStats={emailStats}
            visitStats={visitStats}
            revenueStats={revenueStats}
          />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
