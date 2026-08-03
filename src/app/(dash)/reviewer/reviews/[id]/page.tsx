import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/ReviewForm";
import { CameraReadyPreview } from "@/components/CameraReadyPreview";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ManuscriptFilesView } from "@/components/ManuscriptFilesView";
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
      "*, submissions(id, title, abstract, keywords, file_path, file_name, version, paper_id, stage, full_paper_pdf_built_at, tracks(name, conferences(name)))"
    )
    .eq("id", id)
    .eq("reviewer_id", profile.id)
    .neq("status", "declined")
    .single();

  if (!assignment) notFound();

  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("assignment_id", id)
    .maybeSingle();

  const sub = (assignment as any).submissions;
  const locked = assignment.status === "submitted" || !!review?.is_submitted;

  // For a Pathway B manuscript under review, pull the blinded file package.
  // submission_files RLS has no reviewer SELECT policy (staff-only), so the
  // user client returns nothing here. The assignment lookup above already
  // proved this reviewer is assigned, so read with the admin client and drop
  // the identity-bearing Title Page (single-blind). File bytes are still served
  // through /api/paper-file, which re-checks blinding server-side.
  const { data: manuscriptFiles } =
    sub?.stage === "full_paper"
      ? await createAdminClient()
          .from("submission_files")
          .select("id, slot, file_name, file_path")
          .eq("submission_id", sub.id)
          .neq("slot", "title_page")
      : { data: [] as any[] };

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

      {/* The reviewer never sees author identities — double-blind by design.
          At the manuscript stage the reviewer is assessing the full paper, so we
          lead with the blinded manuscript preview and do not surface a separate
          abstract camera-ready proof. At the abstract stage, the camera-ready
          proof is the thing under review. */}
      {sub?.stage === "full_paper" ? (
        <Section title="Manuscript (blinded)">
          <ManuscriptFilesView
            role="reviewer"
            submissionId={sub.id}
            files={(manuscriptFiles as any[]) ?? []}
            reviewCopyBuiltAt={(sub as any).full_paper_pdf_built_at}
          />
          <p className="text-xs text-slate-400 mt-2">
            Author identities are withheld — reviews are double-blind.
          </p>
        </Section>
      ) : (
        <>
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
              Author identities are withheld — reviews are double-blind.
            </p>
          </Section>

          {sub?.file_path && (
            <Section title="Manuscript">
              <DocumentViewer filePath={sub.file_path} fileName={sub.file_name} />
            </Section>
          )}
        </>
      )}

      <Section title={locked ? "Your submitted review" : "Your review"}>
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
