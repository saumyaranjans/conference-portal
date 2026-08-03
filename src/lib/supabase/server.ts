import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sessionScopedCookie, type CookieToSet } from "@/lib/supabase/cookies";

/** Request-scoped client that respects RLS as the signed-in user. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, sessionScopedCookie(value, options))
            );
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead, so this is safe to swallow.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses RLS entirely — only ever call this from
 * server actions / route handlers that have already checked the caller's
 * role, and never pass the instance to the client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
