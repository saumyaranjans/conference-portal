import Link from "next/link";

import type { Metadata } from "next";
// Utility/token page — never index, never follow.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">
          You do not have access to that area
        </h1>
        <p className="text-slate-600 mt-2">
          This dashboard requires a role your account has not been granted. An
          administrator can change your roles.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to my dashboard
        </Link>
      </div>
    </main>
  );
}
