import { RecommendationBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/components/ui/Primitives";
import { reviewOf } from "@/lib/types";

/**
 * Renders every completed review for a submission. `showConfidential`
 * gates the reviewer's private note to the editor — never pass true on a
 * surface an author can reach.
 */
export function ReviewPanel({
  assignments,
  showConfidential = false,
}: {
  assignments: any[];
  showConfidential?: boolean;
}) {
  const done = assignments.filter((a) => reviewOf(a)?.is_submitted);

  if (done.length === 0) {
    return (
      <div className="card card-pad">
        <p className="text-sm text-slate-500">No completed reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {done.map((a, i) => {
        const r = reviewOf(a);
        const avg =
          [
            r.score_originality,
            r.score_technical,
            r.score_clarity,
            r.score_relevance,
          ].filter((x) => x != null).length > 0
            ? (
                [
                  r.score_originality,
                  r.score_technical,
                  r.score_clarity,
                  r.score_relevance,
                ]
                  .filter((x) => x != null)
                  .reduce((s: number, x: number) => s + x, 0) /
                [
                  r.score_originality,
                  r.score_technical,
                  r.score_clarity,
                  r.score_relevance,
                ].filter((x) => x != null).length
              ).toFixed(1)
            : "—";

        return (
          <div key={a.id} className="card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="font-medium text-slate-900">
                  Reviewer {a.reviewer_number ?? i + 1}
                  {showConfidential && (
                    <span className="text-slate-400 font-normal text-sm">
                      {" "}
                      — {a.profiles?.full_name || a.profiles?.email}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  Submitted {formatDate(r.submitted_at)}
                  {r.confidence ? ` · Confidence ${r.confidence}/5` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  Avg <strong className="text-slate-800">{avg}</strong>
                </span>
                {r.recommendation && (
                  <RecommendationBadge value={r.recommendation} />
                )}
              </div>
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
                    {(score as number) ?? "—"}
                    <span className="text-xs text-slate-400 font-normal">/5</span>
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Comments to author
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {r.comments_to_author || "—"}
            </p>

            {showConfidential && r.comments_to_editor && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">
                  Confidential — editor only
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">
                  {r.comments_to_editor}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
