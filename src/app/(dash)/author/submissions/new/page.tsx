import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import { NewSubmissionForm } from "@/components/NewSubmissionForm";
import type { Conference, Track } from "@/lib/types";

export default async function NewSubmissionPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: conferences } = await supabase
    .from("conferences")
    .select("*, tracks(*)")
    .eq("is_open", true)
    .order("year", { ascending: false });

  const list = ((conferences ?? []) as (Conference & { tracks: Track[] })[]).map(
    (c) => ({
      ...c,
      tracks: (c.tracks ?? []).sort((a, b) => a.code.localeCompare(b.code)),
    })
  );

  if (list.length === 0) {
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
        subtitle={
          list.length === 1
            ? `${list[0].name} (${list[0].acronym} ${list[0].year})`
            : "Choose a conference and track to begin."
        }
      />
      <NewSubmissionForm conferences={list} />
    </>
  );
}
