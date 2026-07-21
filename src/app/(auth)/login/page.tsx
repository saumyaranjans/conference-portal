"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* -------- Branding -------- */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-5 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-3">
            <img
              src="/glogift.png"
              alt="GLOGIFT — Global Institute of Flexible Systems Management"
              className="h-12 w-auto object-contain"
            />
            <span className="h-10 w-px bg-slate-200" aria-hidden />
            <img
              src="/iim-sambalpur.png"
              alt="Indian Institute of Management Sambalpur"
              className="h-12 w-auto object-contain"
            />
          </div>

          <h1 className="text-lg font-semibold text-slate-900 mt-5 leading-snug">
            {CONFERENCE}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            GLOGIFT 2027 · Annual Conference of the Global Institute of Flexible
            Systems Management
          </p>
          <p className="text-sm text-slate-500">
            Hosted by Indian Institute of Management Sambalpur
          </p>
        </div>

        {/* -------- Sign in -------- */}
        <form onSubmit={onSubmit} className="card card-pad space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Sign in</h2>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
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
                  // eye-off
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
                  // eye
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

          <div className="text-sm text-center space-y-1">
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
    </main>
  );
}
