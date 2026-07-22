"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/types";

/** Nav entries per role. */
const NAV: Record<AppRole, { href: string; label: string }[]> = {
  author: [
    { href: "/author", label: "My Submissions" },
    { href: "/author/submissions/new", label: "New Submission" },
  ],
  reviewer: [{ href: "/reviewer", label: "My Reviews" }],
  editor: [{ href: "/editor", label: "Track Queue" }],
  chief: [{ href: "/chief", label: "Convener" }],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users & Roles" },
    { href: "/admin/tracks", label: "Conference & Tracks" },
  ],
};

const ROLE_ORDER: AppRole[] = ["author", "reviewer", "editor", "chief", "admin"];

/**
 * Shows only the nav for the role the user is currently viewing (inferred
 * from the URL, set by the "View as" switcher). Falls back to the first role
 * they hold.
 */
export function SidebarNav({ roles }: { roles: AppRole[] }) {
  const pathname = usePathname();

  const current: AppRole =
    ROLE_ORDER.find(
      (r) => roles.includes(r) && pathname.startsWith(ROLE_HOME[r])
    ) ?? roles[0];

  if (!current) return null;

  return (
    <nav className="sticky top-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-3">
        {ROLE_LABELS[current]}
      </p>
      <ul className="space-y-0.5">
        {NAV[current].map((item) => {
          const active =
            item.href === ROLE_HOME[current]
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white text-blue-700 font-medium"
                    : "text-slate-700 hover:bg-white hover:text-blue-700"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
