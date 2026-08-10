import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Records one public page view. Called from VisitTracker on every public page,
 * once per path per browser session: rows are page views, distinct session ids
 * are visitors. Writes via the service role (the table is otherwise read-only
 * to staff). Best-effort — never throws to the caller.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: unknown;
      session_id?: unknown;
      referrer?: unknown;
    };
    const path =
      typeof body.path === "string" ? body.path.slice(0, 200) : "/";
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
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
      session_id: str(body.session_id, 64),
      referrer: str(body.referrer, 300),
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
