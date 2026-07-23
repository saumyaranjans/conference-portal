import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/ReviewForm";
import { PaperDownload } from "@/components/PaperUpload";
import { PageHeader, Section } from "@/components/ui/Primitives";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("reviewer");
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "*, submissions(id, title, abstract, keywords, file_path, file_name, version, paper_id, tracks(name))"
    )
    .eq("id", id)
    .eq("reviewer_id", profile.id)
    .single();

  if (!assignment) notFound();

  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("assignment_id", id)
    .maybeSingle();

  const sub = (assignment as any).submissions;
  const locked = assignment.status === "submitted";

  return (
    <>
      <div className="mb-2">
        <Link href="/reviewer" className="text-sm text-blue-700 hover:underline">
          ← My reviews
        </Link>
      </div>

      <PageHeader
        title={sub?.title ?? "Submission"}
        subtitle={`${sub?.paper_id ? `Paper ${sub.paper_id} · ` : ""}${sub?.tracks?.name ?? "No track"} · Version ${sub?.version ?? 1}`}
        action={
          assignment.reviewer_number ? (
            <span className="badge bg-blue-100 text-blue-800">
              You are Reviewer {assignment.reviewer_number}
            </span>
          ) : undefined
        }
      />

      {/* The reviewer never sees author identities — single-blind by design. */}
      <Section title="Abstract">
        <div className="card card-pad">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {sub?.abstract}
          </p>
          {sub?.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {sub.keywords.map((k: string) => (
                <span key={k} className="badge bg-slate-100 text-slate-600">
                  {k}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4">
            <PaperDownload filePath={sub?.file_path} fileName={sub?.file_name} />
          </div>
        </div>
      </Section>

      <Section title={locked ? "Your submitted review" : "Your review"}>
        {locked && (
          <div className="card card-pad bg-emerald-50 border-emerald-200 mb-4">
            <p className="text-sm text-emerald-900">
              This review has been submitted and can no longer be edited.
            </p>
          </div>
        )}
        <ReviewForm
          assignmentId={id}
          submissionId={sub.id}
          review={review}
          locked={locked}
        />
      </Section>
    </>
  );
}
