import type { CookieOptions } from "@supabase/ssr";

/**
 * Shape @supabase/ssr hands to `setAll`. Declared here because the library's
 * own callback types don't flow through to our inline implementations.
 */
export type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Make Supabase auth cookies *session* cookies: strip Max-Age / Expires so the
 * browser drops them when it fully closes, signing the user out on their next
 * visit (the portal must not remember a session across a closed window).
 *
 * A deletion — an empty value, already carrying maxAge:0 / a past expiry — is
 * passed through untouched so an explicit sign-out still removes the cookie
 * immediately rather than merely at end of session.
 */
export function sessionScopedCookie(
  value: string,
  options: CookieOptions
): CookieOptions {
  if (!value) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options ?? {};
  return rest;
}
