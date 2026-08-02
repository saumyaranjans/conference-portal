import Link from "next/link";

import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";

type ConferenceDocumentPageProps = {
  title: string;
  description: string;
  pdf: string;
  pages: string[];
  embedPdf?: boolean;
};

export function ConferenceDocumentPage({
  title,
  description,
  pdf,
  pages,
  embedPdf = false,
}: ConferenceDocumentPageProps) {
  return (
    <main className="min-h-screen">
      <IkatStrip />

      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3">
        <Link
          href="/Home"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                     font-medium text-slate-700 transition hover:bg-white hover:text-blue-700
                     dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11l9-8 9 8M6 10v10h12V10" />
          </svg>
          Home
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary px-4 py-1.5 text-sm">
            Login
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-1.5 text-sm">
            Sign up
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4">
        <section className="card card-pad">
          <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500">
            GLOGIFT 2027 &middot; IIM SAMBALPUR
          </p>
          <h1 className="mb-3 text-3xl font-bold text-gradient">{title}</h1>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </section>

        <section className="space-y-5 rounded-3xl bg-slate-100 p-2 sm:p-5 dark:bg-slate-800/70">
          {embedPdf ? (
            <iframe
              src={`${pdf}?v=20260804#view=FitH&toolbar=1&navpanes=0`}
              title={`${title} PDF viewer`}
              className="mx-auto aspect-[210/297] w-full rounded-lg bg-white shadow-xl"
            />
          ) : (
            pages.map((page, index) => (
              <figure key={page}>
                <img
                  src={page}
                  alt={`${title}, page ${index + 1}`}
                  className="mx-auto h-auto w-full rounded-lg bg-white shadow-xl"
                />
                {pages.length > 1 && (
                  <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    Page {index + 1} of {pages.length}
                  </figcaption>
                )}
              </figure>
            ))
          )}
        </section>

        <section className="card card-pad text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Download the original high-quality PDF for printing or sharing.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href={pdf}
              download
              className="btn-attention inline-flex items-center gap-2 rounded-full border-2
                         border-blue-600 bg-white px-6 py-2.5 text-sm font-semibold
                         transition hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12m-4-4 4 4 4-4M4 19h16" />
              </svg>
              <span className="text-gradient">Download {title} (PDF)</span>
            </a>
            <Link href="/Home" className="btn-secondary">
              Back to conference website
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 pb-6 pt-5 text-center text-xs text-slate-500 dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 2027
          </span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">|</span>
          Indian Institute of Management Sambalpur
        </footer>
      </div>

      <IkatStrip flip />
    </main>
  );
}
