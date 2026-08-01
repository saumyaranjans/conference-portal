import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the link from a password-reset (or magic-link) email: exchanges
 * the one-time code for a session, then forwards to `next` (the reset form).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/";
  // Only permit an internal, root-relative destination. This prevents an auth
  // email from being turned into an open redirect to a phishing site.
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\") &&
    requestedNext.length <= 512 &&
    !/[\u0000-\u001f\u007f]/.test(requestedNext)
      ? requestedNext
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
