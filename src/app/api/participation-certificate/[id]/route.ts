import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated download of a participation certificate. Staff (Convener /
 * Editorial Office) may open any; everyone else only their own (matched by the
 * linked profile, or by email for a listed author who signed up under the same
 * address).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getProfile();
  if (!profile) return new NextResponse("Authentication required.", { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: record } = await admin
    .from("participation_certificates")
    .select("id, certificate_number, pdf_object_path, pdf_sha256, submission_author_id")
    .eq("id", id)
    .maybeSingle();
  if (!record) return new NextResponse("Certificate not found.", { status: 404 });

  const isStaff =
    profile.roles.includes("admin") || profile.roles.includes("chief");
  if (!isStaff) {
    const { data: author } = await admin
      .from("submission_authors")
      .select("profile_id, email")
      .eq("id", record.submission_author_id)
      .maybeSingle();
    const ownsById =
      (author as any)?.profile_id && (author as any).profile_id === profile.id;
    const ownsByEmail =
      (author as any)?.email &&
      (profile as any).email &&
      (author as any).email.trim().toLowerCase() ===
        (profile as any).email.trim().toLowerCase();
    if (!ownsById && !ownsByEmail) {
      return new NextResponse("You may only download your own certificate.", {
        status: 403,
      });
    }
  }

  const { data: pdfBlob, error: downloadError } = await admin.storage
    .from("certificate-assets")
    .download(record.pdf_object_path);
  if (downloadError || !pdfBlob) {
    return new NextResponse("The certificate file could not be loaded.", {
      status: 409,
    });
  }
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  if (createHash("sha256").update(pdfBytes).digest("hex") !== record.pdf_sha256) {
    return new NextResponse("Certificate integrity verification failed.", {
      status: 409,
    });
  }
  const safeNumber = record.certificate_number.replace(/[^A-Za-z0-9_-]/g, "_");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeNumber}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
