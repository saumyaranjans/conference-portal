import { formatDate } from "@/components/ui/Primitives";
import {
  AI_FLAG_PERCENT,
  INTEGRITY_PROVIDER_LABELS,
  SIMILARITY_FLAG_PERCENT,
  type Submission,
} from "@/lib/types";

/** Colour a score against its flag threshold: clear, borderline, or flagged. */
function scoreClass(value: number | null, flagAt: number): string {
  if (value === null) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  if (value >= flagAt) return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300";
  if (value >= flagAt * 0.7)
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
}

function Score({
  label,
  value,
  flagAt,
}: {
  label: string;
  value: number | null;
  flagAt: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`badge text-base font-bold ${scoreClass(value, flagAt)}`}>
          {value === null ? "Not checked" : `${value}%`}
        </span>
        {value !== null && value >= flagAt && (
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
            above {flagAt}% — review
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Research-integrity record for a manuscript: the similarity index and AI
 * writing percentage, the tool they came from, and the provider's report.
 *
 * READ-ONLY here. The Editorial Office runs the check and enters the scores in
 * Submission Management; the Track Editor and Convener see the result while
 * they judge the paper, but cannot alter it — the number and the judgement it
 * informs should not come from the same hand.
 *
 * The scores are advisory. They flag a paper for the Track Editor to look at;
 * they never decide it. Similarity is frequently quotation or method
 * boilerplate, and AI-writing detectors are unreliable enough — especially for
 * authors writing in a second language — that an automatic reject would be
 * indefensible.
 */
export function IntegrityCheck({
  submission,
  checkedByName,
  reportUrl,
}: {
  submission: Submission;
  checkedByName?: string | null;
  /** Signed URL to the stored report, resolved by the page. */
  reportUrl?: string | null;
}) {
  const checked = Boolean(submission.integrity_checked_at);

  return (
    <section className="card card-pad space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Research integrity check
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Recorded by the Editorial Office. Advisory — these flag a paper for
            your attention, they do not decide it.
          </p>
        </div>
        {checked && (
          <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {INTEGRITY_PROVIDER_LABELS[submission.integrity_provider] ??
              submission.integrity_provider}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Score
          label="Similarity index"
          value={submission.similarity_index}
          flagAt={SIMILARITY_FLAG_PERCENT}
        />
        <Score
          label="AI writing"
          value={submission.ai_percentage}
          flagAt={AI_FLAG_PERCENT}
        />
      </div>

      {checked && (
        <div className="space-y-1 text-xs text-slate-500">
          <p>
            Recorded {formatDate(submission.integrity_checked_at!)}
            {checkedByName ? ` by ${checkedByName}` : ""}.
          </p>
          {submission.integrity_notes && (
            <p className="text-slate-600 dark:text-slate-300">
              {submission.integrity_notes}
            </p>
          )}
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              ⬇ Open provider report (PDF)
            </a>
          )}
        </div>
      )}

    </section>
  );
}
