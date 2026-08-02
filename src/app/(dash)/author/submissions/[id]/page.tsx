import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  addCoAuthor,
  moveAuthor,
  removeCoAuthor,
  submitForReview,
  updateCoAuthorEmail,
  updateSubmission,
  withdrawSubmission,
} from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PaperUpload } from "@/components/PaperUpload";
import { FullPaperUpload } from "@/components/FullPaperUpload";
import { InstitutionInput } from "@/components/InstitutionInput";
import { StatusBadge, RecommendationBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import {
  attendanceLabel,
  AUTHOR_ATTENDANCE,
  COUNTRY_DIAL_CODES,
  PARTICIPANT_CATEGORIES,
  participationModeLabel,
  submissionTypeLabel,
  versionLabel,
  type Decision,
  type Review,
  type Submission,
  type Track,
} from "@/lib/types";

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

  const { data: outlet } = sub.suggested_outlet_id
    ? await supabase
        .from("publication_opportunities")
        .select("title, category, image_url, url")
        .eq("id", sub.suggested_outlet_id)
        .maybeSingle()
    : { data: null };

  const [{ data: tracks }, { data: coAuthors }, { data: reviews }, { data: decisions }] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("*")
        .eq("conference_id", sub.conference_id)
        .order("name"),
      // Read the author list with the admin client: the submission_authors
      // read policy doesn't cover co-authors, but a co-author who can load this
      // submission (RLS-checked above) is entitled to see its author list.
      createAdminClient()
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

  // Pathway B full-paper packaging: the uploaded files + the effective deadline
  // (the Track Editor's per-paper date, else the conference ceiling).
  const [{ data: paperFiles }, { data: conf }, { data: outlets }] =
    await Promise.all([
      sub.submission_type === "full_paper_presentation"
        ? supabase
            .from("submission_files")
            .select("id, slot, file_name, file_path")
            .eq("submission_id", id)
            .order("created_at")
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("conferences")
        .select("full_paper_deadline")
        .eq("id", sub.conference_id)
        .maybeSingle(),
      sub.submission_type === "full_paper_presentation"
        ? supabase
            .from("publication_opportunities")
            .select("id, title, category")
            .order("title")
        : Promise.resolve({ data: [] as any[] }),
    ]);
  const fullPaperDeadline =
    (sub as any).full_paper_deadline ?? (conf as any)?.full_paper_deadline ?? null;

  // Only the corresponding (submitting) author may edit; a co-author is
  // view-only. Editing is further limited to a draft or a revision.
  const isOwner = sub.author_id === profile.id;
  const editable = isOwner && ["draft", "revisions_requested"].includes(sub.status);
  const canSubmit = editable;
  // Authors may withdraw only an abstract they have not submitted yet;
  // once submitted, withdrawal is the Convener's call.
  const canWithdraw = isOwner && sub.status === "draft";

  return (
    <>
      <div className="mb-2">
        <Link href="/author" className="text-sm text-blue-700 hover:underline">
          ← All submissions
        </Link>
      </div>

      <PageHeader
        title={sub.title || "Untitled submission"}
        subtitle={`${sub.paper_id ? `Paper ${sub.paper_id} · ` : ""}${versionLabel(sub.version)} · Created ${formatDate(sub.created_at)}`}
        action={
          <StatusBadge
            status={sub.status}
            submissionType={(sub as any).submission_type}
            stage={(sub as any).stage}
          />
        }
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

      {/* ---------------- Full paper (after abstract acceptance) --------- */}
      {sub.submission_type === "full_paper_presentation" && (
        <Section title="Full paper">
          <div className="card card-pad">
            {sub.status === "abstract_accepted" ? (
              <>
                <div className="card card-pad bg-teal-50 border-teal-200 mb-3">
                  <p className="text-sm text-teal-900 font-medium">
                    Your abstract has been accepted 🎉
                  </p>
                  <p className="text-sm text-teal-800 mt-1">
                    Package your full paper below and submit it for the next
                    review round.
                  </p>
                </div>
                <FullPaperUpload
                  submissionId={sub.id}
                  option={(sub as any).full_paper_option ?? null}
                  files={(paperFiles as any[]) ?? []}
                  deadline={fullPaperDeadline}
                  editable={isOwner}
                  outlets={(outlets as any[]) ?? []}
                  selectedOutlets={(sub as any).requested_outlet_ids ?? []}
                  title={sub.title ?? ""}
                  abstract={sub.abstract ?? ""}
                  keywords={sub.keywords ?? []}
                />
              </>
            ) : (sub.stage === "full_paper" &&
                (sub as any).full_paper_option) ||
              ((paperFiles as any[]) ?? []).length > 0 ? (
              <FullPaperUpload
                submissionId={sub.id}
                option={(sub as any).full_paper_option ?? null}
                files={(paperFiles as any[]) ?? []}
                deadline={fullPaperDeadline}
                editable={isOwner && sub.status === "revisions_requested"}
                outlets={(outlets as any[]) ?? []}
                selectedOutlets={(sub as any).requested_outlet_ids ?? []}
                title={sub.title ?? ""}
                abstract={sub.abstract ?? ""}
                keywords={sub.keywords ?? []}
              />
            ) : (
              <p className="text-sm text-slate-500">
                The full paper upload becomes available once your abstract has
                been accepted (reviewer → track editor → convener).
              </p>
            )}
          </div>
        </Section>
      )}

      {/* ---------------- Suggested publication outlet ---------------- */}
      {sub.status === "accepted" && outlet && (
        <Section title="Publication opportunity">
          <div className="card card-pad flex items-center gap-4">
            {outlet.image_url && (
              <img
                src={outlet.image_url}
                alt={outlet.title}
                className="w-16 rounded border border-slate-200 bg-white shrink-0"
              />
            )}
            <div>
              <p className="text-sm text-slate-600">
                Your paper has been highlighted for possible publication in:
              </p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {outlet.url ? (
                  <a
                    href={outlet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {outlet.title}
                  </a>
                ) : (
                  outlet.title
                )}
              </p>
              {outlet.category && (
                <p className="text-xs text-slate-500">{outlet.category}</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ---------------- Metadata ----------------
           The abstract details are fixed once the paper moves to the full-paper
           (manuscript) stage — no re-entry is required there. */}
      {sub.stage !== "full_paper" && (
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
      )}

      {/* ---------------- Participation ---------------- */}
      {(sub.submission_type || sub.participation_mode) && (
        <Section title="Participation">
          <div className="card card-pad grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Level of participation
              </p>
              <p className="text-sm text-slate-800 mt-1">
                {submissionTypeLabel(sub.submission_type)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attendance format
              </p>
              <p className="text-sm text-slate-800 mt-1">
                {participationModeLabel(sub.participation_mode)}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ---------------- Declaration (abstract stage) ----------------
           At the full-paper stage the author re-affirms the declaration, on
           behalf of all authors, in the manuscript upload panel above. */}
      {sub.stage !== "full_paper" &&
        (sub.declared_original ||
          sub.declared_ai_assistance ||
          sub.declared_consent_publication) && (
        <Section title="Declaration">
          <div className="card card-pad space-y-1.5">
            {[
              [
                sub.declared_original,
                "Work is original, not plagiarized, and not submitted/published elsewhere.",
              ],
              [
                sub.declared_ai_assistance,
                "AI tools were used only for assistance, not as co-authors.",
              ],
              [
                sub.declared_consent_publication,
                "Consented to sharing the submission, if accepted, with the Editorial Offices of associated journals, edited books, and the GLOGIFT 2027 conference proceedings.",
              ],
            ].map(([ok, label]) => (
              <p key={label as string} className="text-sm text-slate-700">
                <span className={ok ? "text-emerald-600" : "text-slate-300"}>
                  {ok ? "✓" : "✗"}
                </span>{" "}
                {label as string}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* ---------------- Co-authors ---------------- */}
      <Section title="Authors">
        <div className="card divide-y divide-slate-100">
          {(coAuthors ?? []).map((a: any, idx: number, arr: any[]) => (
            <div
              key={a.id}
              className="px-5 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {editable && (
                  <div className="flex flex-col text-slate-400">
                    <ActionForm action={moveAuthor}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="submission_id" value={sub.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={idx === 0}
                        aria-label="Move author up"
                        className="leading-none hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                      >
                        ▲
                      </button>
                    </ActionForm>
                    <ActionForm action={moveAuthor}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="submission_id" value={sub.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={idx === arr.length - 1}
                        aria-label="Move author down"
                        className="leading-none hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                      >
                        ▼
                      </button>
                    </ActionForm>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                    {a.full_name}
                    {a.is_corresponding && (
                      <span className="badge bg-blue-100 text-blue-800 ml-2">
                        Corresponding
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[
                      a.designation,
                      a.participant_category,
                      a.affiliation,
                      a.email,
                      a.mobile,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {a.attendance && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {attendanceLabel(a.attendance)}
                    </p>
                  )}
                  {/* The corresponding author can fix a co-author's email while
                      that co-author is still unregistered (e.g. it bounced). */}
                  {isOwner &&
                    !a.is_corresponding &&
                    (a.profile_id ? (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        ✓ Registered — email is managed by the co-author.
                      </p>
                    ) : (
                      <ActionForm
                        action={updateCoAuthorEmail}
                        className="mt-2 flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <input
                          type="hidden"
                          name="submission_id"
                          value={sub.id}
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={a.email}
                          placeholder="co-author email"
                          className="input text-xs py-1 max-w-[16rem]"
                        />
                        <SubmitButton
                          variant="secondary"
                          className="text-xs py-1 px-2"
                        >
                          Save &amp; resend invitation
                        </SubmitButton>
                      </ActionForm>
                    ))}
                </div>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  name="full_name"
                  required
                  placeholder="Name"
                  className="input"
                />
                <input
                  name="designation"
                  placeholder="Designation"
                  className="input"
                />
                <select name="participant_category" defaultValue="" className="input">
                  <option value="">Participant category…</option>
                  {PARTICIPANT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <InstitutionInput name="affiliation" placeholder="Affiliation" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email"
                  className="input"
                />
                <div className="flex gap-2">
                  <select
                    name="dial_code"
                    aria-label="Country code"
                    defaultValue="+91"
                    className="input w-24 shrink-0"
                  >
                    {COUNTRY_DIAL_CODES.map((c) => (
                      <option key={c.country} value={c.code}>
                        {c.code} {c.country}
                      </option>
                    ))}
                  </select>
                  <input
                    name="mobile"
                    type="tel"
                    placeholder="Mobile number"
                    className="input"
                  />
                </div>
                <select
                  name="attendance"
                  defaultValue=""
                  className="input sm:col-span-2 lg:col-span-3"
                >
                  <option value="" disabled hidden>
                    Attendance Intention
                  </option>
                  {AUTHOR_ATTENDANCE.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
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

      {/* ---------------- Camera-ready (accepted papers) ---------------- */}
      {sub.status === "accepted" && (
        <Section title="Camera-ready submission">
          <div className="card card-pad">
            <p className="text-sm text-slate-600 mb-3">
              Your paper was accepted. Upload the final camera-ready version for
              the proceedings.
            </p>
            <PaperUpload
              submissionId={sub.id}
              currentName={sub.camera_ready_file_name}
              editable={true}
              kind="camera_ready"
            />
            {sub.camera_ready_at && (
              <p className="text-xs text-emerald-700 mt-2">
                Camera-ready uploaded on {formatDate(sub.camera_ready_at)}.
              </p>
            )}
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

          {!canWithdraw && !["withdrawn", "draft"].includes(sub.status) && (
            <p className="text-sm text-slate-500">
              {sub.status === "accepted"
                ? "This paper has been accepted and can no longer be withdrawn."
                : "Your abstract has been submitted. Only the Convener can withdraw it — please contact the Convener if you need it withdrawn."}
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
