"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ROLE_HOME,
  ROLE_LABELS,
  type AppRole,
  type PublicationOpportunity,
} from "@/lib/types";

/** Nav entries per role. */
const NAV: Record<AppRole, { href: string; label: string }[]> = {
  author: [
    { href: "/author", label: "My Submissions" },
    { href: "/author/submissions/new", label: "New Submission" },
  ],
  reviewer: [{ href: "/reviewer", label: "My Reviews" }],
  editor: [
    { href: "/editor", label: "Track Queue" },
    { href: "/editor/analytics", label: "Track Analytics" },
  ],
  chief: [
    { href: "/chief", label: "Convener" },
    { href: "/chief/analytics", label: "Submission Analytics" },
    { href: "/chief/attendance", label: "Attendance" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/users", label: "Users & Roles" },
    { href: "/admin/tracks", label: "Conference & Tracks" },
    { href: "/admin/publications", label: "Publication Opportunities" },
    { href: "/admin/attendance", label: "Attendance" },
  ],
};

const ROLE_ORDER: AppRole[] = ["author", "reviewer", "editor", "chief", "admin"];

/**
 * Shows only the nav for the role the user is currently viewing (inferred
 * from the URL, set by the "View as" switcher). Falls back to the first role
 * they hold.
 */
/** Roles that see the publication-opportunities panel. */
const SHOW_OPPORTUNITIES: AppRole[] = ["author"];

export function SidebarNav({
  roles,
  opportunities = [],
}: {
  roles: AppRole[];
  opportunities?: PublicationOpportunity[];
}) {
  const pathname = usePathname();

  const current: AppRole =
    ROLE_ORDER.find(
      (r) => roles.includes(r) && pathname.startsWith(ROLE_HOME[r])
    ) ?? roles[0];

  if (!current) return null;

  return (
    <nav className="sticky top-20">
      <Link
        href="/"
        className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm
                   text-slate-700 hover:bg-white hover:text-blue-700 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
          />
        </svg>
        Home
      </Link>

      <Link
        href="/profile"
        className={`flex items-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm transition-colors ${
          pathname.startsWith("/profile")
            ? "bg-white text-blue-700 font-medium"
            : "text-slate-700 hover:bg-white hover:text-blue-700"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0v.75H4.5v-.75Z"
          />
        </svg>
        My Profile
      </Link>

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

      {SHOW_OPPORTUNITIES.includes(current) && opportunities.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 px-3">
            Publication opportunities
          </p>
          <p className="text-xs text-slate-600 mb-3 px-3 leading-snug">
            Selected full papers, subject to an additional review round by the
            respective journal editorial boards, will be considered for
            publication in:
          </p>

          <ul className="space-y-4">
            {opportunities.map((o) => {
              const cover = o.image_url ? (
                <img
                  src={o.image_url}
                  alt={o.title}
                  className="w-full rounded-md border border-slate-200 bg-white"
                />
              ) : null;

              return (
                <li key={o.id} className="px-3">
                  {cover &&
                    (o.url ? (
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-90 transition-opacity"
                      >
                        {cover}
                      </a>
                    ) : (
                      cover
                    ))}

                  {o.url ? (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-xs font-medium text-blue-700 hover:underline leading-snug"
                    >
                      {o.title}
                    </a>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-slate-800 leading-snug">
                      {o.title}
                    </p>
                  )}

                  {(o.category || o.publisher) && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {o.category || o.publisher}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </nav>
  );
}
