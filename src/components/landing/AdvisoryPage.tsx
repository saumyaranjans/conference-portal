import Link from "next/link";
import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SocialLinks } from "@/components/landing/SocialLinks";
import {
  LEADERSHIP,
  FACULTY,
  POST_DOC,
  STAFF,
  CommitteePanel,
  Avatar,
} from "@/components/landing/LandingPage";

/**
 * Conference Advisory — everyone behind GLOGIFT 27 on a page of their own.
 *
 * The people lists had grown long enough to push the landing page's substance
 * (tracks, dates, fees) below the fold, and they are reference material rather
 * than something a prospective author reads on the way to submitting.
 */
export function AdvisoryPage() {
  return (
    <main className="min-h-screen">
      <IkatStrip />

      <nav className="no-print max-w-6xl mx-auto px-4 pt-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11l9-8 9 8M6 10v10h12V10" />
          </svg>
          Home
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary min-h-11 whitespace-nowrap px-3 py-1.5 text-sm sm:px-4">
            Login
          </Link>
          <Link href="/signup" className="btn-primary min-h-11 whitespace-nowrap px-3 py-1.5 text-sm sm:px-4">
            Sign up
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-8">
        <section className="card card-pad">
          <p className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
            GLOGIFT 27 · IIM SAMBALPUR
          </p>
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Conference Advisory
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            The patrons, advisory leadership and conference committee guiding
            GLOGIFT 27 — the Twenty Seventh Global Conference on Flexible
            Systems Management, hosted at IIM Sambalpur from 25 to 27 February
            2027.
          </p>
        </section>

        {/* ---- Patrons & advisory leadership ---- */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Patrons &amp; advisory leadership
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEADERSHIP.map((p) => (
              <div key={p.name} className="card card-pad text-center card-hover">
                <div className="flex justify-center mb-4">
                  <Avatar name={p.name} size="lg" />
                </div>
                <p className="badge bg-blue-100 text-blue-800">{p.role}</p>
                <p className="text-base font-semibold text-slate-900 mt-2 dark:text-slate-100">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">{p.org}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Conference committee ---- */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Conference committee
          </h2>
          {/* The faculty list runs a full row wide and its overflow sits beside
              the other two panels, so the row never ends in empty space. */}
          <div className="grid gap-4 lg:grid-cols-6">
            <CommitteePanel
              group={FACULTY}
              people={FACULTY.people.slice(0, 6)}
              className="-mb-4 pb-2 rounded-b-none border-b-0
                         lg:col-span-6 lg:mb-0 lg:pb-4 lg:rounded-2xl lg:border-b"
              wide
            />
            <CommitteePanel
              group={FACULTY}
              people={FACULTY.people.slice(6)}
              className="pt-2 rounded-t-none lg:col-span-2 lg:pt-4 lg:rounded-2xl"
              hideLabel
            />
            <CommitteePanel
              group={POST_DOC}
              people={POST_DOC.people}
              className="lg:col-span-2"
            />
            <CommitteePanel
              group={STAFF}
              people={STAFF.people}
              className="lg:col-span-2"
            />
          </div>
        </section>

        <section className="card card-pad text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            For conference matters, write to the Conference Chair at{" "}
            <a
              href="mailto:glogift27.chair@iimsambalpur.ac.in"
              className="font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              glogift27.chair@iimsambalpur.ac.in
            </a>
            .
          </p>
          <div className="mt-4">
            <Link href="/" className="btn-secondary">
              ← Back to the conference home
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-700 pt-5 pb-6 text-center text-xs text-slate-500">
          <SocialLinks className="mb-4" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 27 (GLOGIFT 2027)
          </span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          © Indian Institute of Management Sambalpur
        </footer>
      </div>
      <IkatStrip flip />
    </main>
  );
}
