"use client";

import { useEffect } from "react";

/**
 * Records one website visit per browser session (guarded by sessionStorage so a
 * visitor navigating around the landing page counts once). Fire-and-forget —
 * never blocks or errors the page.
 */
export function VisitTracker() {
  useEffect(() => {
    try {
      const KEY = "glogift_visit_logged";
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore — a counter must never affect the visitor
    }
  }, []);
  return null;
}
