"use client";

import { useState } from "react";
import { completeProfile } from "@/lib/profileCompletion";
import { InstitutionInput } from "@/components/InstitutionInput";
import { ListAutocomplete } from "@/components/ListAutocomplete";
import {
  COUNTRIES,
  COUNTRY_DIAL_CODES,
  SELECTABLE_PARTICIPANT_CATEGORIES,
  VOLUNTEER_ELIGIBLE_CATEGORY,
  type VolunteerRole,
} from "@/lib/types";
import { VolunteerOptIn } from "@/components/VolunteerOptIn";

/**
 * The second half of registration for someone who signed in with Google or
 * Microsoft. It asks only what the provider could not tell us; the email is
 * shown but fixed, since it is the verified identity the account rests on, and
 * there is no password field because there is no password.
 *
 * The field set and validation mirror the email + password form, so the two
 * routes in produce the same profile.
 */
export function CompleteProfileForm({
  email,
  firstName,
  lastName,
  provider,
}: {
  email: string;
  firstName: string;
  lastName: string;
  /** Shown so people recognise how they got here. */
  provider?: string;
}) {
  const [form, setForm] = useState({
    title: "",
    firstName,
    lastName,
    gender: "",
    dialCode: "+91",
    mobile: "",
    country: "",
    institution: "",
    department: "",
    designation: "",
    participantCategory: "",
    orcid: "",
    glogiftMember: "",
    glogiftMembershipNo: "",
    volunteerReviewer: false,
    volunteerEditor: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setVolunteer(role: VolunteerRole, next: boolean) {
    setForm((f) => ({
      ...f,
      [role === "reviewer" ? "volunteerReviewer" : "volunteerEditor"]: next,
    }));
  }


  /** Reviewing and chairing are offered to faculty only. */
  const eligibleToVolunteer =
    form.participantCategory === VOLUNTEER_ELIGIBLE_CATEGORY;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const fd = new FormData();
    fd.set("title", form.title);
    fd.set("first_name", form.firstName);
    fd.set("last_name", form.lastName);
    fd.set("gender", form.gender);
    fd.set("dial_code", form.dialCode);
    fd.set("mobile", form.mobile);
    fd.set("country", form.country);
    fd.set("institution", form.institution);
    fd.set("department", form.department);
    fd.set("designation", form.designation);
    fd.set("participant_category", form.participantCategory);
    fd.set("orcid", form.orcid);
    fd.set("glogift_member", form.glogiftMember);
    fd.set("glogift_membership_no", form.glogiftMembershipNo);
    fd.set("volunteer_reviewer", String(eligibleToVolunteer && form.volunteerReviewer));
    fd.set("volunteer_editor", String(eligibleToVolunteer && form.volunteerEditor));

    // On success the action redirects, so control does not return here.
    const res = await completeProfile(fd);
    if (res && !res.ok) {
      setError(res.message ?? "Could not save your details.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad space-y-6">
      <div className="rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Signed in as <b>{email}</b>
          {provider && (
            <span className="text-slate-500"> via {provider}</span>
          )}
          .
        </p>
        <p className="mt-1 text-xs text-slate-500">
          We just need a few details your account could not supply. This is a
          one-off — you will go straight to your dashboard next time.
        </p>
      </div>

      {/* -------- Personal details -------- */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Personal details
        </p>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="title">
              Title
            </label>
            <select
              id="title"
              required
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
              required
              className="input"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="">Select…</option>
              {["Female", "Male", "Other", "Prefer not to say"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4">
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
                required
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={15}
                className="input w-full font-mono tracking-wide"
                placeholder="10-digit number"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
              />
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="country">
              Country
            </label>
            <input
              id="country"
              required
              maxLength={60}
              autoComplete="country-name"
              className="input"
              placeholder="Country"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* -------- Professional details -------- */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Professional details
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="institution">
              Institution
            </label>
            <InstitutionInput
              id="institution"
              required
              placeholder="Start typing your university…"
              value={form.institution}
              onChange={(v) => set("institution", v)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Not listed? Just type your institution name — it will be saved as
              entered.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <input
              id="department"
              required
              className="input"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="designation">
              Designation
            </label>
            <input
              id="designation"
              required
              className="input"
              placeholder="e.g. Professor, Research Scholar, Manager"
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="participantCategory">
              Participant category
            </label>
            <select
              id="participantCategory"
              required
              className="input"
              value={form.participantCategory}
              onChange={(e) => set("participantCategory", e.target.value)}
            >
              <option value="">Select…</option>
              {SELECTABLE_PARTICIPANT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="orcid">
              ORCID iD <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="orcid"
              className="input"
              placeholder="0000-0002-1825-0097"
              value={form.orcid}
              onChange={(e) => set("orcid", e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              16 digits in the form 0000-0000-0000-0000.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="glogiftMember">
              Do you have GIFT Society Membership?
            </label>
            <select
              id="glogiftMember"
              required
              className="input"
              value={form.glogiftMember}
              onChange={(e) => set("glogiftMember", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {form.glogiftMember === "yes" && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="glogiftMembershipNo">
                GIFT Society Membership number
              </label>
              <input
                id="glogiftMembershipNo"
                required
                className="input"
                placeholder="Your membership number"
                value={form.glogiftMembershipNo}
                onChange={(e) => set("glogiftMembershipNo", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {eligibleToVolunteer && (
        <VolunteerOptIn
          reviewer={form.volunteerReviewer}
          editor={form.volunteerEditor}
          onChange={setVolunteer}
        />
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Finish registration"}
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Registration does not collect payment. Your participant category is
        recorded for the organisers only.
      </p>
    </form>
  );
}
