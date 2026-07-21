import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createConference,
  updateConference,
  upsertTrack,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageHeader, Section } from "@/components/ui/Primitives";
import type { Conference, Track } from "@/lib/types";

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`. */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export default async function AdminTracksPage() {
  await requireRole("admin", "chief");
  const supabase = await createClient();

  const { data: conferences } = await supabase
    .from("conferences")
    .select("*, tracks(*, profiles(full_name))")
    .order("year", { ascending: false });

  const list = (conferences ?? []) as (Conference & {
    tracks: (Track & { profiles: any })[];
  })[];

  return (
    <>
      <PageHeader
        title="Conferences & Tracks"
        subtitle="Manage every conference edition, its tracks, codes and deadlines."
      />

      {/* -------- New conference -------- */}
      <Section title="Add a conference">
        <ActionForm action={createConference} className="card card-pad">
          <div className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="label" htmlFor="new-name">
                Name
              </label>
              <input id="new-name" name="name" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="new-acronym">
                Acronym
              </label>
              <input id="new-acronym" name="acronym" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="new-year">
                Year
              </label>
              <input
                id="new-year"
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                className="input"
              />
            </div>
            <SubmitButton>Create</SubmitButton>
          </div>
        </ActionForm>
      </Section>

      {/* -------- Each conference -------- */}
      {list.map((conference) => (
        <Section
          key={conference.id}
          title={`${conference.acronym} ${conference.year}${conference.is_open ? "" : " · closed"}`}
        >
          <ActionForm
            action={updateConference}
            className="card card-pad space-y-4 mb-4"
          >
            <input type="hidden" name="id" value={conference.id} />
            <div className="grid sm:grid-cols-[2fr_1fr_1fr] gap-4">
              <div>
                <label className="label">Name</label>
                <input name="name" defaultValue={conference.name} className="input" />
              </div>
              <div>
                <label className="label">Acronym</label>
                <input
                  name="acronym"
                  defaultValue={conference.acronym}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Year</label>
                <input
                  name="year"
                  type="number"
                  defaultValue={conference.year}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={conference.description}
                className="input"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                ["submission_deadline", "Submission deadline"],
                ["review_deadline", "Review deadline"],
                ["notification_date", "Notification date"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    name={key}
                    type="datetime-local"
                    defaultValue={toLocalInput(
                      conference[key as keyof Conference] as string | null
                    )}
                    className="input"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-end gap-4">
              <div>
                <label className="label">Submissions</label>
                <select
                  name="is_open"
                  defaultValue={String(conference.is_open)}
                  className="input"
                >
                  <option value="true">Open</option>
                  <option value="false">Closed</option>
                </select>
              </div>
              <SubmitButton>Save conference</SubmitButton>
            </div>
          </ActionForm>

          {/* tracks for this conference */}
          <div className="card divide-y divide-slate-100">
            {conference.tracks
              ?.sort((a, b) => a.code.localeCompare(b.code))
              .map((t) => (
                <ActionForm key={t.id} action={upsertTrack} className="px-5 py-4">
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="hidden"
                    name="conference_id"
                    value={conference.id}
                  />
                  <div className="grid sm:grid-cols-[80px_1fr_2fr_auto] gap-3 items-start">
                    <input
                      name="code"
                      defaultValue={t.code}
                      placeholder="Code"
                      maxLength={5}
                      className="input font-mono uppercase"
                    />
                    <input name="name" defaultValue={t.name} className="input" />
                    <input
                      name="description"
                      defaultValue={t.description}
                      className="input"
                    />
                    <SubmitButton variant="secondary">Save</SubmitButton>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Editor: {t.profiles?.full_name ?? "unassigned"} — assign from
                    the Editorial Board page.
                  </p>
                </ActionForm>
              ))}

            <ActionForm action={upsertTrack} className="px-5 py-4 bg-slate-50">
              <input type="hidden" name="conference_id" value={conference.id} />
              <div className="grid sm:grid-cols-[80px_1fr_2fr_auto] gap-3">
                <input
                  name="code"
                  required
                  placeholder="Code"
                  maxLength={5}
                  className="input font-mono uppercase"
                />
                <input
                  name="name"
                  required
                  placeholder="New track name"
                  className="input"
                />
                <input
                  name="description"
                  placeholder="Description"
                  className="input"
                />
                <SubmitButton>Add track</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Section>
      ))}
    </>
  );
}
