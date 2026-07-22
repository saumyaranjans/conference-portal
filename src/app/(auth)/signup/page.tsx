"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_DIAL_CODES } from "@/lib/types";

const EMPTY = {
  title: "",
  firstName: "",
  lastName: "",
  gender: "",
  dialCode: "+91",
  mobile: "",
  country: "",
  institution: "",
  department: "",
  designation: "",
  email: "",
  password: "",
  confirm: "",
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    // Everyone starts as an author; elevated roles are granted by an admin.
    const { data, error } = await createClient().auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: `${form.firstName} ${form.lastName}`.trim(),
          first_name: form.firstName,
          last_name: form.lastName,
          title: form.title,
          gender: form.gender,
          mobile: form.mobile ? `${form.dialCode} ${form.mobile}`.trim() : "",
          country: form.country,
          institution: form.institution,
          affiliation: form.institution,
          department: form.department,
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
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Create your account
        </h1>

        <form onSubmit={onSubmit} className="card card-pad space-y-6">
          {/* -------- Personal details -------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Personal details
            </p>
            <div className="grid sm:grid-cols-6 gap-4">
              <div className="sm:col-span-1">
                <label className="label" htmlFor="title">
                  Title
                </label>
                <select
                  id="title"
                  className="input"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                >
                  <option value="">—</option>
                  {["Dr", "Prof", "Mr", "Ms", "Mrs"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="label" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  required
                  className="input"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  required
                  className="input"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  className="input"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  {["Female", "Male", "Other"].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="mobile">
                  Mobile
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country code"
                    className="input w-28 shrink-0"
                    value={form.dialCode}
                    onChange={(e) => set("dialCode", e.target.value)}
                  >
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <option key={c.country} value={c.code}>
                        {c.code} {c.country}
                      </option>
                    ))}
                  </select>
                  <input
                    id="mobile"
                    type="tel"
                    className="input"
                    placeholder="Mobile number"
                    value={form.mobile}
                    onChange={(e) => set("mobile", e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="country">
                  Country
                </label>
                <input
                  id="country"
                  className="input"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* -------- Professional details -------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Professional details
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="institution">
                  Institution
                </label>
                <input
                  id="institution"
                  required
                  className="input"
                  placeholder="University or organisation"
                  value={form.institution}
                  onChange={(e) => set("institution", e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  className="input"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="designation">
                  Designation
                </label>
                <input
                  id="designation"
                  className="input"
                  placeholder="e.g. Professor, Research Scholar, Manager"
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* -------- Account -------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Account
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
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
              <div>
                <label className="label" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                />
              </div>
            </div>
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

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="text-blue-700 hover:underline">
                Sign in
              </Link>
            </p>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Registration does not collect payment. Your participant category is
            recorded for the organisers only.
          </p>
        </form>
      </div>
    </main>
  );
}
