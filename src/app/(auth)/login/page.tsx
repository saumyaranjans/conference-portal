"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HomeLink } from "@/components/HomeLink";
import { OAuthButtons } from "@/components/OAuthButtons";
import { Captcha, captchaEnabled } from "@/components/Captcha";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ROLE_HOME, type AppRole } from "@/lib/types";

// Landing priority for multi-role users (mirrors the proxy / former home page).
const ROLE_PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

const CONFERENCE =
  "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (captchaEnabled && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captchaToken ?? undefined },
    });

    if (error) {
      setError(error.message);
      // The token is spent whether or not the password was right.
      setCaptchaReset((n) => n + 1);
      setBusy(false);
      return;
    }

    // Send the user INTO the portal, not to "/" (which is the public landing).
    // Prefer an explicit ?next= protected path; otherwise their role home.
    // The roles lookup only runs when no ?next= exists (next wins anyway), so
    // the common deep-link login skips a whole browser→DB round trip.
    let dest = "/author";
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//") && next !== "/") {
      dest = next;
    } else {
      try {
        const uid = data.user?.id;
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("roles")
            .eq("id", uid)
            .single();
          const roles = (prof?.roles ?? []) as string[];
          const primary =
            ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "author";
          dest = ROLE_HOME[primary];
        }
      } catch {
        /* fall back to /author */
      }
    }

    // A single push is enough: dashboard routes are fully dynamic (no-store),
    // so the navigation's RSC fetch already renders with the fresh session.
    // The previous `router.refresh()` here re-ran the ENTIRE proxy → layout →
    // page waterfall a second time, doubling perceived login latency.
    router.push(dest);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* ============ Branding panel ============ */}
      <aside
        className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 42%,#0e7490 78%,#0f766e 100%)",
        }}
      >
        {/* decorative rings */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 top-32 h-96 w-96 rounded-full border border-white/10"
          aria-hidden
        />

        <div className="relative flex items-center gap-4">
          <img
            src="/glogift-logo.png"
            alt="GLOGIFT"
            className="h-14 w-auto object-contain shrink-0"
          />
          <p className="text-lg font-medium text-white/90 whitespace-nowrap">
            Global Institute of Flexible Systems Management
          </p>
        </div>

        <div className="relative">
          <p className="text-4xl xl:text-5xl font-bold uppercase tracking-wider text-gradient-light w-fit">
            GLOGIFT 27
          </p>
          <h1
            className="mt-4 max-w-xl font-serif text-2xl font-semibold leading-snug xl:text-3xl"
          >
            {CONFERENCE}
          </h1>
        </div>

        <div className="relative flex items-center gap-4 text-sm text-white/70">
          <span>Hosted by</span>
          <img
            src="/iim-sambalpur.png"
            alt="Indian Institute of Management Sambalpur"
            className="h-14 w-auto object-contain"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
      </aside>

      {/* ============ Form panel ============ */}
      <section className="relative flex items-center justify-center px-5 py-6 lg:py-10">
        <div className="absolute top-4 left-4">
          <HomeLink />
        </div>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* compact branding for small screens — mirrors the desktop panel */}
          <div className="lg:hidden mb-5 text-center">
            <img
              src="/glogift-logo.png"
              alt="GLOGIFT"
              className="h-12 w-auto object-contain mx-auto mb-2"
            />
            <p className="text-base font-medium text-slate-600">
              Global Institute of Flexible Systems Management
            </p>
            <p className="mt-2 text-2xl font-bold uppercase tracking-wider text-gradient w-fit mx-auto">
              GLOGIFT 27
            </p>
            <h1
              className="mt-2 font-serif text-sm font-semibold leading-snug text-slate-900"
            >
              {CONFERENCE}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="shrink-0">Hosted by</span>
              {/* min-w-0 + max-w-full lets the wide wordmark scale down instead
                  of overflowing a 320px viewport. */}
              <img
                src="/iim-sambalpur.png"
                alt="Indian Institute of Management Sambalpur"
                className="h-9 w-auto min-w-0 max-w-full object-contain iim-adaptive"
              />
            </div>
          </div>

          <div className="mb-4 lg:mb-6">
            <h2 className="text-2xl font-semibold text-gradient w-fit">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">
              Welcome — access your dashboard.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.5 10.5 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.774 3.162 10.066 7.5a10.5 10.5 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />

            <OAuthButtons />

            <div className="text-sm text-center space-y-1 pt-1">
              <p>
                <Link
                  href="/forgot-password"
                  className="text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
              <p className="text-slate-500">
                No account?{" "}
                <Link href="/signup" className="text-blue-700 hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          </form>

          {/* What the portal is and what signing in with a provider actually
              shares. Placed at the point of decision — someone about to hand
              over an account is the person who should read it. */}
          <details className="group mt-6 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700 marker:content-[''] hover:text-blue-700 dark:text-slate-300">
              About the GLOGIFT 27 Submission Portal
              <span
                aria-hidden
                className="float-right transition-transform group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <div className="mt-3 space-y-2">
            <p>
              This is the official submission portal for GLOGIFT 27. Authors use
              it to submit an abstract or full paper to one of the ten
              conference tracks, add co-authors, respond to reviewer comments,
              upload a camera-ready copy, register and download their
              certificate. Reviewers read the papers assigned to them and submit
              evaluations; Track Editors and the Editorial Office assign
              reviewers, record decisions and build the programme.
            </p>
            <p>
              An account is required to submit or review. Register with an email
              address and password, or sign in with Google or Microsoft — from
              those we receive only your{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                name and email address
              </strong>
              , used solely to create and identify your conference account. We
              never receive your password, and we do not use this information
              for advertising or share it with third parties.
            </p>
            <p className="mt-2 text-slate-500">
              See our{" "}
              <Link href="/privacy" className="text-blue-700 hover:underline">
                privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-blue-700 hover:underline">
                terms of use
              </Link>
              . Operated by the Indian Institute of Management Sambalpur in
              association with the GIFT Society.
            </p>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
