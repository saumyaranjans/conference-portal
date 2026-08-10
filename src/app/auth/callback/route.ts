import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type AppRole } from "@/lib/types";

/** Landing priority for multi-role users (mirrors the proxy and login form). */
const ROLE_PRIORITY: AppRole[] = ["chief", "editor", "author", "reviewer", "admin"];

/**
 * Completes any code-based sign-in: a password-reset or magic link, and now a
 * Google / Microsoft round trip.
 *
 * The provider verifies who someone is; it cannot tell us where they work or
 * which participant category they fall under. So a first-time OAuth account
 * lands on /complete-profile rather than a dashboard it has no business
 * reaching half-registered.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Providers report a refusal (closed window, denied consent) this way.
  const oauthError = searchParams.get("error");
  const requestedNext = searchParams.get("next") ?? "";

  // Only permit an internal, root-relative destination. This prevents an auth
  // email from being turned into an open redirect to a phishing site.
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\") &&
    requestedNext.length <= 512 &&
    !/[\u0000-\u001f\u007f]/.test(requestedNext)
      ? requestedNext
      : "";

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_cancelled`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed_at, roles")
          .eq("id", user.id)
          .single();

        // A password-reset link carries ?next=/reset-password and must reach it
        // even mid-registration, or the person cannot recover their account.
        if (profile && !profile.profile_completed_at && !next) {
          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        if (!next) {
          const roles = (profile?.roles ?? []) as AppRole[];
          const primary = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "author";
          return NextResponse.redirect(`${origin}${ROLE_HOME[primary]}`);
        }
      }

      return NextResponse.redirect(`${origin}${next || "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
