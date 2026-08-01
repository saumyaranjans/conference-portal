import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/ReviewForm";
import { CameraReadyPreview } from "@/components/CameraReadyPreview";
import { DocumentViewer } from "@/components/DocumentViewer";
import { PageHeader, Section } from "@/components/ui/Primitives";
import { versionLabel } from "@/lib/types";

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
      "*, submissions(id, title, abstract, keywords, file_path, file_name, version, paper_id, stage, tracks(name, conferences(name)))"
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
        subtitle={`${sub?.paper_id ? `Paper ${sub.paper_id} · ` : ""}${sub?.tracks?.name ?? "No track"} · ${versionLabel(sub?.version)}`}
        action={
          assignment.reviewer_number ? (
            <span className="badge bg-blue-100 text-blue-800">
              You are Reviewer {assignment.reviewer_number}
            </span>
          ) : undefined
        }
      />

      {/* The reviewer never sees author identities — single-blind by design,
          so the camera-ready proof is shown with the author block withheld. */}
      <Section title="Abstract (camera-ready)">
        <CameraReadyPreview
          conferenceName={sub?.tracks?.conferences?.name ?? "GLOGIFT 2027"}
          trackName={sub?.tracks?.name ?? ""}
          title={sub?.title ?? ""}
          authors={[]}
          abstract={sub?.abstract ?? ""}
          keywords={(sub?.keywords ?? []).join(", ")}
        />
        <p className="text-xs text-slate-400 mt-2">
          Author identities are withheld — reviews are single-blind.
        </p>
      </Section>

      {sub?.file_path && (
        <Section
          title={sub?.stage === "full_paper" ? "Full paper" : "Manuscript"}
        >
          <DocumentViewer filePath={sub.file_path} fileName={sub.file_name} />
        </Section>
      )}

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
