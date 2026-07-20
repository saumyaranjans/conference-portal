import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addCoAuthor,
  removeCoAuthor,
  submitForReview,
  updateSubmission,
  withdrawSubmission,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PaperUpload } from "@/components/PaperUpload";
import { StatusBadge, RecommendationBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import type { Decision, Review, Submission, Track } from "@/lib/types";

export default async function AuthorSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (!submission) notFound();
  const sub = submission as Submission;

  const [{ data: tracks }, { data: coAuthors }, { data: reviews }, { data: decisions }] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("*")
        .eq("conference_id", sub.conference_id)
        .order("name"),
      supabase
        .from("submission_authors")
        .select("*")
        .eq("submission_id", id)
        .order("author_order"),
      // RLS only returns submitted reviews to the author.
      supabase
        .from("reviews")
        .select(
          "id, score_originality, score_technical, score_clarity, score_relevance, recommendation, comments_to_author, submitted_at"
        )
        .eq("submission_id", id)
        .eq("is_submitted", true),
      supabase
        .from("decisions")
        .select("*")
        .eq("submission_id", id)
        .eq("is_final", true)
        .order("created_at", { ascending: false }),
    ]);

  // Authors may edit while the paper is a draft or awaiting revisions.
  const editable = ["draft", "revisions_requested"].includes(sub.status);
  const canSubmit = editable;
  const canWithdraw = !["withdrawn", "accepted", "rejected"].includes(sub.status);

  return (
    <>
      <div className="mb-2">
        <Link href="/author" className="text-sm text-blue-700 hover:underline">
          ← All submissions
        </Link>
      </div>

      <PageHeader
        title={sub.title || "Untitled submission"}
        subtitle={`Version ${sub.version} · Created ${formatDate(sub.created_at)}`}
        action={<StatusBadge status={sub.status} />}
      />

      {sub.status === "revisions_requested" && (
        <div className="card card-pad bg-orange-50 border-orange-200 mb-6">
          <p className="text-sm text-orange-900 font-medium">
            Revisions requested
          </p>
          <p className="text-sm text-orange-800 mt-1">
            Address the reviewer comments below, upload the revised paper, then
            resubmit. Your submission will move to version {sub.version + 1}.
          </p>
        </div>
      )}

      {/* ---------------- Paper file ---------------- */}
      <Section title="Paper file">
        <div className="card card-pad">
          <PaperUpload
            submissionId={sub.id}
            currentName={sub.file_name}
            editable={editable}
          />
        </div>
      </Section>

      {/* ---------------- Metadata ---------------- */}
      <Section title="Details">
        <ActionForm action={updateSubmission} className="card card-pad space-y-4">
          <input type="hidden" name="id" value={sub.id} />

          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              name="title"
              defaultValue={sub.title}
              disabled={!editable}
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="track_id">
              Track
            </label>
            <select
              id="track_id"
              name="track_id"
              defaultValue={sub.track_id ?? ""}
              disabled={!editable}
              className="input"
            >
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
              rows={7}
              defaultValue={sub.abstract}
              disabled={!editable}
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
              defaultValue={sub.keywords.join(", ")}
              disabled={!editable}
              className="input"
            />
          </div>

          {editable && <SubmitButton>Save changes</SubmitButton>}
        </ActionForm>
      </Section>

      {/* ---------------- Co-authors ---------------- */}
      <Section title="Authors">
        <div className="card divide-y divide-slate-100">
          {(coAuthors ?? []).map((a: any) => (
            <div
              key={a.id}
              className="px-5 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {a.full_name}
                  {a.is_corresponding && (
                    <span className="badge bg-blue-100 text-blue-800 ml-2">
                      Corresponding
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {a.email}
                  {a.affiliation ? ` · ${a.affiliation}` : ""}
                </p>
              </div>
              {editable && !a.is_corresponding && (
                <ActionForm action={removeCoAuthor}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="submission_id" value={sub.id} />
                  <SubmitButton
                    variant="secondary"
                    className="text-xs py-1 px-2"
                  >
                    Remove
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}

          {editable && (
            <ActionForm action={addCoAuthor} className="px-5 py-4">
              <input type="hidden" name="submission_id" value={sub.id} />
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  name="full_name"
                  required
                  placeholder="Full name"
                  className="input"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email"
                  className="input"
                />
                <input
                  name="affiliation"
                  placeholder="Affiliation"
                  className="input"
                />
              </div>
              <SubmitButton variant="secondary" className="mt-3">
                Add co-author
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </Section>

      {/* ---------------- Reviews ---------------- */}
      {(reviews ?? []).length > 0 && (
        <Section title="Reviews">
          <div className="space-y-4">
            {(reviews as Partial<Review>[]).map((r, i) => (
              <div key={r.id} className="card card-pad">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="font-medium text-slate-800">Reviewer {i + 1}</p>
                  {r.recommendation && (
                    <RecommendationBadge value={r.recommendation} />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    ["Originality", r.score_originality],
                    ["Technical", r.score_technical],
                    ["Clarity", r.score_clarity],
                    ["Relevance", r.score_relevance],
                  ].map(([label, score]) => (
                    <div key={label as string} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">{label as string}</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {score ?? "—"}
                        <span className="text-xs text-slate-400 font-normal">
                          /5
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Comments
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {r.comments_to_author || "No written comments."}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---------------- Decision ---------------- */}
      {(decisions ?? []).length > 0 && (
        <Section title="Decision">
          {(decisions as Decision[]).map((d) => (
            <div key={d.id} className="card card-pad">
              <p className="font-medium text-slate-900 capitalize">
                {d.decision.replace("_", " ")}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(d.created_at)}
              </p>
              {d.rationale && (
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
                  {d.rationale}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ---------------- Actions ---------------- */}
      <Section title="Actions">
        <div className="card card-pad flex flex-wrap gap-3">
          {canSubmit && (
            <ActionForm action={submitForReview}>
              <input type="hidden" name="id" value={sub.id} />
              <SubmitButton>
                {sub.status === "revisions_requested"
                  ? "Submit revision"
                  : "Submit for review"}
              </SubmitButton>
            </ActionForm>
          )}

          {canWithdraw && (
            <ActionForm
              action={withdrawSubmission}
              confirm="Withdraw this submission? This cannot be undone."
            >
              <input type="hidden" name="id" value={sub.id} />
              <SubmitButton variant="danger">Withdraw</SubmitButton>
            </ActionForm>
          )}

          {!canSubmit && !canWithdraw && (
            <p className="text-sm text-slate-500">
              This submission is closed. No further action is available.
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
