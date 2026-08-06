import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every participation certificate a person holds, merged into ONE download.
 *
 * A certificate is issued per accepted paper — each with its own number, which
 * is what makes it verifiable — but an author on two accepted papers should not
 * have to collect two files. This route resolves the person from any one of
 * their author rows, gathers their certificates and concatenates the stored
 * PDFs into a single document, one certificate per page.
 *
 * Falls out naturally to the cases the Office cares about: two accepted papers
 * give a two-page PDF, one accepted and one rejected gives a one-page PDF, and
 * nothing accepted gives a 404 — a rejected paper never earns a certificate, so
 * there is no file to hand over.
 *
 * `[id]` is a submission_authors id; any of the person's rows leads to the same
 * bundle, so callers do not need to know which one is "first".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile) return new NextResponse("Authentication required.", { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: anchor } = await admin
    .from("submission_authors")
    .select("id, email, full_name, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!anchor) return new NextResponse("Author not found.", { status: 404 });

  const email = ((anchor as any).email ?? "").trim();
  if (!email) return new NextResponse("Author has no email on record.", { status: 404 });

  // Staff may fetch anyone's; everyone else only their own, matched by the
  // linked profile or by the address they signed up with.
  const isStaff = profile.roles.includes("admin") || profile.roles.includes("chief");
  if (!isStaff) {
    const ownsById =
      (anchor as any).profile_id && (anchor as any).profile_id === profile.id;
    const ownsByEmail =
      (profile as any).email &&
      email.toLowerCase() === String((profile as any).email).trim().toLowerCase();
    if (!ownsById && !ownsByEmail) {
      return new NextResponse("You may only download your own certificates.", {
        status: 403,
      });
    }
  }

  // Every author row this person holds, and the certificates against them.
  const { data: rows } = await admin
    .from("submission_authors")
    .select("id, submissions!inner(paper_id)")
    .ilike("email", email);
  const rowIds = ((rows ?? []) as any[]).map((r) => r.id);
  if (rowIds.length === 0) {
    return new NextResponse("No certificates for this author.", { status: 404 });
  }

  const { data: certs } = await admin
    .from("participation_certificates")
    .select("certificate_number, pdf_object_path, submission_author_id, generated_at")
    .in("submission_author_id", rowIds)
    .order("generated_at");

  const list = (certs ?? []) as any[];
  if (list.length === 0) {
    return new NextResponse(
      "No participation certificate has been generated for this author.",
      { status: 404 }
    );
  }

  // One page per certificate, in the order they were issued.
  const merged = await PDFDocument.create();
  let added = 0;
  for (const cert of list) {
    const { data: blob } = await admin.storage
      .from("certificate-assets")
      .download(cert.pdf_object_path);
    if (!blob) continue;
    const doc = await PDFDocument.load(await blob.arrayBuffer());
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
    added += 1;
  }
  if (added === 0) {
    return new NextResponse("The certificate files could not be loaded.", {
      status: 409,
    });
  }

  merged.setTitle(`GLOGIFT 27 participation certificates — ${(anchor as any).full_name ?? email}`);
  merged.setProducer("GLOGIFT 27 conference portal");
  const bytes = await merged.save();

  const safeName = String((anchor as any).full_name ?? "author")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="glogift27-certificates-${safeName || "author"}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
