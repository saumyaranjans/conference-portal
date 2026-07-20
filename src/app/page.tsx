import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/types";

const PRIORITY: AppRole[] = ["admin", "chief", "editor", "reviewer", "author"];

export default async function Home() {
  const profile = await getProfile();

  // Signed in? Go straight to the most privileged dashboard they hold.
  if (profile) {
    const primary = PRIORITY.find((r) => profile.roles.includes(r)) ?? "author";
    redirect(ROLE_HOME[primary]);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold">Conference Portal</span>
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 max-w-5xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 max-w-2xl">
          One portal for the whole peer-review pipeline.
        </h1>
        <p className="text-lg text-slate-600 mt-4 max-w-2xl">
          Authors submit and track. Reviewers score. Editors assign and
          recommend. The Editor-in-Chief decides. Administrators keep it all
          running — every dashboard reading from the same record.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {(
            [
              ["author", "Submit papers, upload revisions, read reviews and decisions."],
              ["reviewer", "Accept invitations, score submissions, advise the editor."],
              ["editor", "Triage your track, assign reviewers, recommend an outcome."],
              ["chief", "Ratify or override recommendations; own the final call."],
              ["admin", "Manage users, roles, tracks and conference configuration."],
            ] as [AppRole, string][]
          ).map(([role, blurb]) => (
            <div key={role} className="card card-pad">
              <p className="font-medium text-slate-900">{ROLE_LABELS[role]}</p>
              <p className="text-sm text-slate-500 mt-1.5">{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
        Conference Submission Portal
      </footer>
    </main>
  );
}
