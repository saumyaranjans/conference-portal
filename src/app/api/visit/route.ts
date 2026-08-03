import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Records one website visit. Called from the public landing page once per
 * browser session, so the count approximates unique visitor sessions. Writes
 * via the service role (the table is otherwise read-only to staff). Best-effort
 * — never throws to the caller.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { path?: unknown };
    const path =
      typeof body.path === "string" ? body.path.slice(0, 200) : "/";
    await createAdminClient().from("site_visits").insert({ path });
  } catch {
    // swallow — a counter must never affect the page
  }
  return new Response(null, { status: 204 });
}
