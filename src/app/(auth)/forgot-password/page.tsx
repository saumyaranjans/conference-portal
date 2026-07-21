"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Reset your password
        </h1>

        {sent ? (
          <div className="card card-pad space-y-4 text-center">
            <p className="text-sm text-slate-700">
              If an account exists for <strong>{email}</strong>, a reset link is
              on its way. Open it to choose a new password.
            </p>
            <Link href="/login" className="btn-secondary w-full">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card card-pad space-y-4">
            <p className="text-sm text-slate-500">
              Enter your email and we&apos;ll send you a link to set a new
              password.
            </p>
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-sm text-slate-500 text-center">
              Remembered it?{" "}
              <Link href="/login" className="text-blue-700 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
