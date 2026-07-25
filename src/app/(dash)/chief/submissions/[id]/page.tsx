import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordFinalDecision, withdrawSubmission } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PaperDownload } from "@/components/PaperUpload";
import { DeleteSubmissionButton } from "@/components/DeleteSubmissionButton";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import {
  DELETABLE_SUBMISSION_STATUSES,
  participationModeLabel,
  submissionTypeLabel,
  type Submission,
} from "@/lib/types";

export default async function ChiefSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("chief");
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, tracks(name, profiles(full_name))")
    .eq("id", id)
    .single();

  if (!submission) notFound();
  const sub = submission as Submission & { tracks: any };

  const [{ data: assignments }, { data: decisions }, { data: coAuthors }, { data: stats }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("*, profiles(full_name, email), reviews(*)")
        .eq("submission_id", id),
      supabase
        .from("decisions")
        .select("*, profiles(full_name)")
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

  const rows = (assignments ?? []) as any[];
  const decisionRows = (decisions ?? []) as any[];
  const recommendation = decisionRows.find((d) => !d.is_final);
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
        } · Version ${sub.version}`}
        action={<StatusBadge status={sub.status} />}
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

          <PaperDownload filePath={sub.file_path} fileName={sub.file_name} />
        </div>
      </Section>

      <Section title="Reviews">
        <ReviewPanel assignments={rows} showConfidential />
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
                      d.is_final
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.is_final ? "Final" : "Editor recommendation"}
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

      {/* ---- The final call ---- */}
      <Section title="Final decision">
        {isFinal ? (
          <div className="card card-pad">
            <p className="text-sm text-slate-600">
              This submission has been finalised as{" "}
              <strong className="capitalize">{sub.status}</strong>. The author has
              been notified.
            </p>
          </div>
        ) : (
          <ActionForm
            action={recordFinalDecision}
            className="card card-pad space-y-4"
            confirm="Record this as the final decision? The author will be notified immediately."
          >
            <input type="hidden" name="submission_id" value={id} />

            {recommendation && (
              <p className="text-sm text-blue-900 bg-blue-50 rounded-lg px-3 py-2">
                The track editor recommends{" "}
                <strong className="capitalize">
                  {recommendation.decision.replace("_", " ")}
                </strong>
                . You may ratify or override it.
              </p>
            )}

            <div>
              <label className="label">Decision</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  ["accept", "Accept"],
                  ["minor_revision", "Minor Revision"],
                  ["major_revision", "Major Revision"],
                  ["reject", "Reject"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 border border-slate-300 rounded-lg
                               px-3 py-2 cursor-pointer hover:bg-slate-50
                               has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      required
                      defaultChecked={recommendation?.decision === value}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="rationale">
                Message to the author
              </label>
              <textarea
                id="rationale"
                name="rationale"
                rows={6}
                className="input"
                placeholder="This text is shown to the author alongside the decision."
              />
            </div>

            <SubmitButton>Record final decision</SubmitButton>
          </ActionForm>
        )}
      </Section>

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
