"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    affiliation: "",
    designation: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Everyone starts as an author; elevated roles are granted by an admin.
    const { data, error } = await createClient().auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          affiliation: form.affiliation,
          designation: form.designation,
        },
      },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      router.push("/author");
      router.refresh();
    } else {
      setNotice("Check your email to confirm your account, then sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Create your account
        </h1>

        <form onSubmit={onSubmit} className="card card-pad space-y-4">
          <div>
            <label className="label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              required
              className="input"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="affiliation">
              Affiliation
            </label>
            <input
              id="affiliation"
              className="input"
              placeholder="University or organisation"
              value={form.affiliation}
              onChange={(e) => set("affiliation", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="designation">
              Professional designation
            </label>
            <select
              id="designation"
              required
              className="input"
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="Academician">Academician</option>
              <option value="Research (or PhD) Scholar">
                Research (or PhD) Scholar
              </option>
              <option value="Industry Professional">
                Industry Professional
              </option>
              <option value="UG or PG Student">UG or PG Student</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">At least 8 characters.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Creating…" : "Create account"}
          </button>

          <p className="text-sm text-slate-500 text-center">
            Already registered?{" "}
            <Link href="/login" className="text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
