import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  recordRecommendation,
  removeAssignment,
  setSuggestedOutlet,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AddReviewer } from "@/components/AddReviewer";
import { RemindReviewer } from "@/components/RemindReviewer";
import { NotifyAuthor } from "@/components/NotifyAuthor";
import { DocumentViewer } from "@/components/DocumentViewer";
import { PaperDownload } from "@/components/PaperUpload";
import { StatusBadge, RecommendationBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import { ReviewPanel } from "@/components/ReviewPanel";
import {
  FULL_PAPER_ACCEPTS_REQUIRED,
  MIN_REVIEWS_PER_SUBMISSION,
  reviewOf,
  participationModeLabel,
  submissionTypeLabel,
  type Submission,
} from "@/lib/types";

export default async function EditorSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("editor");
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "*, tracks(name, conferences(name, acronym, year)), profiles!submissions_author_id_fkey(full_name, email, affiliation)"
    )
    .eq("id", id)
    .single();

  if (!submission) notFound();
  const sub = submission as Submission & { tracks: any; profiles: any };

  const [{ data: assignments }, { data: candidates }, { data: decisions }, { data: coAuthors }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "*, profiles!assignments_reviewer_id_fkey(full_name, email, affiliation), reviews(*)"
        )
        .eq("submission_id", id)
        .order("created_at"),
      supabase
        .from("reviewer_workload")
        .select("*")
        .order("open_assignments"),
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
    ]);

  const { data: outlets } =
    sub.status === "accepted"
      ? await supabase
          .from("publication_opportunities")
          .select("id, title, category")
          .eq("is_active", true)
          .order("sort_order")
      : { data: [] };

  const rows = (assignments ?? []) as any[];
  const assignedIds = new Set(rows.map((a) => a.reviewer_id));
  const available = ((candidates ?? []) as any[]).filter(
    (c) => !assignedIds.has(c.reviewer_id) && c.reviewer_id !== sub.author_id
  );

  const completed = rows.filter((a) => reviewOf(a)?.is_submitted);
  const acceptCount = completed.filter(
    (a) => reviewOf(a)?.recommendation === "accept"
  ).length;
  const isFinal = ["accepted", "rejected"].includes(sub.status);
  const conf = sub.tracks?.conferences;
  const conferenceBrand =
    conf?.acronym && conf?.year ? `${conf.acronym} ${conf.year}` : "GLOGIFT 2027";
  // Accepting a full paper is gated on two Accept recommendations.
  const acceptsShort =
    sub.stage === "full_paper" && acceptCount < FULL_PAPER_ACCEPTS_REQUIRED;

  // What the author may see: numbered, never named, and only the comments the
  // reviewer wrote for them — comments_to_editor stays confidential.
  const authorFacingReviews = completed.map((a, i) => ({
    label: `Reviewer ${a.reviewer_number ?? i + 1}`,
    recommendation: reviewOf(a)?.recommendation,
    comments: reviewOf(a)?.comments_to_author,
  }));

  return (
    <>
      <div className="mb-2">
        <Link href="/editor" className="text-sm text-blue-700 hover:underline">
          ← Track queue
        </Link>
      </div>

      <PageHeader
        title={sub.title}
        subtitle={`${sub.paper_id ? `Paper ${sub.paper_id} · ` : ""}${sub.tracks?.name ?? "No track"} · Version ${sub.version} · Submitted ${formatDate(sub.submitted_at)}`}
        action={<StatusBadge status={sub.status} />}
      />

      {/* ---- Paper ---- */}
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

          {sub.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sub.keywords.map((k) => (
                <span key={k} className="badge bg-slate-100 text-slate-600">
                  {k}
                </span>
              ))}
            </div>
          )}

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
        </div>
      </Section>

      {/* ---- Reviewer assignment ---- */}
      <Section title={`Reviewers (${completed.length}/${rows.length} complete)`}>
        <div className="card divide-y divide-slate-100">
          {rows.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-500">
              No reviewers assigned yet.
            </p>
          )}

          {rows.map((a) => {
            const overdue =
              a.status !== "submitted" &&
              a.status !== "declined" &&
              a.due_date &&
              new Date(a.due_date) < new Date();
            return (
              <div key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="badge bg-slate-100 text-slate-700 mr-2">
                      Reviewer {a.reviewer_number ?? "—"}
                    </span>
                    {a.profiles?.full_name || a.profiles?.email}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.profiles?.affiliation || "—"}
                    {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                    {a.last_reminded_at
                      ? ` · Reminded ${formatDate(a.last_reminded_at)}${
                          a.reminder_count > 1 ? ` (${a.reminder_count}×)` : ""
                        }`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {overdue && (
                    <span className="badge bg-amber-100 text-amber-900">
                      Overdue
                    </span>
                  )}
                  <span
                    className={`badge ${
                      a.status === "submitted"
                        ? "bg-emerald-100 text-emerald-800"
                        : a.status === "accepted"
                          ? "bg-blue-100 text-blue-800"
                          : a.status === "declined"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.status}
                  </span>
                  {a.status !== "submitted" && (
                    <ActionForm
                      action={removeAssignment}
                      confirm="Remove this reviewer assignment?"
                    >
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <input type="hidden" name="submission_id" value={id} />
                      <SubmitButton variant="secondary" className="text-xs py-1 px-2">
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>

                {overdue && (
                  <RemindReviewer
                    assignmentId={a.id}
                    submissionId={id}
                    reviewerName={
                      a.profiles?.full_name || a.profiles?.email || "reviewer"
                    }
                  />
                )}
              </div>
            );
          })}

          {/* Add a reviewer — search the portal's reviewers or add someone new. */}
          {!isFinal && <AddReviewer submissionId={id} available={available} />}
        </div>
      </Section>

      {/* ---- Reviews received ---- */}
      <Section title="Reviews received">
        <ReviewPanel assignments={rows} showConfidential />
      </Section>

      {/* ---- Decision (track chair finalises) ---- */}
      <Section
        title={
          sub.stage === "full_paper"
            ? "Full paper decision"
            : "Abstract decision"
        }
      >
        {((decisions ?? []) as any[]).length > 0 && (
          <div className="space-y-3 mb-4">
            {((decisions ?? []) as any[]).map((d) => (
              <div key={d.id} className="card card-pad">
                <div className="flex items-center gap-3">
                  <span className="font-medium capitalize text-slate-900">
                    {d.decision.replace("_", " ")}
                  </span>
                  <span className="badge bg-emerald-100 text-emerald-800">
                    Recorded
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
        )}

        {isFinal ? (
          <div className="card card-pad">
            <p className="text-sm text-slate-500">
              This paper is {sub.status.replace("_", " ")}. Record another
              decision below only to change it.
            </p>
          </div>
        ) : (
          <ActionForm action={recordRecommendation} className="card card-pad space-y-4">
            <input type="hidden" name="submission_id" value={id} />

            {sub.stage === "full_paper" ? (
              acceptsShort ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <strong>Accept is locked.</strong> A full paper needs{" "}
                  {FULL_PAPER_ACCEPTS_REQUIRED} reviewers recommending Accept
                  before it can move to the publication stage — {acceptCount} so
                  far. Invite as many reviewers as you need; a revision or reject
                  decision can still be recorded now.
                </p>
              ) : (
                <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
                  {acceptCount} reviewers recommend Accept — this paper may be
                  accepted for the publication stage.
                </p>
              )
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                Abstract stage — <strong>no reviews are required</strong>. As
                track chair you may decide in your own capacity;{" "}
                {completed.length} review{completed.length === 1 ? "" : "s"}{" "}
                received so far. The Convener can override your decision.
              </p>
            )}

            <div>
              <label className="label">Your decision</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  ["accept", "Accept"],
                  ["minor_revision", "Minor Revision"],
                  ["major_revision", "Major Revision"],
                  ["reject", "Reject"],
                ].map(([value, label]) => {
                  const locked = value === "accept" && acceptsShort;
                  return (
                    <label
                      key={value}
                      title={
                        locked
                          ? `Needs ${FULL_PAPER_ACCEPTS_REQUIRED} Accept recommendations`
                          : undefined
                      }
                      className={`flex items-center gap-2 border border-slate-300 rounded-lg
                                 px-3 py-2 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 ${
                                   locked
                                     ? "opacity-50 cursor-not-allowed"
                                     : "cursor-pointer hover:bg-slate-50"
                                 }`}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value={value}
                        required
                        disabled={locked}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="rationale">
                Message to the author
              </label>
              <textarea
                id="rationale"
                name="rationale"
                rows={5}
                className="input"
                placeholder="Shown to the author alongside your decision."
              />
            </div>

            <SubmitButton>Record decision</SubmitButton>
          </ActionForm>
        )}
      </Section>

      {/* ---- Email the author (decision letter) ---- */}
      <Section title="Email the author">
        <NotifyAuthor
          stage={sub.stage}
          paperId={sub.paper_id}
          title={sub.title}
          track={sub.tracks?.name}
          authorName={sub.profiles?.full_name}
          authorEmail={sub.profiles?.email}
          defaultDecision={((decisions ?? []) as any[])[0]?.decision}
          defaultMessage={((decisions ?? []) as any[])[0]?.rationale}
          reviews={authorFacingReviews}
          chairName={profile.full_name}
          chairEmail={profile.email}
          signerRole="Track Session Chair"
          conferenceName={sub.tracks?.conferences?.name}
          brand={conferenceBrand}
        />
      </Section>

      {/* ---- Highlight a publication outlet (accepted papers) ---- */}
      {sub.status === "accepted" && (
        <Section title="Publication outlet">
          <ActionForm action={setSuggestedOutlet} className="card card-pad space-y-3">
            <input type="hidden" name="submission_id" value={id} />
            <p className="text-sm text-slate-600">
              Highlight one outlet this accepted paper may be considered for.
            </p>
            <div className="flex flex-wrap gap-3">
              <select
                name="outlet_id"
                defaultValue={sub.suggested_outlet_id ?? ""}
                className="input max-w-md"
              >
                <option value="">— None —</option>
                {((outlets ?? []) as any[]).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                    {o.category ? ` (${o.category})` : ""}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary">Save</SubmitButton>
            </div>
          </ActionForm>
        </Section>
      )}
    </>
  );
}
