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

  // Admins get every nav group so they can inspect any part of the portal.
  const visibleRoles = profile.roles.includes("admin")
    ? ROLE_ORDER
    : ROLE_ORDER.filter((r) => profile.roles.includes(r));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/glogift-logo.jpg"
              alt="GLOGIFT"
              className="h-9 w-auto object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-gradient w-fit">
              GLOGIFT 2027
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
              <p className="text-sm font-medium text-slate-800 leading-tight">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
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
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
