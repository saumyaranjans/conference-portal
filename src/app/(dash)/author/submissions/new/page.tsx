import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Primitives";
import { NewSubmissionForm } from "@/components/NewSubmissionForm";
import {
  MAX_SUBMISSIONS_PER_AUTHOR,
  type Conference,
  type Track,
} from "@/lib/types";

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  // The 2-submission rule counts BOTH roles — papers you submit and papers you
  // co-author (withdrawn excluded) — matching the server-side guard, so the
  // form and its counter don't disagree with what submission will actually do.
  const { count: ownedActive } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("author_id", profile.id)
    .neq("status", "withdrawn");
  const { data: coRows } = await createAdminClient()
    .from("submission_authors")
    .select("submissions(status)")
    .eq("profile_id", profile.id)
    .eq("is_corresponding", false);
  const coActive = (coRows ?? []).filter((r) => {
    const s = (r as any).submissions;
    const status = Array.isArray(s) ? s[0]?.status : s?.status;
    return status && status !== "withdrawn";
  }).length;
  const activeCount = (ownedActive ?? 0) + coActive;

  const atLimit = activeCount >= MAX_SUBMISSIONS_PER_AUTHOR;

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

  if (atLimit) {
    return (
      <>
        <PageHeader title="New Submission" />
        <div className="card card-pad max-w-2xl">
          <p className="font-medium text-slate-900">
            You have reached the submission limit
          </p>
          <p className="text-sm text-slate-600 mt-1.5">
            Each author may hold at most {MAX_SUBMISSIONS_PER_AUTHOR}{" "}
            submissions. To submit a new abstract, withdraw one of your
            existing submissions first.
          </p>
          <Link href="/author" className="btn-primary mt-4">
            Back to my submissions
          </Link>
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
            ? `${list[0].name} (${list[0].acronym} ${String(list[0].year).slice(-2)})`
            : "Choose a conference and track to begin."
        }
      />

      <div className="card card-pad bg-blue-50 border-blue-200 mb-6 max-w-3xl">
        <p className="text-sm text-blue-900">
          Each author may submit a maximum of {MAX_SUBMISSIONS_PER_AUTHOR}{" "}
          abstracts. This will be submission {(activeCount ?? 0) + 1} of{" "}
          {MAX_SUBMISSIONS_PER_AUTHOR}.
        </p>
      </div>

      {error === "limit" && (
        <div className="card card-pad bg-red-50 border-red-200 mb-6 max-w-3xl">
          <p className="text-sm text-red-700">
            Submission limit reached — this abstract was not created.
          </p>
        </div>
      )}

      <NewSubmissionForm
        conferences={list}
        me={{
          full_name: profile.full_name || profile.email,
          email: profile.email,
          affiliation: profile.affiliation || profile.institution,
          designation: profile.designation,
          participant_category: profile.participant_category,
          mobile: profile.mobile,
        }}
      />
    </>
  );
}
