"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Playfair_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { HomeLink } from "@/components/HomeLink";
import { ThemeToggle } from "@/components/ThemeToggle";

// Elegant display serif for the conference title.
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });

const CONFERENCE =
  "International Conference on AI-Driven Solutions in Management: Flexibility, Digitalisation and Decarbonization";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
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
            GLOGIFT 2027
          </p>
          <h1
            className={`${display.className} mt-4 text-2xl xl:text-3xl font-semibold leading-snug max-w-xl`}
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
      <section className="relative flex items-center justify-center px-5 py-10">
        <div className="absolute top-4 left-4">
          <HomeLink />
        </div>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* compact branding for small screens — mirrors the desktop panel */}
          <div className="lg:hidden mb-8 text-center">
            <img
              src="/glogift-logo.png"
              alt="GLOGIFT"
              className="h-14 w-auto object-contain mx-auto mb-2"
            />
            <p className="text-base font-medium text-slate-600">
              Global Institute of Flexible Systems Management
            </p>
            <p className="mt-3 text-3xl font-bold uppercase tracking-wider text-gradient w-fit mx-auto">
              GLOGIFT 2027
            </p>
            <h1
              className={`${display.className} mt-2 text-base font-semibold text-slate-900 leading-snug`}
            >
              {CONFERENCE}
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <span>Hosted by</span>
              <img
                src="/iim-sambalpur.png"
                alt="Indian Institute of Management Sambalpur"
                className="h-10 w-auto object-contain iim-adaptive"
              />
            </div>
          </div>

          <div className="mb-6">
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
        </div>
      </section>
    </main>
  );
}
