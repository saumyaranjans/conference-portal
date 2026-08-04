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
    { href: "/editor/submission-analytics", label: "Submission Analytics" },
    { href: "/editor/visit-analytics", label: "Visit Analytics" },
  ],
  chief: [
    { href: "/chief", label: "Convener" },
    { href: "/chief/analytics", label: "Submission Analytics" },
    { href: "/chief/visit-analytics", label: "Visit Analytics" },
    { href: "/chief/authors", label: "Author Management" },
    { href: "/chief/reviewers", label: "Reviewer Management" },
    { href: "/chief/track-editors", label: "Track Editor Management" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/users", label: "Users & Roles" },
    { href: "/admin/tracks", label: "Conference & Tracks" },
    { href: "/admin/publications", label: "Publication Opportunities" },
    { href: "/admin/authors", label: "Author Management" },
    { href: "/admin/reviewers", label: "Reviewer Management" },
    { href: "/admin/track-editors", label: "Track Editor Management" },
    { href: "/admin/certificates", label: "Certificate Office" },
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

export function SidebarNav({
  roles,
  opportunities = [],
  emailStats,
  visitStats,
  revenueStats,
}: {
  roles: AppRole[];
  opportunities?: PublicationOpportunity[];
  /** Convener only: how much mail the portal has sent. */
  emailStats?: { today: number; total: number };
  visitStats?: { today: number; total: number };
  /** Convener only: registration revenue per currency (base / tax / total). */
  revenueStats?: { currency: string; fees: number; tax: number; total: number }[];
}) {
  const pathname = usePathname();

  const current: AppRole =
    ROLE_ORDER.find(
      (r) => roles.includes(r) && pathname.startsWith(ROLE_HOME[r])
    ) ?? roles[0];

  if (!current) return null;

  return (
    <nav
      className={`sticky top-20 ${
        current === "chief"
          ? "max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 [scrollbar-width:thin]"
          : ""
      }`}
    >
      {/* Two clearly-distinct destinations (moved here from the header): the
          public conference website vs. the submission-portal home. */}
      <a
        href="https://www.glogift2027.in/Home"
        className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
        title="Go to the conference home (www.glogift2027.in)"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
        Glogift2027.in
      </a>

      <Link
        href={ROLE_HOME[current]}
        className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
        title="Go to your submission-portal home"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11l9-8 9 8M6 10v10h12V10" />
        </svg>
        Portal Home
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
                className={`nav-item ${active ? "nav-item-active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {emailStats && current === "chief" && (
        <section className="mt-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Emails sent
          </p>
          <div className="space-y-1.5">
            <div className="card px-2.5 py-1">
              <p className="text-[10px] text-slate-500 leading-tight">Today</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {emailStats.today}
              </p>
            </div>
            <div className="card px-2.5 py-1">
              <p className="text-[10px] text-slate-500 leading-tight">Total to date</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {emailStats.total}
              </p>
            </div>
          </div>
        </section>
      )}

      {visitStats && current === "chief" && (
        <section className="mt-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Website visits
          </p>
          <div className="space-y-1.5">
            <div className="card px-2.5 py-1">
              <p className="text-[10px] text-slate-500 leading-tight">Today</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {visitStats.today}
              </p>
            </div>
            <div className="card px-2.5 py-1">
              <p className="text-[10px] text-slate-500 leading-tight">Total to date</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {visitStats.total}
              </p>
            </div>
          </div>
        </section>
      )}

      {current === "chief" &&
        (() => {
          const rows =
            revenueStats && revenueStats.length
              ? revenueStats
              : [{ currency: "INR", fees: 0, tax: 0, total: 0 }];
          const boxes: [
            string,
            (r: { fees: number; tax: number; total: number }) => number,
          ][] = [
            ["Registration Fees Collected", (r) => r.fees],
            ["Tax Amount Collected", (r) => r.tax],
            ["Total Fees Collected", (r) => r.total],
          ];
          return (
            <section className="mt-6">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Revenue Summary
              </p>
              <div className="space-y-1.5">
                {boxes.map(([label, pick]) => (
                  <div key={label} className="card px-2.5 py-1">
                    <p className="text-[10px] text-slate-500 leading-tight">{label}</p>
                    {rows.map((r) => (
                      <p
                        key={r.currency}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight"
                      >
                        {money(r.currency, pick(r))}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

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
