import { HomeLink } from "@/components/HomeLink";
import { OAuthButtons } from "@/components/OAuthButtons";
import { SignupForm } from "@/components/SignupForm";

import type { Metadata } from "next";
// Utility/token page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Mirrors the gate inside OAuthButtons, so the card and divider that frame
 *  those buttons vanish with them rather than leaving an empty box. */
const oauthEnabled =
  (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").trim().length > 0;

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <HomeLink />
        </div>
        <h1 className="text-2xl font-semibold text-center mb-6">
          Create your account
        </h1>

        {/* The quick route in. Whichever provider they choose, they still
            finish the same details at /complete-profile. */}
        {oauthEnabled && (
          <>
            <div className="card card-pad mb-5">
              <OAuthButtons label="Sign up with" />
              <p className="mt-3 text-center text-xs text-slate-400">
                We will ask for your institution and participant category next.
              </p>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">
                or register with an email address
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
          </>
        )}

        <SignupForm />
      </div>
    </main>
  );
}
