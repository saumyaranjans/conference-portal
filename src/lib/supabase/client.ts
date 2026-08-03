"use client";

import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize, type SerializeOptions } from "cookie";
import { sessionScopedCookie } from "@/lib/supabase/cookies";

/**
 * Browser client. Cookie handling mirrors @supabase/ssr's own document.cookie
 * default (same `cookie` parse/serialize), except every auth cookie is written
 * *session-scoped* (no Max-Age/Expires) — so closing the browser signs the user
 * out. Sign-out deletions keep their expiry and remove the cookie immediately.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const parsed = parse(document.cookie);
          return Object.keys(parsed).map((name) => ({
            name,
            value: parsed[name] ?? "",
          }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            document.cookie = serialize(
              name,
              value,
              sessionScopedCookie(value, options) as SerializeOptions
            );
          }
        },
      },
    }
  );
}
