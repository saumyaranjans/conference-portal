"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * The portal header brand. Acts as the "go to public home" control — and, per
 * the security rule, signs the user out of the portal on the way there. Runs
 * the sign-out in the browser first (so it works on a soft navigation too),
 * then does a full navigation to the public landing.
 */
export function BrandHomeLink() {
  async function goHome() {
    try {
      await createClient().auth.signOut();
    } catch {
      /* navigate regardless — the home route also clears the session */
    }
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={goHome}
      className="flex items-center gap-2.5 shrink-0"
      title="Go to the public home — this signs you out of the portal"
    >
      <img
        src="/glogift-logo.png"
        alt="GLOGIFT"
        className="h-9 w-auto object-contain"
      />
      <span className="text-lg font-bold tracking-tight text-gradient w-fit">
        GLOGIFT 27
      </span>
    </button>
  );
}
