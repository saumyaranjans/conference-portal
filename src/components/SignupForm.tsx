"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acceptReviewerInvite,
  acceptTrackEditorInvite,
  acceptCoAuthorInvite,
} from "@/lib/actions";
import {
  COUNTRIES,
  COUNTRY_DIAL_CODES,
  SELECTABLE_PARTICIPANT_CATEGORIES,
  VOLUNTEER_ELIGIBLE_CATEGORY,
  type VolunteerRole,
} from "@/lib/types";
import { VolunteerOptIn, type VolunteerTrack } from "@/components/VolunteerOptIn";
import { Captcha, captchaEnabled } from "@/components/Captcha";
import { InstitutionInput } from "@/components/InstitutionInput";
import { ListAutocomplete } from "@/components/ListAutocomplete";

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
  participantCategory: "",
  orcid: "",
  glogiftMember: "",
  glogiftMembershipNo: "",
  volunteerReviewer: false,
  volunteerEditor: false,
  volunteerReviewerTrack: "",
  volunteerEditorTrack: "",
  email: "",
  password: "",
  confirm: "",
};

export type SignupPrefill = Partial<typeof EMPTY>;

/**
 * The registration form. Used bare at /signup, and pre-filled with an
 * `inviteToken` at /reviewer-invite/[token] — where, on success, the new
 * account is granted the reviewer role and assigned to the invited paper.
 */
export function SignupForm({
  prefill,
  inviteToken,
  trackEditorInviteToken,
  coAuthorInviteToken,
  emailLocked = false,
  tracks = [],
}: {
  prefill?: SignupPrefill;
  /** Reviewer invitation — lands them in the reviewer dashboard. */
  inviteToken?: string;
  /** Track Editor invitation — lands them in the Track Queue. */
  trackEditorInviteToken?: string;
  /** Co-author invitation — links them to the submission, lands on /author. */
  coAuthorInviteToken?: string;
  emailLocked?: boolean;
  /** Conference tracks, for the volunteer "which track" question. */
  tracks?: VolunteerTrack[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY, ...prefill });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Bumped on failure so the widget issues a fresh single-use token.
  const [captchaReset, setCaptchaReset] = useState(0);

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

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 12 || form.password.length > 128) {
      setError("Password must be between 12 and 128 characters.");
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setBusy(true);
    const { data, error } = await createClient().auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        captchaToken: captchaToken ?? undefined,
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
          participant_category: form.participantCategory,
          orcid: form.orcid.trim(),
          glogift_member: form.glogiftMember === "yes",
          glogift_membership_no:
            form.glogiftMember === "yes" ? form.glogiftMembershipNo.trim() : "",
          // This form collects every required field, so the account is
          // complete on arrival and skips /complete-profile (see 0075).
          signup_complete: "true",
          // Offers to serve. The trigger ignores these unless the category is
          // faculty, so a hand-crafted signup cannot volunteer a student.
          volunteer_reviewer: String(eligibleToVolunteer && form.volunteerReviewer),
          volunteer_editor: String(eligibleToVolunteer && form.volunteerEditor),
          // Read by the handle_new_user trigger (migration 0082) and cast to
          // uuid there, so an empty string must stay empty rather than "null".
          volunteer_reviewer_track:
            eligibleToVolunteer && form.volunteerReviewer ? form.volunteerReviewerTrack : "",
          volunteer_editor_track:
            eligibleToVolunteer && form.volunteerEditor ? form.volunteerEditorTrack : "",
        },
      },
    });

    if (error) {
      // Someone who already registered can't sign up again — guide them.
      if (coAuthorInviteToken && /already registered|already exists/i.test(error.message)) {
        setError(
          "This email already has an account. Please sign in — the submission will appear on your author dashboard."
        );
      } else if ((inviteToken || trackEditorInviteToken) && /already registered|already exists/i.test(error.message)) {
        setError(
          "This email already has an account. Please sign in — the paper will appear in your reviewer dashboard."
        );
      } else {
        setError(error.message);
      }
      setCaptchaReset((n) => n + 1);
      setBusy(false);
      return;
    }

    if (data.session) {
      if (coAuthorInviteToken) {
        const res = await acceptCoAuthorInvite(coAuthorInviteToken);
        if (!res.ok) {
          setError(res.message ?? "Could not complete registration.");
          setBusy(false);
          return;
        }
        router.push("/author");
      } else if (trackEditorInviteToken) {
        const res = await acceptTrackEditorInvite(trackEditorInviteToken);
        if (!res.ok) {
          setError(res.message ?? "Could not complete the invitation.");
          setBusy(false);
          return;
        }
        router.push("/editor");
      } else if (inviteToken) {
        const res = await acceptReviewerInvite(inviteToken);
        if (!res.ok) {
          setError(res.message ?? "Could not complete the invitation.");
          setBusy(false);
          return;
        }
        router.push("/reviewer");
      } else {
        router.push("/author");
      }
      router.refresh();
    } else {
      setNotice("Check your email to confirm your account, then sign in.");
      setBusy(false);
    }
  }

  return (
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
            <ListAutocomplete
              id="country"
              required
              options={COUNTRIES}
              placeholder="Start typing…"
              value={form.country}
              onChange={(v) => set("country", v)}
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
            <InstitutionInput
              id="institution"
              required
              placeholder="Start typing your university…"
              value={form.institution}
              onChange={(v) => set("institution", v)}
            />
            <p className="text-xs text-slate-400 mt-1">
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
            <p className="text-xs text-slate-400 mt-1">
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
        </div>
      </div>

      {/* -------- Serving the conference (faculty only) -------- */}
      {eligibleToVolunteer && (
        <VolunteerOptIn
          reviewer={form.volunteerReviewer}
          editor={form.volunteerEditor}
          tracks={tracks}
          reviewerTrack={form.volunteerReviewerTrack}
          editorTrack={form.volunteerEditorTrack}
          onChange={setVolunteer}
          onTrackChange={(role, id) =>
            setForm((f) => ({
              ...f,
              [role === "reviewer" ? "volunteerReviewerTrack" : "volunteerEditorTrack"]: id,
            }))
          }
        />
      )}

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
              maxLength={254}
              autoComplete="email"
              readOnly={emailLocked}
              className={`input ${emailLocked ? "bg-slate-100 text-slate-500" : ""}`}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {emailLocked && (
              <p className="text-xs text-slate-400 mt-1">
                This is the address your invitation was sent to.
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              className="input"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Use 12 or more characters.</p>
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
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

      <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />

      <p className="text-xs text-slate-400">
        Registration does not collect payment. Your participant category is
        recorded for the organisers only.
      </p>
    </form>
  );
}
