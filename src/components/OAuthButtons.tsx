"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * "Continue with Google / Microsoft".
 *
 * A provider gives us a verified email and usually a name — never an
 * institution or participant category. So this only establishes identity; the
 * callback sends anyone whose profile is unfinished to /complete-profile to
 * supply the rest. Email + password signup is untouched and still collects
 * everything in one pass.
 *
 * Deliberately absent from the invitation pages: those must consume a token
 * once the account exists, and a round trip through an external provider would
 * drop that step.
 */

const PROVIDERS = [
  {
    // Supabase calls Microsoft's provider "azure"; it covers Outlook, Hotmail,
    // Live and institutional Microsoft 365 accounts alike.
    id: "azure" as const,
    label: "Microsoft",
    // Azure only returns the address when `email` is requested explicitly.
    scopes: "email openid profile",
    mark: (
      <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden>
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#7fba00" d="M12 1h10v10H12z" />
        <path fill="#00a4ef" d="M1 12h10v10H1z" />
        <path fill="#ffb900" d="M12 12h10v10H12z" />
      </svg>
    ),
  },
  {
    id: "google" as const,
    label: "Google",
    scopes: "email profile",
    mark: (
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </svg>
    ),
  },
];

/**
 * Which providers to offer, e.g. NEXT_PUBLIC_OAUTH_PROVIDERS="google,azure".
 *
 * This gate exists because signInWithOAuth performs a full-page navigation to
 * Supabase: if a provider is not switched on there, the visitor lands on a raw
 * JSON error page and no amount of client-side error handling can catch it.
 * So a button only appears once the provider is genuinely configured. Unset
 * means no buttons, and the sign-in page looks exactly as it did before.
 */
const ENABLED = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function OAuthButtons({
  /** Where to land after a completed sign-in. */
  next,
  label = "Or continue with",
}: {
  next?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "google" | "azure", scopes: string) {
    setError(null);
    setBusy(provider);

    // Carry ?next= through the provider so a deep link survives the round trip.
    const params = new URLSearchParams();
    const requested =
      next ?? new URLSearchParams(window.location.search).get("next") ?? "";
    if (requested.startsWith("/") && !requested.startsWith("//")) {
      params.set("next", requested);
    }
    const query = params.toString();

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${query ? `?${query}` : ""}`,
        scopes,
      },
    });

    // On success the browser has already left for the provider, so reaching
    // here at all means the redirect never happened.
    if (error) {
      setError(
        /provider is not enabled/i.test(error.message)
          ? `${provider === "azure" ? "Microsoft" : "Google"} sign-in is not switched on yet. Please use your email and password.`
          : error.message
      );
      setBusy(null);
    }
  }

  const providers = PROVIDERS.filter((p) => ENABLED.includes(p.id));
  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400">{label}</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className={`grid gap-3 ${providers.length > 1 ? "grid-cols-2" : ""}`}>
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => signIn(p.id, p.scopes)}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white
                       px-3 py-2.5 text-sm font-medium text-slate-700 transition
                       hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60
                       dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {p.mark}
            {busy === p.id ? "Redirecting…" : p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
