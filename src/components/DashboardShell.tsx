import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ROLE_HOME,
  ROLE_LABELS,
  type AppRole,
  type Profile,
  type PublicationOpportunity,
} from "@/lib/types";
import { SignOutButton } from "@/components/SignOutButton";
import { IdleLogout } from "@/components/IdleLogout";
import { BrandHomeLink } from "@/components/BrandHomeLink";
import { ConvenerSidebarStats } from "@/components/ConvenerSidebarStats";
import { NotificationBell } from "@/components/NotificationBell";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarNav } from "@/components/SidebarNav";

const ROLE_ORDER: AppRole[] = ["author", "reviewer", "editor", "chief", "admin"];
// Which dashboard the header brand links to, by role priority.
const ROLE_PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

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

  // The Convener sidebar metrics (emails / visits / revenue) are heavy, so they
  // stream in via <Suspense> below rather than blocking the whole shell.
  const isChief = profile.roles.includes("chief") || profile.roles.includes("admin");

  // Admins get every nav group so they can inspect any part of the portal.
  const visibleRoles = profile.roles.includes("admin")
    ? ROLE_ORDER
    : ROLE_ORDER.filter((r) => profile.roles.includes(r));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auto sign-out after inactivity (portal only — never the landing). */}
      <IdleLogout />
      <header className="app-header backdrop-blur-md backdrop-saturate-150 border-b border-slate-200 sticky top-0 z-20">
        <div className="brand-rule" />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <BrandHomeLink
            href={
              ROLE_HOME[
                ROLE_PRIORITY.find((r) => profile.roles.includes(r)) ?? "author"
              ]
            }
          />
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
          />
          {/* Convener metrics stream in after the shell has painted. */}
          {isChief && (
            <Suspense
              fallback={
                <div className="mt-6 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60"
                    />
                  ))}
                </div>
              }
            >
              <ConvenerSidebarStats />
            </Suspense>
          )}
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
