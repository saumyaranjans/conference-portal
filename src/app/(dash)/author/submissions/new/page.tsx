import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createSubmission } from "@/lib/actions";
import { PageHeader } from "@/components/ui/Primitives";
import type { Conference, Track } from "@/lib/types";

export default async function NewSubmissionPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: conferences } = await supabase
    .from("conferences")
    .select("*")
    .eq("is_open", true)
    .order("year", { ascending: false });

  const conference = (conferences?.[0] as Conference) ?? null;

  const { data: tracks } = conference
    ? await supabase
        .from("tracks")
        .select("*")
        .eq("conference_id", conference.id)
        .order("name")
    : { data: [] };

  if (!conference) {
    return (
      <>
        <PageHeader title="New Submission" />
        <div className="card card-pad">
          <p className="text-slate-600">
            Submissions are closed. No conference is currently accepting papers.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New Submission"
        subtitle={`${conference.name} (${conference.acronym} ${conference.year})`}
      />

      <form action={createSubmission} className="card card-pad space-y-5 max-w-3xl">
        <input type="hidden" name="conference_id" value={conference.id} />

        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className="input" />
        </div>

        <div>
          <label className="label" htmlFor="track_id">
            Track
          </label>
          <select id="track_id" name="track_id" required className="input">
            <option value="">Select a track…</option>
            {((tracks ?? []) as Track[]).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="abstract">
            Abstract
          </label>
          <textarea
            id="abstract"
            name="abstract"
            rows={8}
            required
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="keywords">
            Keywords
          </label>
          <input
            id="keywords"
            name="keywords"
            className="input"
            placeholder="machine learning, optimisation, graphs"
          />
          <p className="text-xs text-slate-400 mt-1">Comma separated.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary">
            Create draft
          </button>
          <p className="text-xs text-slate-500">
            You will upload the paper file and add co-authors on the next screen.
          </p>
        </div>
      </form>
    </>
  );
}
