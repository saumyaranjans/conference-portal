import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Streams a single Pathway B manuscript file from our own origin so the
 * browser's PDF viewer can render it inline (a cross-origin Supabase URL is
 * blocked from the embedded viewer by our Cross-Origin-Resource-Policy).
 *
 * Access mirrors the storage RLS: the corresponding author, the assigned Track
 * Editor, the Convener/Editorial Office, and assigned reviewers. Reviewers are
 * double-blind — they are refused identity-bearing files (the Title Page).
 */
const IDENTITY_SLOTS = new Set(["title_page"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: file } = await admin
    .from("submission_files")
    .select("submission_id, slot, file_path, file_name")
    .eq("id", fileId)
    .maybeSingle();
  const f = file as any;
  if (!f) return new Response("Not found", { status: 404 });

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, assigned_editor_id")
    .eq("id", f.submission_id)
    .maybeSingle();
  const s = sub as any;
  if (!s) return new Response("Not found", { status: 404 });

  const isAuthor = s.author_id === profile.id;
  const isEditor = s.assigned_editor_id === profile.id;
  const isStaff = profile.roles.includes("chief") || profile.roles.includes("admin");
  const { data: asg } = await admin
    .from("assignments")
    .select("id")
    .eq("submission_id", f.submission_id)
    .eq("reviewer_id", profile.id)
    .neq("status", "declined")
    .limit(1);
  const isReviewer = ((asg as any[]) ?? []).length > 0;
  const identityCleared = isAuthor || isEditor || isStaff;

  if (!(identityCleared || isReviewer))
    return new Response("Forbidden", { status: 403 });
  // Single-blind: a reviewer never receives identity-bearing files.
  if (!identityCleared && IDENTITY_SLOTS.has(f.slot))
    return new Response("Forbidden", { status: 403 });

  const { data: blob, error } = await admin.storage
    .from("papers")
    .download(f.file_path);
  if (error || !blob) return new Response("Not found", { status: 404 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isPdf = /\.pdf$/i.test(f.file_name);
  return new Response(bytes, {
    headers: {
      // PDFs render inline (no disposition); other types download.
      "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
      ...(isPdf ? {} : { "Content-Disposition": `attachment; filename="${f.file_name}"` }),
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
