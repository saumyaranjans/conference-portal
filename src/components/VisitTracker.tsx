"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Records public-website page views.
 *
 * Mounted once in the root layout rather than on the landing page, because the
 * pages worth measuring — Call for Papers, Registration, Schedule — are exactly
 * the ones a landing-page-only tracker cannot see.
 *
 * Two things make the numbers honest:
 *
 *  - Every page a visitor opens is recorded, but only once per session, so a
 *    reader who scrolls back to a page they have already seen does not inflate
 *    it. Rows are page views; distinct session ids are visitors.
 *  - It reads `usePathname`, so client-side navigation registers. Next.js does
 *    not reload the document between pages, so an effect that runs only on
 *    mount would see nothing after the first page.
 *
 * The portal is deliberately excluded: staff working in their dashboards are
 * not website traffic, and counting them would quietly corrupt the very
 * conversion numbers this exists to report.
 */

/** Route prefixes that are not public website pages. */
const PRIVATE_PREFIXES = [
  // Signed-in portal (the (dash) route group).
  "/author",
  "/reviewer",
  "/editor",
  "/chief",
  "/admin",
  "/profile",
  // Authentication and one-time token links — private, and not traffic.
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/denied",
  "/chair-invite",
  "/co-author-invite",
  "/reviewer-invite",
  "/track-editor-invite",
  "/paper-assignment",
  "/review-invite",
];

const SESSION_KEY = "glogift_visit_session";
const SEEN_KEY = "glogift_visit_seen";

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Only external referrers are informative — internal ones just retrace our own links. */
function externalReferrer(): string | null {
  const ref = document.referrer;
  if (!ref) return null;
  try {
    if (new URL(ref).hostname === window.location.hostname) return null;
  } catch {
    return null;
  }
  return ref.slice(0, 300);
}

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
      return;

    try {
      const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]");
      if (seen.includes(pathname)) return;
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, pathname]));

      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          session_id: sessionId(),
          referrer: externalReferrer(),
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore — a counter must never affect the visitor
    }
  }, [pathname]);

  return null;
}
