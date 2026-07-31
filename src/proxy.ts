import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieToSet } from "@/lib/supabase/cookies";

const PROTECTED = ["/author", "/reviewer", "/editor", "/chief", "/admin"];

/**
 * Content Security Policy, built per request around a fresh nonce.
 *
 * Only scripts carrying this request's nonce run, so an injected <script> —
 * the payload of most XSS — is refused by the browser even if it reaches the
 * page. `strict-dynamic` lets Next's own bootstrap load its chunks without
 * naming every URL. Styles still need 'unsafe-inline': Tailwind and React
 * both set inline style attributes, and there is no nonce path for those.
 */
function contentSecurityPolicy(nonce: string, dev: boolean) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return [
    "default-src 'self'",
    // `unsafe-eval` is only tolerable for the dev server's refresh runtime.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Supabase for auth, database, storage and realtime; ROR for the
    // institution lookup on the signup form.
    `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")} https://api.ror.org${dev ? " ws: http://localhost:*" : ""}`,
    // Papers are downloaded from Supabase storage.
    `form-action 'self'`,
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // The campus map on /how-to-reach is a Google Maps embed.
    "frame-src 'self' blob: https://www.google.com https://maps.google.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

// Next 16 renamed the `middleware` convention to `proxy`.
export default async function proxy(request: NextRequest) {
  // A new nonce per request; Next stamps it onto the scripts it emits.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  // Next reads these off the *request* to thread the nonce through rendering.
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  let response = NextResponse.next({ request });
  response.headers.set("content-security-policy", csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          response.headers.set("content-security-policy", csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth cookie so Server Components see a valid session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Segment-aware match so /reviewer-invite (a public invitation link) is not
  // caught by the /reviewer prefix.
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    // Home applies the multi-role landing priority (see src/app/page.tsx).
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
