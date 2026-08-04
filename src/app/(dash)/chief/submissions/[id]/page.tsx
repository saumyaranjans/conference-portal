import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withdrawSubmission, overrideDecision } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PaperDownload } from "@/components/PaperUpload";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ManuscriptFilesView } from "@/components/ManuscriptFilesView";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import {
  DELETABLE_SUBMISSION_STATUSES,
  reviewOf,
  participationModeLabel,
  submissionTypeLabel,
  versionLabel,
  type Submission,
} from "@/lib/types";

export default async function ChiefSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("chief");
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "*, tracks(name, conferences(name, acronym, year), profiles(full_name)), author:profiles!submissions_author_id_fkey(full_name, email)"
    )
    .eq("id", id)
    .single();

  if (!submission) notFound();
  const sub = submission as Submission & { tracks: any };

  const [{ data: assignments }, { data: decisions }, { data: coAuthors }, { data: stats }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "*, profiles!assignments_reviewer_id_fkey(full_name, email), reviews(*)"
        )
        .eq("submission_id", id),
      supabase
        .from("decisions")
        .select("*, profiles!decisions_decided_by_fkey(full_name)")
        .eq("submission_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("submission_authors")
        .select("*")
        .eq("submission_id", id)
        .order("author_order"),
      supabase
        .from("submission_review_stats")
        .select("*")
        .eq("submission_id", id)
        .maybeSingle(),
    ]);

  // Pathway B manuscript package (convener sees everything incl. camera-ready).
  const { data: manuscriptFiles } =
    (sub as any).stage === "full_paper"
      ? await supabase
          .from("submission_files")
          .select("id, slot, file_name, file_path")
          .eq("submission_id", id)
      : { data: [] as any[] };

  const rows = (assignments ?? []) as any[];
  const decisionRows = (decisions ?? []) as any[];

  // Author-facing feedback only: numbered, unnamed, comments_to_author alone.
  const authorFacingReviews = rows
    .filter((a) => reviewOf(a)?.is_submitted)
    .map((a, i) => ({
      label: `Reviewer ${a.reviewer_number ?? i + 1}`,
      recommendation: reviewOf(a)?.recommendation,
      comments: reviewOf(a)?.comments_to_author,
    }));
  const conf = sub.tracks?.conferences;
  const conferenceBrand =
    conf?.acronym && conf?.year ? `${conf.acronym} ${String(conf.year).slice(-2)}` : "GLOGIFT 27";
  // The decision that still stands; overridden ones live in the history below.
  const chairDecision = decisionRows.find((d) => !d.superseded_at) ?? null;
  const isFinal = ["accepted", "rejected"].includes(sub.status);

  return (
    <>
      <div className="mb-2">
        <Link href="/chief" className="text-sm text-blue-700 hover:underline">
          ← Convener
        </Link>
      </div>

      <PageHeader
        title={sub.title}
        subtitle={`${sub.paper_id ? `Paper ${sub.paper_id} · ` : ""}${sub.tracks?.name ?? "No track"} · Editor: ${
          sub.tracks?.profiles?.full_name ?? "unassigned"
        } · ${versionLabel(sub.version)}`}
        action={
          <StatusBadge
            status={sub.status}
            submissionType={(sub as any).submission_type}
            stage={(sub as any).stage}
            version={sub.version}
          />
        }
      />

      {/* ---- Roll-up ---- */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            ["Reviews in", `${(stats as any).completed_count}/${(stats as any).assigned_count}`],
            ["Avg score", (stats as any).avg_score ?? "—"],
            ["Accept", (stats as any).rec_accept],
            ["Revise", (stats as any).rec_minor + (stats as any).rec_major],
            ["Reject", (stats as any).rec_reject],
          ].map(([label, value]) => (
            <div key={label as string} className="card card-pad">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {label as string}
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {value as string | number}
              </p>
            </div>
          ))}
        </div>
      )}

      <Section title="Submission">
        <div className="card card-pad space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Authors
            </p>
            <p className="text-sm text-slate-700">
              {((coAuthors ?? []) as any[])
                .map((a) => `${a.full_name} (${a.affiliation || "—"})`)
                .join("; ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Abstract
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {sub.abstract}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Level of participation
              </p>
              <p className="text-sm text-slate-700">
                {submissionTypeLabel(sub.submission_type)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Attendance format
              </p>
              <p className="text-sm text-slate-700">
                {participationModeLabel(sub.participation_mode)}
              </p>
            </div>
          </div>

          {(sub as any).stage === "full_paper" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Full paper (manuscript package)
              </p>
              <ManuscriptFilesView
                role="chief"
                submissionId={sub.id}
                files={(manuscriptFiles as any[]) ?? []}
                cameraReadyBuiltAt={(sub as any).full_paper_pdf_built_at}
                reviewCopyBuiltAt={(sub as any).full_paper_pdf_built_at}
              />
            </div>
          ) : (
            <>
              <PaperDownload filePath={sub.file_path} fileName={sub.file_name} />
              {sub.file_path && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Manuscript preview
                  </p>
                  <DocumentViewer
                    filePath={sub.file_path}
                    fileName={sub.file_name}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Reviews">
        <ReviewPanel assignments={rows} showConfidential />
      </Section>

      {/* ---- What the Track Editor decided ---- */}
      <Section title="Track Editor decision">
        <div className="card card-pad space-y-2">
          {chairDecision ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                  {chairDecision.decision.replace("_", " ")}
                </span>
                <span className="badge bg-emerald-100 text-emerald-800">
                  Decided by the Track Editor
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {chairDecision.profiles?.full_name ?? "—"} ·{" "}
                {formatDate(chairDecision.created_at)}
              </p>
              {chairDecision.rationale && (
                <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                  {chairDecision.rationale}
                </p>
              )}
              <p className="text-xs text-slate-500">
                The Track Editor handles this paper. As Convener you may reassign
                it, or override the decision directly below.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              The Track Editor has not recorded a decision yet.
            </p>
          )}
        </div>
      </Section>

      {/* ---- Convener override — final authority, both stages ---- */}
      <Section title="Convener override">
        <div className="card card-pad">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            As Convener you may set or overturn the final decision on this{" "}
            {(sub as any).stage === "full_paper" ? "manuscript" : "abstract"},
            regardless of the Track Editor. This supersedes any earlier decision
            and emails all authors that the Convener has decided.
          </p>
          <ActionForm
            action={overrideDecision}
            confirm="Override the decision and notify all authors? This supersedes the current decision."
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="submission_id" value={sub.id} />
            <div>
              <label className="label" htmlFor="ov_decision">
                Decision
              </label>
              <select
                id="ov_decision"
                name="decision"
                defaultValue="accept"
                className="input max-w-xs"
              >
                <option value="accept">Accept</option>
                <option value="revisions_requested">Request revision</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ov_message">
                Message to authors (optional)
              </label>
              <textarea
                id="ov_message"
                name="message"
                rows={3}
                className="input"
                placeholder="Any note the authors should see with this decision…"
              />
            </div>
            <SubmitButton variant="danger">
              Record Convener decision
            </SubmitButton>
          </ActionForm>
        </div>
      </Section>

      {/* ---- Decision history ---- */}
      {decisionRows.length > 0 && (
        <Section title="Decision history">
          <div className="space-y-3">
            {decisionRows.map((d) => (
              <div key={d.id} className="card card-pad">
                <div className="flex items-center gap-3">
                  <span className="font-medium capitalize text-slate-900">
                    {d.decision.replace("_", " ")}
                  </span>
                  <span
                    className={`badge ${
                      d.superseded_at
                        ? "bg-slate-200 text-slate-600"
                        : d.is_final
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.superseded_at
                      ? "Overridden — visible to you only"
                      : d.is_final
                        ? "Final"
                        : "Editor recommendation"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {d.profiles?.full_name ?? "—"} · {formatDate(d.created_at)}
                </p>
                {d.rationale && (
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                    {d.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- Withdraw on the author's behalf ---- */}
      {["submitted", "under_review", "revisions_requested"].includes(
        sub.status
      ) && (
        <Section title="Withdraw">
          <div className="card card-pad">
            <p className="text-sm text-slate-700">
              Authors cannot withdraw an abstract once submitted. Withdraw it
              here on their behalf if they have requested it.
            </p>
            <ActionForm
              action={withdrawSubmission}
              className="mt-3"
              confirm="Withdraw this abstract on the author's behalf?"
            >
              <input type="hidden" name="id" value={sub.id} />
              <SubmitButton variant="danger">Withdraw abstract</SubmitButton>
            </ActionForm>
          </div>
        </Section>
      )}

      {/* ---- Delete (submitted / withdrawn / rejected only) ---- */}
      {DELETABLE_SUBMISSION_STATUSES.includes(sub.status) && (
        <Section title="Danger zone">
          <div className="card card-pad border-red-200">
            <p className="text-sm text-slate-700">
              Delete this {sub.status} paper. This permanently removes the paper,
              its authors, reviews, decisions and files. This cannot be undone.
            </p>
            <div className="mt-3">
              <DeleteSubmissionButton id={sub.id} />
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
