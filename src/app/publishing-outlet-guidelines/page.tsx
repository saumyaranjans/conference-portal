import type { Metadata } from "next";
import Link from "next/link";

import { PUBLICATIONS } from "@/components/landing/publications";

export const metadata: Metadata = {
  title: "Publishing Outlet Guidelines",
  description:
    "The journals and book series GLOGIFT 27 papers may be fast-tracked to — what each one suits, and where to find its own author instructions.",
};

/**
 * What each outlet is for, and where its real requirements live.
 *
 * Deliberately does not restate any publisher's word limits or formatting
 * rules. Those change without notice, and a stale copy here would send an
 * author to the wrong requirements while looking authoritative. Every outlet
 * links to its publisher instead.
 */
export default function PublishingOutletGuidelinesPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/#attractions"
          className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          ← Back to the conference
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
          Publishing Outlet Guidelines
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Papers presented at GLOGIFT 27 may be considered for the outlets
          below. Selection is made by the respective editorial boards, and every
          journal applies its own review process in full — being selected here
          is an invitation to submit, not an acceptance.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>Read the publisher&rsquo;s own instructions before you
          submit.</strong> Word limits, structure and formatting differ by
          outlet and are set by the publisher, not by the conference. This page
          links to each one rather than restating rules that would go stale.
        </div>

        <div className="mt-8 space-y-4">
          {PUBLICATIONS.map((p) => (
            <article
              key={p.title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-28 w-[5.25rem] shrink-0 rounded-md bg-white object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
              <div className="min-w-0">
                <span className="badge bg-amber-100 text-amber-900">
                  {p.badge}
                </span>
                <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  {p.title}
                </h2>
                {p.suits && (
                  <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {p.suits}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Visit outlet
                    </a>
                  )}
                  {p.guidelines && (
                    <a
                      href={p.guidelines}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Author instructions
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            How a paper reaches one of these
          </h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>Submit a full paper under Pathway B and present it at the conference.</li>
            <li>The editorial team may select it for one of the outlets above.</li>
            <li>
              You submit to that outlet yourself, following its own instructions,
              and it goes through that outlet&rsquo;s review in full.
            </li>
          </ol>
          <p className="mt-4">
            Pathway A papers are presented on the accepted abstract and appear in
            the proceedings; a full paper is needed for any of the journals.
            The{" "}
            <Link
              href="/full-paper-submission-guidelines"
              className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              Full Paper Submission Guidelines
            </Link>{" "}
            cover the templates and the conference&rsquo;s own requirements.
          </p>
        </div>
      </div>
    </main>
  );
}
