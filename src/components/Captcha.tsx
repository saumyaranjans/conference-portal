"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, guarding the three unauthenticated auth endpoints:
 * registration, sign-in and password reset.
 *
 * Turnstile rather than hCaptcha because it is free without a usage ceiling and
 * usually solves itself. Run in "interaction-only" mode, so most visitors see
 * nothing at all and only those Cloudflare actually wants to challenge get a
 * widget — which matters on a registration form already asking for fifteen
 * fields, and on a sign-in page where a 300x65 box was the largest thing after
 * the form itself.
 *
 * Inert until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and the forms treat a
 * missing key as "no captcha required". That ordering is deliberate: the widget
 * must be live in the browser before verification is switched on in Supabase,
 * or every sign-in breaks in the gap between the two changes.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const captchaEnabled = SITE_KEY.length > 0;

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load the Turnstile script once per page, however many widgets mount. */
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("captcha script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function Captcha({
  onToken,
  /** Change this to force a fresh challenge — tokens are single-use. */
  resetSignal = 0,
  className = "",
}: {
  onToken: (token: string | null) => void;
  resetSignal?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!captchaEnabled) return;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        // Guard against a double-render in React strict mode.
        if (widgetId.current) return;
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          // Render NOTHING unless Cloudflare actually needs the visitor to do
          // something. Turnstile clears most people silently, so the default
          // ("always") was showing a 300x65 "Verify you are human" box to
          // everyone in order to serve the few who get challenged. The token
          // still arrives via `callback` either way — only the box is
          // conditional, not the protection.
          appearance: "interaction-only",
          // When it IS shown, fill the form width instead of sitting at a
          // fixed 300px beside full-width inputs.
          size: "flexible",
          callback: (token: string) => onToken(token),
          // A token that expires or errors must not look like a valid one.
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* already gone */
        }
        widgetId.current = null;
      }
    };
    // onToken is recreated each render in the parents; re-running on it would
    // tear the widget down constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A failed submission consumes the token, so ask for a new one.
  useEffect(() => {
    if (!captchaEnabled || !resetSignal) return;
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (!captchaEnabled) return null;

  return (
    <div className={className}>
      <div ref={boxRef} />
      {failed && (
        <p className="mt-1 text-xs text-red-600">
          The security check could not load. Disable any script blocker for this
          site and reload the page.
        </p>
      )}
    </div>
  );
}
