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
