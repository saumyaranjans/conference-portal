import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Streams the blinded review copy of a Pathway B manuscript — the same compiled
 * PDF as the camera-ready but with a cover that WITHHOLDS the author list. It is
 * therefore safe for double-blind reviewers, and is also visible to the author,
 * the assigned Track Editor and the Convener/Editorial Office.
 *
 * Served from our own origin (with CORP cross-origin) so the inline PDF viewer
 * can render it — see /api/camera-ready for the same pattern.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, assigned_editor_id, full_paper_review_pdf_path, paper_id")
    .eq("id", id)
    .maybeSingle();
  const s = sub as any;
  if (!s) return new Response("Not found", { status: 404 });

  // Optional ?round=N serves that round's retained copy (for the reviewer's
  // original-vs-revised comparison); otherwise the current review copy.
  const roundParam = req.nextUrl.searchParams.get("round");
  let objectPath: string | null = s.full_paper_review_pdf_path ?? null;
  if (roundParam) {
    const { data: rc } = await admin
      .from("submission_review_copies")
      .select("path")
      .eq("submission_id", id)
      .eq("round", Number(roundParam))
      .maybeSingle();
    objectPath = (rc as any)?.path ?? null;
  }
  if (!objectPath) return new Response("Not found", { status: 404 });

  const isStaff = profile.roles.includes("chief") || profile.roles.includes("admin");
  let allowed =
    s.author_id === profile.id || s.assigned_editor_id === profile.id || isStaff;
  if (!allowed) {
    // Assigned (non-declined) reviewers may see the blinded copy.
    const { data: asg } = await admin
      .from("assignments")
      .select("id")
      .eq("submission_id", id)
      .eq("reviewer_id", profile.id)
      .neq("status", "declined")
      .limit(1);
    allowed = ((asg as any[]) ?? []).length > 0;
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const { data: blob, error } = await admin.storage
    .from("papers")
    .download(objectPath);
  if (error || !blob) return new Response("Not found", { status: 404 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
