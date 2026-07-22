import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignReviewer, recordRecommendation, removeAssignment } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PaperDownload } from "@/components/PaperUpload";
import { StatusBadge, RecommendationBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import { ReviewPanel } from "@/components/ReviewPanel";
import type { Submission } from "@/lib/types";

export default async function EditorSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("editor");
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, tracks(name), profiles!submissions_author_id_fkey(full_name, email, affiliation)")
    .eq("id", id)
    .single();

  if (!submission) notFound();
  const sub = submission as Submission & { tracks: any; profiles: any };

  const [{ data: assignments }, { data: candidates }, { data: decisions }, { data: coAuthors }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("*, profiles(full_name, email, affiliation), reviews(*)")
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

  const rows = (assignments ?? []) as any[];
  const assignedIds = new Set(rows.map((a) => a.reviewer_id));
  const available = ((candidates ?? []) as any[]).filter(
    (c) => !assignedIds.has(c.reviewer_id) && c.reviewer_id !== sub.author_id
  );

  const completed = rows.filter((a) => a.reviews?.[0]?.is_submitted);
  const alreadyRecommended = ((decisions ?? []) as any[]).some((d) => !d.is_final);
  const isFinal = ["accepted", "rejected"].includes(sub.status);

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

          <PaperDownload filePath={sub.file_path} fileName={sub.file_name} />
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

          {rows.map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {a.profiles?.full_name || a.profiles?.email}
                </p>
                <p className="text-xs text-slate-500">
                  {a.profiles?.affiliation || "—"}
                  {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
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
            </div>
          ))}

          {/* Invite a new reviewer — sorted by lightest workload first. */}
          {!isFinal && (
            <ActionForm action={assignReviewer} className="px-5 py-4">
              <input type="hidden" name="submission_id" value={id} />
              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
                <select name="reviewer_id" required className="input">
                  <option value="">Select a reviewer…</option>
                  {available.map((c) => (
                    <option key={c.reviewer_id} value={c.reviewer_id}>
                      {c.full_name || c.email} — {c.open_assignments} open
                      {c.expertise?.length ? ` · ${c.expertise.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  name="due_date"
                  className="input"
                  aria-label="Due date"
                />
                <SubmitButton>Invite</SubmitButton>
              </div>
              {available.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  No further reviewers available. An administrator can grant the
                  reviewer role to more users.
                </p>
              )}
            </ActionForm>
          )}
        </div>
      </Section>

      {/* ---- Reviews received ---- */}
      <Section title="Reviews received">
        <ReviewPanel assignments={rows} showConfidential />
      </Section>

      {/* ---- Recommendation ---- */}
      <Section title="Editorial recommendation">
        {((decisions ?? []) as any[]).length > 0 && (
          <div className="space-y-3 mb-4">
            {((decisions ?? []) as any[]).map((d) => (
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
                    {d.is_final ? "Final (Conveners)" : "Recommendation"}
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
              A final decision has been recorded. No further action needed.
            </p>
          </div>
        ) : (
          <ActionForm action={recordRecommendation} className="card card-pad space-y-4">
            <input type="hidden" name="submission_id" value={id} />

            {completed.length < 2 && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                Only {completed.length} review{completed.length === 1 ? "" : "s"}{" "}
                received. Most conferences expect at least two before
                recommending.
              </p>
            )}
            {alreadyRecommended && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                You have already sent a recommendation. Submitting again will
                supersede it.
              </p>
            )}

            <div>
              <label className="label">Recommend to the Conveners</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  ["accept", "Accept"],
                  ["revisions_requested", "Request revisions"],
                  ["reject", "Reject"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 border border-slate-300 rounded-lg
                               px-3 py-2 cursor-pointer hover:bg-slate-50
                               has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input type="radio" name="decision" value={value} required />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="rationale">
                Rationale
              </label>
              <textarea
                id="rationale"
                name="rationale"
                rows={5}
                className="input"
                placeholder="Summarise the reviews and explain your recommendation."
              />
            </div>

            <SubmitButton>Send recommendation</SubmitButton>
          </ActionForm>
        )}
      </Section>
    </>
  );
}
