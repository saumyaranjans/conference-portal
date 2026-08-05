"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Automatic sign-out after a period of no activity. Mounted inside the
 * authenticated portal shell only, so it never runs on the public landing.
 *
 * Real user activity (pointer, keyboard, scroll, touch) resets the timer.
 * Activity is shared across tabs via localStorage, so working in one tab keeps
 * every tab signed in, and a timeout in one tab signs the others out too. A
 * short warning dialog appears in the final minute; once it is showing, only an
 * explicit "Stay signed in" (or activity in another tab) keeps the session —
 * stray mouse movement no longer counts, so "Sign out now" stays clickable.
 */

const LAST_ACTIVITY_KEY = "glogift:lastActivity";
const LOGOUT_BROADCAST_KEY = "glogift:idleLogout";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
  "pointerdown",
] as const;

export function IdleLogout({
  timeoutMs = 20 * 60_000, // sign out after 20 minutes idle
  warnMs = 60_000, // warn for the final 60 seconds
}: {
  timeoutMs?: number;
  warnMs?: number;
}) {
  const router = useRouter();
  const lastActivity = useRef<number>(Date.now());
  const lastStorageWrite = useRef<number>(0);
  const signingOut = useRef(false);
  const warningRef = useRef(false);
  // Seconds left during the warning, or null when the dialog is hidden.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    warningRef.current = remaining !== null;
  }, [remaining]);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
    } catch {
      /* private-mode storage */
    }
    try {
      await createClient().auth.signOut();
    } finally {
      router.push("/login?reason=inactivity");
      router.refresh();
    }
  }, [router]);

  // Reset the idle clock and let other tabs know we are active.
  const bumpActivity = useCallback((now: number) => {
    lastActivity.current = now;
    if (now - lastStorageWrite.current > 5000) {
      lastStorageWrite.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        /* private-mode storage */
      }
    }
  }, []);

  // Window activity — ignored while the warning is up so the user must choose.
  const onWindowActivity = useCallback(() => {
    if (warningRef.current) return;
    bumpActivity(Date.now());
  }, [bumpActivity]);

  const staySignedIn = useCallback(() => {
    bumpActivity(Date.now());
    lastStorageWrite.current = Date.now();
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* private-mode storage */
    }
    setRemaining(null);
  }, [bumpActivity]);

  useEffect(() => {
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onWindowActivity, { passive: true });
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const t = Number(e.newValue);
        if (!Number.isNaN(t)) {
          lastActivity.current = Math.max(lastActivity.current, t);
          setRemaining(null); // activity elsewhere clears our warning
        }
      } else if (e.key === LOGOUT_BROADCAST_KEY && !signingOut.current) {
        // Another tab timed out — follow it out.
        signingOut.current = true;
        router.push("/login?reason=inactivity");
        router.refresh();
      }
    };
    window.addEventListener("storage", onStorage);

    const id = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        void signOut();
      } else if (idle >= timeoutMs - warnMs) {
        setRemaining(Math.ceil((timeoutMs - idle) / 1000));
      } else {
        // Bail out of a re-render when already hidden (null === null).
        setRemaining((prev) => (prev === null ? null : null));
      }
    }, 1000);

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onWindowActivity);
      }
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [onWindowActivity, signOut, timeoutMs, warnMs, router]);

  if (remaining === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <h2
          id="idle-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          Are you still there?
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          You&apos;ve been inactive for a while. For your security you&apos;ll be
          signed out in{" "}
          <b className="tabular-nums text-slate-900 dark:text-slate-100">
            {remaining}s
          </b>
          .
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={staySignedIn}
            className="btn-primary flex-1 justify-center"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-secondary justify-center"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
