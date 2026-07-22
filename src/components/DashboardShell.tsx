import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type AppRole, type Profile } from "@/lib/types";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Nav entries per role. A user with several roles sees several groups. */
const NAV: Record<AppRole, { href: string; label: string }[]> = {
  author: [
    { href: "/author", label: "My Submissions" },
    { href: "/author/submissions/new", label: "New Submission" },
  ],
  reviewer: [{ href: "/reviewer", label: "My Reviews" }],
  editor: [{ href: "/editor", label: "Track Queue" }],
  chief: [{ href: "/chief", label: "Conveners" }],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users & Roles" },
    { href: "/admin/tracks", label: "Conference & Tracks" },
  ],
};

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

  // Admins get every nav group so they can inspect any part of the portal.
  const visibleRoles = profile.roles.includes("admin")
    ? ROLE_ORDER
    : ROLE_ORDER.filter((r) => profile.roles.includes(r));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-slate-900">
            Conference Portal
          </Link>
          <div className="flex items-center gap-4">
            <RoleSwitcher roles={visibleRoles} />
            <ThemeToggle />
            <NotificationBell unread={unread ?? 0} />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-tight">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-slate-500 leading-tight">
                {profile.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        <aside className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-6 sticky top-20">
            {visibleRoles.map((role) => (
              <div key={role}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-3">
                  {ROLE_LABELS[role]}
                </p>
                <ul className="space-y-0.5">
                  {NAV[role].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-white hover:text-blue-700 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
