import {
  statusLabel,
  RECOMMENDATION_LABELS,
  type Recommendation,
  type SubmissionStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  revisions_requested: "bg-orange-100 text-orange-800",
  abstract_accepted: "bg-teal-100 text-teal-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-slate-200 text-slate-600",
};

export function StatusBadge({
  status,
  submissionType,
  stage,
}: {
  status: SubmissionStatus;
  /** Pass the submission's type + stage so the label reads Abstract vs Manuscript. */
  submissionType?: string | null;
  stage?: string | null;
}) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      {statusLabel(status, submissionType, stage)}
    </span>
  );
}

const REC_STYLES: Record<Recommendation, string> = {
  accept: "bg-emerald-100 text-emerald-800",
  minor_revision: "bg-lime-100 text-lime-800",
  major_revision: "bg-amber-100 text-amber-800",
  reject: "bg-red-100 text-red-800",
};

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return (
    <span className={`badge ${REC_STYLES[value]}`}>
      {RECOMMENDATION_LABELS[value]}
    </span>
  );
}
