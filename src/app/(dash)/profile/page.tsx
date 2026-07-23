import { requireProfile } from "@/lib/auth";
import { updateProfile } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { InstitutionInput } from "@/components/InstitutionInput";
import { PageHeader, Section } from "@/components/ui/Primitives";
import {
  COUNTRIES,
  COUNTRY_DIAL_CODES,
  PARTICIPANT_CATEGORIES,
  ROLE_LABELS,
} from "@/lib/types";
import { ListAutocomplete } from "@/components/ListAutocomplete";

/** Split a stored "+91 98765..." into its dial code and the number. */
function splitMobile(stored: string): { dial: string; number: string } {
  const codes = [...COUNTRY_DIAL_CODES].sort(
    (a, b) => b.code.length - a.code.length
  );
  for (const c of codes) {
    if (stored.startsWith(c.code)) {
      return { dial: c.code, number: stored.slice(c.code.length).trim() };
    }
  }
  return { dial: "+91", number: stored };
}

export default async function ProfilePage() {
  const profile = await requireProfile();
  const { dial, number } = splitMobile(profile.mobile ?? "");

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Keep your details up to date — they appear on your submissions."
      />

      <ActionForm action={updateProfile} className="space-y-6 max-w-3xl">
        {/* -------- Personal -------- */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-slate-900">Personal details</h2>

          <div className="grid sm:grid-cols-6 gap-4">
            <div className="sm:col-span-1">
              <label className="label" htmlFor="title">
                Title
              </label>
              <select
                id="title"
                name="title"
                defaultValue={profile.title}
                className="input"
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
              <label className="label" htmlFor="first_name">
                First name
              </label>
              <input
                id="first_name"
                name="first_name"
                defaultValue={profile.first_name}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="last_name">
                Last name
              </label>
              <input
                id="last_name"
                name="last_name"
                defaultValue={profile.last_name}
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                defaultValue={profile.gender}
                className="input"
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
                  name="dial_code"
                  aria-label="Country code"
                  defaultValue={dial}
                  className="input w-28 shrink-0"
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={c.country} value={c.code}>
                      {c.code} {c.country}
                    </option>
                  ))}
                </select>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  defaultValue={number}
                  placeholder="Mobile number"
                  className="input"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="country">
                Country
              </label>
              <ListAutocomplete
                id="country"
                name="country"
                options={COUNTRIES}
                defaultValue={profile.country}
                placeholder="Start typing…"
              />
            </div>
          </div>
        </div>

        {/* -------- Professional -------- */}
        <div className="card card-pad space-y-4">
          <h2 className="font-semibold text-slate-900">Professional details</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="institution">
                Institution
              </label>
              <InstitutionInput
                id="institution"
                name="institution"
                defaultValue={profile.institution || profile.affiliation}
                placeholder="Start typing your university…"
              />
              <p className="text-xs text-slate-400 mt-1">
                Not listed? Just type it — it will be saved as entered.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="department">
                Department
              </label>
              <input
                id="department"
                name="department"
                defaultValue={profile.department}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                defaultValue={profile.designation}
                placeholder="e.g. Professor, Research Scholar, Manager"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="orcid">
                ORCID iD
              </label>
              <input
                id="orcid"
                name="orcid"
                defaultValue={profile.orcid}
                placeholder="0000-0002-1825-0097"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="participant_category">
                Participant category
              </label>
              <select
                id="participant_category"
                name="participant_category"
                defaultValue={profile.participant_category}
                className="input"
              >
                <option value="">Select…</option>
                {PARTICIPANT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <SubmitButton>Save profile</SubmitButton>
      </ActionForm>

      {/* -------- Account (read only) -------- */}
      <Section title="Account">
        <div className="card card-pad space-y-1">
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">Email:</span> {profile.email}
          </p>
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">Roles:</span>{" "}
            {profile.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
          </p>
          <p className="text-xs text-slate-400 pt-1">
            Email and roles are managed by the Editorial Office.
          </p>
        </div>
      </Section>
    </>
  );
}
