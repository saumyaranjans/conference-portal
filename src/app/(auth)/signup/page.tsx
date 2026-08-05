import { HomeLink } from "@/components/HomeLink";
import { SignupForm } from "@/components/SignupForm";

import type { Metadata } from "next";
// Utility/token page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
        <SignupForm />
      </div>
    </main>
  );
}
