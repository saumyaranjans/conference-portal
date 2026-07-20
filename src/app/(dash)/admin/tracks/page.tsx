import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateConference, upsertTrack } from "@/lib/actions";
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
    .select("*")
    .order("year", { ascending: false });

  const conference = ((conferences ?? []) as Conference[])[0];

  if (!conference) {
    return (
      <>
        <PageHeader title="Conference & Tracks" />
        <div className="card card-pad">
          <p className="text-slate-600">
            No conference configured. Run the seed migration to create one.
          </p>
        </div>
      </>
    );
  }

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, profiles(full_name)")
    .eq("conference_id", conference.id)
    .order("name");

  return (
    <>
      <PageHeader
        title="Conference & Tracks"
        subtitle="Deadlines, open/closed state, and the track list."
      />

      <Section title="Conference">
        <ActionForm action={updateConference} className="card card-pad space-y-4">
          <input type="hidden" name="id" value={conference.id} />

          <div className="grid sm:grid-cols-[2fr_1fr_1fr] gap-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={conference.name}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="acronym">
                Acronym
              </label>
              <input
                id="acronym"
                name="acronym"
                defaultValue={conference.acronym}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="year">
                Year
              </label>
              <input
                id="year"
                name="year"
                type="number"
                defaultValue={conference.year}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
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
                <label className="label" htmlFor={key}>
                  {label}
                </label>
                <input
                  id={key}
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

          <div>
            <label className="label" htmlFor="is_open">
              Submissions
            </label>
            <select
              id="is_open"
              name="is_open"
              defaultValue={String(conference.is_open)}
              className="input max-w-xs"
            >
              <option value="true">Open — authors can submit</option>
              <option value="false">Closed</option>
            </select>
          </div>

          <SubmitButton>Save conference</SubmitButton>
        </ActionForm>
      </Section>

      <Section title="Tracks">
        <div className="card divide-y divide-slate-100">
          {((tracks ?? []) as (Track & { profiles: any })[]).map((t) => (
            <ActionForm key={t.id} action={upsertTrack} className="px-5 py-4">
              <input type="hidden" name="id" value={t.id} />
              <input
                type="hidden"
                name="conference_id"
                value={conference.id}
              />
              <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-start">
                <input name="name" defaultValue={t.name} className="input" />
                <input
                  name="description"
                  defaultValue={t.description}
                  className="input"
                />
                <SubmitButton variant="secondary">Save</SubmitButton>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Editor: {t.profiles?.full_name ?? "unassigned"} — assign from the
                Editorial Board page.
              </p>
            </ActionForm>
          ))}

          <ActionForm action={upsertTrack} className="px-5 py-4 bg-slate-50">
            <input type="hidden" name="conference_id" value={conference.id} />
            <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3">
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
    </>
  );
}
