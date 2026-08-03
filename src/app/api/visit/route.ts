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
    // Geolocation from the edge/CDN headers (Vercel injects these).
    const h = req.headers;
    const dec = (v: string | null) => {
      if (!v) return null;
      try {
        return decodeURIComponent(v).slice(0, 120);
      } catch {
        return v.slice(0, 120);
      }
    };
    const num = (v: string | null) => {
      const n = v ? Number(v) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    await createAdminClient().from("site_visits").insert({
      path,
      country: h.get("x-vercel-ip-country"),
      region: h.get("x-vercel-ip-country-region"),
      city: dec(h.get("x-vercel-ip-city")),
      lat: num(h.get("x-vercel-ip-latitude")),
      lng: num(h.get("x-vercel-ip-longitude")),
    });
  } catch {
    // swallow — a counter must never affect the page
  }
  return new Response(null, { status: 204 });
}
