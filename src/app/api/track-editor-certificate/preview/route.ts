import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { buildTrackEditorCertificate } from "@/lib/certificateBuilders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff-only, on-the-fly preview of a track-editor certificate (nothing stored). */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile) return new NextResponse("Authentication required.", { status: 401 });
  const isStaff =
    profile.roles.includes("admin") || profile.roles.includes("chief");
  if (!isStaff) return new NextResponse("Staff only.", { status: 403 });

  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (!email) return new NextResponse("Missing email.", { status: 400 });

  const admin = createAdminClient();
  const res = await buildTrackEditorCertificate(admin, email, "To be assigned");
  if (!res.ok) return new NextResponse(res.message, { status: 409 });

  return new NextResponse(Buffer.from(res.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${res.filename}"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
