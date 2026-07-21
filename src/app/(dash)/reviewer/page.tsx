import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { respondToAssignment } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  EmptyState,
  PageHeader,
  Section,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";

export default async function ReviewerDashboard() {
  const profile = await requireRole("reviewer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("assignments")
    .select(
      "*, submissions(id, title, abstract, keywords, status, file_name, paper_id, tracks(name)), reviews(id, is_submitted, recommendation)"
    )
    .eq("reviewer_id", profile.id)
    .order("created_at", { ascending: false });

  const assignments = (data ?? []) as any[];

  const invited = assignments.filter((a) => a.status === "invited");
  const active = assignments.filter((a) => a.status === "accepted");
  const done = assignments.filter((a) => a.status === "submitted");
  const declined = assignments.filter((a) => a.status === "declined");

  const overdue = active.filter(
    (a) => a.due_date && new Date(a.due_date) < new Date()
  ).length;

  return (
    <>
      <PageHeader
        title="My Reviews"
        subtitle="Invitations, papers awaiting your assessment, and your completed reviews."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Invitations" value={invited.length} />
        <StatCard label="In progress" value={active.length} />
        <StatCard label="Completed" value={done.length} />
        <StatCard
          label="Overdue"
          value={overdue}
          hint={overdue > 0 ? "Past due date" : undefined}
        />
      </div>

      {/* -------- Pending invitations -------- */}
      {invited.length > 0 && (
        <Section title="Review invitations">
          <div className="space-y-3">
            {invited.map((a) => (
              <div key={a.id} className="card card-pad">
                <p className="font-medium text-slate-900">
                  {a.submissions?.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.submissions?.tracks?.name ?? "No track"}
                  {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                </p>
                <p className="text-sm text-slate-600 mt-3 line-clamp-3">
                  {a.submissions?.abstract}
                </p>

                <div className="flex gap-2 mt-4">
                  <ActionForm action={respondToAssignment}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="accept" value="true" />
                    <SubmitButton>Accept</SubmitButton>
                  </ActionForm>
                  <ActionForm
                    action={respondToAssignment}
                    confirm="Decline this review invitation?"
                  >
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="accept" value="false" />
                    <SubmitButton variant="secondary">Decline</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* -------- Accepted, awaiting review -------- */}
      <Section title="Awaiting your review">
        {active.length === 0 ? (
          <EmptyState
            title="Nothing to review right now"
            description="Accepted invitations will appear here."
          />
        ) : (
          <div className="space-y-3">
            {active.map((a) => {
              const late = a.due_date && new Date(a.due_date) < new Date();
              return (
                <div key={a.id} className="card card-pad">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {a.submissions?.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {a.submissions?.tracks?.name ?? "No track"}
                        {a.due_date && (
                          <span className={late ? "text-red-600 font-medium" : ""}>
                            {` · Due ${formatDate(a.due_date)}`}
                            {late ? " (overdue)" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/reviewer/reviews/${a.id}`}
                      className="btn-primary shrink-0"
                    >
                      {a.reviews?.[0] ? "Continue review" : "Start review"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* -------- History -------- */}
      {(done.length > 0 || declined.length > 0) && (
        <Section title="History">
          <div className="card divide-y divide-slate-100">
            {[...done, ...declined].map((a) => (
              <div
                key={a.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {a.submissions?.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.status === "submitted" ? "Review submitted" : "Declined"}
                    {a.responded_at ? ` · ${formatDate(a.responded_at)}` : ""}
                  </p>
                </div>
                {a.status === "submitted" && (
                  <Link
                    href={`/reviewer/reviews/${a.id}`}
                    className="text-sm text-blue-700 hover:underline shrink-0"
                  >
                    View
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
