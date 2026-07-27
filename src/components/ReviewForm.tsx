"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveReview } from "@/lib/actions";
import { RECOMMENDATION_LABELS, type Recommendation, type Review } from "@/lib/types";

const SCORES: { key: keyof Review; label: string; hint: string }[] = [
  { key: "score_originality", label: "Originality", hint: "Novelty of the contribution" },
  { key: "score_technical", label: "Technical quality", hint: "Soundness of the method" },
  { key: "score_clarity", label: "Clarity", hint: "Writing and presentation" },
  { key: "score_relevance", label: "Relevance", hint: "Fit for this conference" },
];

export function ReviewForm({
  assignmentId,
  submissionId,
  review,
  locked,
}: {
  assignmentId: string;
  submissionId: string;
  review: Review | null;
  locked: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  async function run(form: HTMLFormElement, finalise: boolean) {
    if (
      finalise &&
      !window.confirm(
        "Submit this review? Once submitted it cannot be edited."
      )
    )
      return;

    setBusy(true);
    const fd = new FormData(form);
    fd.set("finalise", String(finalise));
    const res = await saveReview(fd);
    setResult(res);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <form
      className="card card-pad space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(e.currentTarget, false);
      }}
    >
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <input type="hidden" name="submission_id" value={submissionId} />

      <fieldset disabled={locked || busy} className="space-y-6">
        {/* ---- Scores ---- */}
        <div className="grid sm:grid-cols-2 gap-4">
          {SCORES.map(({ key, label, hint }) => (
            <div key={key as string}>
              <label className="label" htmlFor={key as string}>
                {label}
              </label>
              <select
                id={key as string}
                name={key as string}
                className="input"
                defaultValue={(review?.[key] as number | null) ?? ""}
              >
                <option value="">Not scored</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} — {["Poor", "Fair", "Good", "Very good", "Excellent"][n - 1]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">{hint}</p>
            </div>
          ))}
        </div>

        {/* ---- Confidence ---- */}
        <div className="max-w-md">
          <label className="label" htmlFor="confidence">
            How well does this paper match your expertise?
          </label>
          <p className="text-xs text-slate-500 mb-1">
            Tells the chair how much weight to give your assessment.
          </p>
          <select
            id="confidence"
            name="confidence"
            className="input"
            defaultValue={review?.confidence ?? ""}
          >
            <option value="">Not stated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} —{" "}
                {
                  [
                    "Educated guess — outside my area",
                    "Low — only slightly familiar with the topic",
                    "Moderate — reasonably familiar with the topic",
                    "High — very familiar with the topic",
                    "Expert — I work directly in this area",
                  ][n - 1]
                }
              </option>
            ))}
          </select>
        </div>

        {/* ---- Recommendation ---- */}
        <div>
          <label className="label">Recommendation</label>
          <div className="grid sm:grid-cols-4 gap-2">
            {(Object.keys(RECOMMENDATION_LABELS) as Recommendation[]).map((r) => (
              <label
                key={r}
                className="flex items-center gap-2 border border-slate-300 rounded-lg
                           px-3 py-2 cursor-pointer hover:bg-slate-50
                           has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="recommendation"
                  value={r}
                  defaultChecked={review?.recommendation === r}
                />
                <span className="text-sm">{RECOMMENDATION_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ---- Comments ---- */}
        <div>
          <label className="label" htmlFor="comments_to_author">
            Comments to the author
          </label>
          <textarea
            id="comments_to_author"
            name="comments_to_author"
            rows={9}
            className="input"
            defaultValue={review?.comments_to_author ?? ""}
            placeholder="Strengths, weaknesses, and what would improve the paper."
          />
          <p className="text-xs text-slate-400 mt-1">
            Shared with the author once a decision is made.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="comments_to_editor">
            Confidential comments to the editor
          </label>
          <textarea
            id="comments_to_editor"
            name="comments_to_editor"
            rows={5}
            className="input"
            defaultValue={review?.comments_to_editor ?? ""}
            placeholder="Anything the editor should know that the author should not see."
          />
          <p className="text-xs text-slate-400 mt-1">
            Never shown to the author.
          </p>
        </div>
      </fieldset>

      {result?.message && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            result.ok ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
          }`}
        >
          {result.message}
        </p>
      )}

      {!locked && (
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" disabled={busy} className="btn-secondary">
            Save draft
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-primary"
            onClick={(e) =>
              run(e.currentTarget.closest("form") as HTMLFormElement, true)
            }
          >
            Submit review
          </button>
        </div>
      )}
    </form>
  );
}
