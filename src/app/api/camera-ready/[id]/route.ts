import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Streams a submission's camera-ready PDF from our own origin so the browser's
 * built-in PDF viewer can render it inline. A cross-origin (Supabase) URL is
 * blocked from the embedded viewer by our Cross-Origin-Resource-Policy, which
 * is why the object/iframe showed blank.
 *
 * The camera-ready cover carries author identities, so this is limited to the
 * corresponding author, the assigned Track Editor, and the Convener/Editorial
 * Office. Reviewers never receive it (single-blind).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("author_id, assigned_editor_id, full_paper_pdf_path, paper_id")
    .eq("id", id)
    .maybeSingle();
  const s = sub as any;
  if (!s?.full_paper_pdf_path) return new Response("Not found", { status: 404 });

  const allowed =
    s.author_id === profile.id ||
    s.assigned_editor_id === profile.id ||
    profile.roles.includes("chief") ||
    profile.roles.includes("admin");
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const { data: blob, error } = await admin.storage
    .from("papers")
    .download(s.full_paper_pdf_path);
  if (error || !blob) return new Response("Not found", { status: 404 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${s.paper_id ?? "manuscript"}-camera-ready.pdf"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  });
}
