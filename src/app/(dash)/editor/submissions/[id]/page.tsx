import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeAssignment, reassignReviewer, setSuggestedOutlet } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { AbstractReviewRoute } from "@/components/AbstractReviewRoute";
import { DecisionForm } from "@/components/DecisionForm";
import { AddReviewer } from "@/components/AddReviewer";
import { RemindReviewer } from "@/components/RemindReviewer";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ManuscriptFilesView } from "@/components/ManuscriptFilesView";
import { PaperDownload } from "@/components/PaperUpload";
import { StatusBadge, RecommendationBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import { ReviewPanel } from "@/components/ReviewPanel";
import { IntegrityCheck } from "@/components/IntegrityCheck";
import { integrityReportUrl } from "@/lib/integrityActions";
import {
  FULL_PAPER_ACCEPTS_REQUIRED,
  MIN_REVIEWS_PER_SUBMISSION,
  RECOMMENDATION_LABELS,
  reviewOf,
  participationModeLabel,
  submissionTypeLabel,
  versionLabel,
  type Submission,
} from "@/lib/types";

// A reviewer invited into a revision round who has not responded within this
// many days may be cancelled so the Track Editor can invite someone else.
const REASSIGN_RESPONSE_DAYS = 5;

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
        .select("*, profiles!decisions_decided_by_fkey(full_name)")
        .eq("submission_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("submission_authors")
        .select("*")
        .eq("submission_id", id)
        .order("author_order"),
    ]);

  // Who recorded the integrity check, and a short-lived link to its report.
  const [{ data: integrityChecker }, integrityReport] = await Promise.all([
    sub.integrity_checked_by
      ? supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", sub.integrity_checked_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sub.integrity_report_path ? integrityReportUrl(id) : Promise.resolve(null),
  ]);
  const integrityCheckedByName =
    (integrityChecker as any)?.full_name ?? (integrityChecker as any)?.email ?? null;

  const { data: outlets } =
    sub.status === "accepted"
      ? await supabase
          .from("publication_opportunities")
          .select("id, title, category")
          .eq("is_active", true)
          .order("sort_order")
      : { data: [] };

  // Pathway B manuscript package (editor sees everything incl. camera-ready).
  const { data: manuscriptFiles } =
    sub.stage === "full_paper"
      ? await supabase
          .from("submission_files")
          .select("id, slot, file_name, file_path")
          .eq("submission_id", id)
      : { data: [] as any[] };

  const rows = (assignments ?? []) as any[];
  const assignedIds = new Set(rows.map((a) => a.reviewer_id));
  const available = ((candidates ?? []) as any[]).filter(
    (c) => !assignedIds.has(c.reviewer_id) && c.reviewer_id !== sub.author_id
  );

  // ---- Round-aware reviewer aggregation (banked-accept rule) ----
  // A reviewer may hold one assignment per review round. An Accept in any round
  // is "banked" (terminal) — it counts toward the required Accepts forever and
  // the reviewer is never reassigned. Everyone else is reassignable each new
  // revision round until they Accept (or decline → invite an additional one).
  const currentRound: number = (sub as any).review_round ?? 1;
  const byReviewer = new Map<string, any[]>();
  for (const a of rows) {
    const arr = byReviewer.get(a.reviewer_id) ?? [];
    arr.push(a);
    byReviewer.set(a.reviewer_id, arr);
  }
  const reviewers = [...byReviewer.entries()]
    .map(([rid, list]) => {
      const sorted = [...list].sort((x, y) => (x.round ?? 1) - (y.round ?? 1));
      const latest = sorted[sorted.length - 1];
      const submitted = sorted.filter((a) => reviewOf(a)?.is_submitted);
      const bankedAccept = submitted.some(
        (a) => reviewOf(a)?.recommendation === "accept"
      );
      const latestSubmitted = submitted[submitted.length - 1] ?? null;
      const bankedRec = bankedAccept
        ? "accept"
        : latestSubmitted
          ? reviewOf(latestSubmitted)?.recommendation ?? null
          : null;
      const currentAssignment =
        sorted.find((a) => (a.round ?? 1) === currentRound) ?? null;
      const p = latest.profiles;
      return {
        reviewerId: rid,
        reviewerNumber: latest.reviewer_number ?? null,
        name: p?.full_name || p?.email || "Reviewer",
        affiliation: p?.affiliation || "—",
        assignments: sorted,
        currentAssignment,
        bankedAccept,
        bankedRec,
        hasSubmitted: submitted.length > 0,
        // Eligible to re-invite: not a banked Accept, a new round is open, and
        // they have no assignment in it yet.
        reassignable: !bankedAccept && !currentAssignment && currentRound > 1,
      };
    })
    .sort((a, b) => (a.reviewerNumber ?? 99) - (b.reviewerNumber ?? 99));

  const acceptCount = reviewers.filter((r) => r.bankedAccept).length;
  const submittedReviewerCount = reviewers.filter((r) => r.hasSubmitted).length;
  const isFinal = ["accepted", "rejected"].includes(sub.status);

  // The abstract stage runs as a sequence: declare how it will be reviewed →
  // record the decision → send the letter. Each step opens the next.
  const isAbstract = sub.stage !== "full_paper";
  const reviewRoute = (sub as any).abstract_review_route ?? null;
  // A manuscript is decidable only once it has actually been submitted for
  // review — not while it sits at abstract_accepted waiting for the author to
  // submit (or re-submit, after a send-back).
  const manuscriptDecidable =
    sub.stage === "full_paper" &&
    ["submitted", "under_review", "revisions_requested"].includes(sub.status);
  const decidable = manuscriptDecidable || (isAbstract && Boolean(reviewRoute));
  const decisionUnlocked = decidable || isFinal;
  // A chair judging an abstract on their own expertise has no use for the
  // reviewer sections. Anything already assigned still shows, so choosing
  // "evaluate myself" after inviting someone never hides real work.
  const showReviewers =
    !isAbstract || reviewRoute === "facilitated" || rows.length > 0;

  const conf = sub.tracks?.conferences;
  const conferenceBrand =
    conf?.acronym && conf?.year ? `${conf.acronym} ${String(conf.year).slice(-2)}` : "GLOGIFT 27";
  // Accepting a full paper is gated on two Accept recommendations.
  const acceptsShort =
    sub.stage === "full_paper" && acceptCount < FULL_PAPER_ACCEPTS_REQUIRED;
  // Manuscript revisions need a completed review round — at least
  // FULL_PAPER_ACCEPTS_REQUIRED reviewers must have submitted a review.
  const reviewRoundDone = submittedReviewerCount >= FULL_PAPER_ACCEPTS_REQUIRED;

  // What the author may see: numbered, never named, and only the comments the
  // reviewer wrote for them — comments_to_editor stays confidential. One entry
  // per reviewer: a banked Accept, otherwise their latest submitted review.
  const authorFacingReviews = reviewers
    .map((r) => {
      const submitted = r.assignments.filter((a) => reviewOf(a)?.is_submitted);
      if (!submitted.length) return null;
      const chosen =
        submitted.find((a) => reviewOf(a)?.recommendation === "accept") ??
        submitted[submitted.length - 1];
      const rv = reviewOf(chosen);
      return {
        label: `Reviewer ${r.reviewerNumber ?? "?"}`,
        recommendation: rv?.recommendation,
        comments: rv?.comments_to_author,
      };
    })
    .filter(Boolean) as {
    label: string;
    recommendation: any;
    comments: any;
  }[];

  const decisionOptions =
    sub.stage === "full_paper"
      ? [
          { value: "accept", label: "Accept", locked: acceptsShort, hint: `Needs ${FULL_PAPER_ACCEPTS_REQUIRED} Accept recommendations` },
          { value: "minor_revision", label: "Minor Revision", locked: !reviewRoundDone, hint: `Needs a completed review round (${FULL_PAPER_ACCEPTS_REQUIRED} reviews)` },
          { value: "major_revision", label: "Major Revision", locked: !reviewRoundDone, hint: `Needs a completed review round (${FULL_PAPER_ACCEPTS_REQUIRED} reviews)` },
          { value: "sent_back", label: "Send back to author", locked: false, hint: "Guidelines not followed — author restarts the manuscript" },
          { value: "reject", label: "Reject", locked: false, hint: "Manuscript inappropriate" },
        ]
      : [
          { value: "accept", label: "Accept", locked: false, hint: undefined },
          { value: "minor_revision", label: "Minor Revision", locked: false, hint: undefined },
          { value: "major_revision", label: "Major Revision", locked: false, hint: undefined },
          { value: "reject", label: "Reject", locked: false, hint: undefined },
        ];

  const decisionNote =
    sub.stage === "full_paper" ? (
      acceptsShort ? (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Accept</strong> needs {FULL_PAPER_ACCEPTS_REQUIRED} reviewers
          recommending Accept ({acceptCount} so far).{" "}
          <strong>Minor / Major Revision</strong> unlock only after a completed
          review round — {FULL_PAPER_ACCEPTS_REQUIRED} reviewers must have
          submitted a review ({submittedReviewerCount} so far). Right now you can{" "}
          <strong>Send back to author</strong> (guidelines not followed) or{" "}
          <strong>Reject</strong> (manuscript inappropriate).
        </p>
      ) : (
        <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
          {acceptCount} reviewers recommend Accept — this paper may be accepted
          for the publication stage.
        </p>
      )
    ) : reviewRoute === "self" ? (
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
        You are deciding this abstract <strong>in your own capacity</strong> as
        Track Editor — the review process is bypassed. The Convener can override
        your decision.
      </p>
    ) : submittedReviewerCount === 0 ? (
      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        You chose to send this abstract out for review and{" "}
        <strong>no review has come in yet</strong>. You may still decide at your
        discretion, but the usual course is to wait for the reviewers you invited.
      </p>
    ) : (
      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
        {submittedReviewerCount} review{submittedReviewerCount === 1 ? "" : "s"}{" "}
        received. The Convener can override your decision.
      </p>
    );

  return (
    <>
      <div className="mb-2">
        <Link href="/editor" className="text-sm text-blue-700 hover:underline">
          ← Track queue
        </Link>
      </div>

      <PageHeader
        title={sub.title}
        subtitle={`${sub.paper_id ? `Paper ${sub.paper_id} · ` : ""}${sub.tracks?.name ?? "No track"} · ${versionLabel(sub.version)} · Submitted ${formatDate(sub.submitted_at)}`}
        action={
          <StatusBadge
            status={sub.status}
            submissionType={(sub as any).submission_type}
            stage={(sub as any).stage}
            version={sub.version}
          />
        }
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

          {sub.stage === "full_paper" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Full paper (manuscript package)
              </p>
              <ManuscriptFilesView
                role="editor"
                submissionId={id}
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

      {/* ---- Research integrity: similarity + AI writing scores ---- */}
      <IntegrityCheck
        submission={sub}
        checkedByName={integrityCheckedByName}
        reportUrl={integrityReport}
      />

      {/* ---- How this abstract is judged (gates the decision form) ---- */}
      {isAbstract && !isFinal && (
        <Section title="How will this abstract be reviewed?">
          <AbstractReviewRoute submissionId={id} current={reviewRoute} />
        </Section>
      )}

      {/* ---- Manuscript stage: review is compulsory, no bypass ---- */}
      {!isAbstract && !isFinal && (
        <Section title="How will this manuscript be reviewed?">
          <div className="card card-pad space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              At the manuscript stage the review process{" "}
              <strong>cannot be bypassed</strong>. You must facilitate the review
              and obtain <strong>at least {FULL_PAPER_ACCEPTS_REQUIRED} Accept
              recommendations</strong> before this paper can move to the
              publication stage. You may invite more than{" "}
              {FULL_PAPER_ACCEPTS_REQUIRED} reviewers.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                ["Reviewers", reviewers.length],
                ["Reviews received", submittedReviewerCount],
                [
                  "Accept recommendations",
                  `${acceptCount} of ${FULL_PAPER_ACCEPTS_REQUIRED}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {label as string}
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {value as string | number}
                  </p>
                </div>
              ))}
            </div>
            <p
              className={`text-sm rounded-lg px-3 py-2 ${
                acceptsShort
                  ? "text-amber-900 bg-amber-50 border border-amber-200"
                  : "text-emerald-800 bg-emerald-50"
              }`}
            >
              {acceptsShort
                ? "Accept stays locked until the second Accept recommendation arrives. Revision and reject decisions are available now."
                : "The requirement is met — you may accept this manuscript."}
            </p>
          </div>
        </Section>
      )}

      {/* ---- Reviewer assignment — only when reviewers are part of the plan ---- */}
      {showReviewers && (
      <Section
        title={`Reviewers (${submittedReviewerCount}/${reviewers.length} complete · ${acceptCount}/${FULL_PAPER_ACCEPTS_REQUIRED} Accept${
          currentRound > 1 ? ` · round ${currentRound}` : ""
        })`}
      >
        <div className="card divide-y divide-slate-100">
          {reviewers.length === 0 && (
            <p className="px-5 py-4 text-sm text-slate-500">
              No reviewers assigned yet.
            </p>
          )}

          {reviewers.map((r) => {
            const ca = r.currentAssignment;
            const caStatus: string | null = ca?.status ?? null;
            const overdue =
              ca &&
              caStatus !== "submitted" &&
              caStatus !== "declined" &&
              ca.due_date &&
              new Date(ca.due_date) < new Date();
            // A revision-round invitation with no response within the response
            // window: the Track Editor may cancel it and invite someone else.
            const awaitingDays =
              ca && caStatus === "invited" && ca.created_at
                ? Math.floor(
                    (Date.now() - new Date(ca.created_at).getTime()) / 86400000
                  )
                : 0;
            const stalled =
              ca && caStatus === "invited" && awaitingDays >= REASSIGN_RESPONSE_DAYS;

            return (
              <div key={r.reviewerId} className="px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="badge bg-slate-100 text-slate-700 mr-2">
                      Reviewer {r.reviewerNumber ?? "—"}
                    </span>
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.affiliation}
                    {ca?.due_date ? ` · Due ${formatDate(ca.due_date)}` : ""}
                  </p>
                  {/* Round history: what each round produced. */}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {r.assignments
                      .map((a) => {
                        const rv = reviewOf(a);
                        const label = rv?.is_submitted
                          ? RECOMMENDATION_LABELS[
                              rv.recommendation as keyof typeof RECOMMENDATION_LABELS
                            ] ?? rv.recommendation
                          : a.status;
                        return `R${a.round ?? 1}: ${label}`;
                      })
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.bankedAccept ? (
                    <span className="badge bg-emerald-100 text-emerald-800">
                      Accept — complete
                    </span>
                  ) : (
                    <span
                      className={`badge ${
                        caStatus === "submitted"
                          ? "bg-emerald-100 text-emerald-800"
                          : caStatus === "accepted"
                            ? "bg-blue-100 text-blue-800"
                            : caStatus === "declined"
                              ? "bg-red-100 text-red-800"
                              : caStatus === "invited"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {caStatus ??
                        (r.bankedRec
                          ? RECOMMENDATION_LABELS[
                              r.bankedRec as keyof typeof RECOMMENDATION_LABELS
                            ] ?? r.bankedRec
                          : "—")}
                    </span>
                  )}
                  {overdue && (
                    <span className="badge bg-amber-100 text-amber-900">Overdue</span>
                  )}

                  {r.reassignable && !isFinal && (
                    <ActionForm
                      action={reassignReviewer}
                      confirm={`Re-invite ${r.name} to review the revision (round ${currentRound})? They'll get an Agree/Decline email.`}
                    >
                      <input type="hidden" name="submission_id" value={id} />
                      <input type="hidden" name="reviewer_id" value={r.reviewerId} />
                      <SubmitButton variant="primary" className="text-xs py-1 px-2">
                        Reassign
                      </SubmitButton>
                    </ActionForm>
                  )}

                  {ca && caStatus !== "submitted" && (
                    <ActionForm
                      action={removeAssignment}
                      confirm={
                        stalled
                          ? "Cancel this pending invitation so you can invite someone else?"
                          : "Remove this reviewer assignment?"
                      }
                    >
                      <input type="hidden" name="assignment_id" value={ca.id} />
                      <input type="hidden" name="submission_id" value={id} />
                      <SubmitButton variant="secondary" className="text-xs py-1 px-2">
                        {stalled ? "Cancel" : "Remove"}
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>

                {stalled && (
                  <p className="w-full text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                    No response in {awaitingDays} days. You may cancel this
                    invitation and invite an additional reviewer below.
                  </p>
                )}

                {overdue && ca && (
                  <RemindReviewer
                    assignmentId={ca.id}
                    submissionId={id}
                    reviewerName={r.name}
                  />
                )}
              </div>
            );
          })}

          {/* Add a reviewer — search the portal's reviewers or add someone new. */}
          {!isFinal && <AddReviewer submissionId={id} available={available} />}
        </div>
      </Section>

      )}

      {/* ---- Reviews received ---- */}
      {showReviewers && (
        <Section title="Reviews received">
          <ReviewPanel assignments={rows} showConfidential />
        </Section>
      )}

      {/* ---- Decision (track chair finalises) ---- */}
      {(decisionUnlocked || ((decisions ?? []) as any[]).length > 0) && (
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
              This paper is {sub.status.replace("_", " ")}. This decision is
              final — only the Convener can change it.
            </p>
          </div>
        ) : !decidable ? (
          <div className="card card-pad bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-900">
              {sub.status === "abstract_accepted"
                ? "The abstract is accepted and the manuscript is back with the author. The decision panel opens again once they submit (or re-submit) the full paper."
                : "This submission is not awaiting a decision right now."}
            </p>
          </div>
        ) : (
          <DecisionForm
            submissionId={id}
            stage={sub.stage === "full_paper" ? "full_paper" : "abstract"}
            note={decisionNote}
            options={decisionOptions}
            showDeadline={
              sub.submission_type === "full_paper_presentation" &&
              sub.stage !== "full_paper"
            }
            paperId={sub.paper_id}
            title={sub.title}
            track={sub.tracks?.name}
            submissionType={sub.submission_type}
            conferenceName={conf?.name}
            brand={conferenceBrand}
            chairName={profile.full_name}
            chairEmail={profile.email}
            signerRole="Track Editor"
            authorName={sub.profiles?.full_name}
            reviews={authorFacingReviews}
            reviewersAssigned={rows.some(
              (a) => a.status !== "declined" && a.status !== "expired"
            )}
          />
        )}
      </Section>
      )}

      {/* The decision letter is previewed, (optionally) edited, and emailed to
          the author — with the Convener CC'd — in one step from the decision
          panel above, so there is no separate "email the author" section. */}

      {/* ---- Highlight a publication outlet (accepted papers) ----
           Only Pathway B (full paper) produces a paper for a publication
           outlet; Pathway A is abstract & presentation only. */}
      {sub.status === "accepted" &&
        sub.submission_type === "full_paper_presentation" && (
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
