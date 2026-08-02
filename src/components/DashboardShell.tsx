import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ROLE_LABELS,
  type AppRole,
  type Profile,
  type PublicationOpportunity,
} from "@/lib/types";
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

  // Email volume, shown in the Convener's sidebar. Counts only.
  const isChief = profile.roles.includes("chief") || profile.roles.includes("admin");
  let emailStats: { today: number; total: number } | undefined;
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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <img
                src="/glogift-logo.png"
                alt="GLOGIFT"
                className="h-9 w-auto object-contain"
              />
              <span className="hidden lg:inline text-lg font-bold tracking-tight text-gradient w-fit">
                GLOGIFT 2027
              </span>
            </Link>

            {/* Two clearly-distinct destinations so users never confuse the
                public conference website with the submission-portal home. */}
            <span aria-hidden className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
            <a
              href="https://www.glogift2027.in/Home"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 shrink-0"
              title="Go to the conference website (www.glogift2027.in)"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
              </svg>
              <span className="hidden sm:inline">Conference Website</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 shrink-0"
              title="Go to your submission-portal home"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 11l9-8 9 8M6 10v10h12V10" />
              </svg>
              <span className="hidden sm:inline">Portal Home</span>
            </Link>
          </div>
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
          />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
