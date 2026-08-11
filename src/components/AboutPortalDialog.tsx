"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const POLICY_LINKS = [
  { href: "/privacy", label: "privacy policy" },
  { href: "/terms", label: "terms of use" },
  { href: "/refund-cancellation", label: "refund & cancellation policy" },
  { href: "/contact", label: "contact us" },
];

/**
 * "What is this portal?", opened over the sign-in page rather than inside it.
 *
 * It was a <details> block beneath the form. Expanding it pushed the form,
 * the provider buttons and the footer links down the page — on a laptop the
 * form scrolled out of view, so reading about the portal cost you sight of
 * the thing you came to use. A dialog leaves the page exactly where it was.
 *
 * Native <dialog> with showModal(): Escape, focus trapping and the top-layer
 * backdrop come from the browser rather than from us re-implementing them.
 */
export function AboutPortalDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      {/* One line of links rather than a panel. The box this replaced occupied
          more of the sign-in page than the sign-in form did, to say things a
          visitor reads once. About opens over the page; the four policies the
          payment gateway's review looks for are ordinary links, in the same
          lowercase wording as the site footer. */}
      <nav
        aria-label="About and policies"
        className="mt-6 space-y-1.5 border-t border-slate-200 pt-4 text-center
                   text-xs text-slate-500 dark:border-slate-700"
      >
        {/* Two rows on purpose: what this portal is, then the terms it runs
            under. On one row the four policies pushed About onto a line of its
            own anyway, but with a stray leading pipe wherever it wrapped. */}
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-blue-700 hover:underline dark:text-blue-300"
          >
            About the GLOGIFT 27 Submission Portal
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {POLICY_LINKS.map((l, i) => (
            <span key={l.href} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden className="text-slate-300 dark:text-slate-600">
                  |
                </span>
              )}
              {/* Left lowercase on purpose. These labels are the exact phrases
                  the payment gateway's review looks for, and the site footer
                  already renders them this way. */}
              <Link
                href={l.href}
                className="text-blue-700 hover:underline dark:text-blue-300"
              >
                {l.label}
              </Link>
            </span>
          ))}
        </div>
      </nav>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        // showModal() already closes on Escape in a normal browser, but some
        // embedded webviews swallow the key before it reaches the top layer.
        // Handling it explicitly costs nothing and makes the behaviour the
        // same everywhere; closing twice is idempotent.
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        // Clicking the backdrop closes it: the click lands on the <dialog>
        // itself, never on the inner panel, so comparing targets is enough.
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        // m-auto is load-bearing: a top-layer <dialog> centres itself through
        // `margin: auto`, and Tailwind's preflight resets margin to 0, which
        // pins it to the top-left corner of the viewport.
        className="m-auto w-[min(34rem,92vw)] rounded-2xl border border-slate-200 bg-white p-0
                   text-slate-600 shadow-2xl backdrop:bg-slate-900/50
                   dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        aria-labelledby="about-portal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2
            id="about-portal-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            About the GLOGIFT 27 Submission Portal
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Capped and scrollable so a small laptop viewport never pushes the
            close button off-screen. */}
        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
          <p>
            This is the official submission portal for GLOGIFT 27. Authors use
            it to submit an abstract or full paper to one of the ten conference
            tracks, add co-authors, respond to reviewer comments, upload a
            camera-ready copy, register and download their certificate.
            Reviewers read the papers assigned to them and submit evaluations;
            Track Editors and the Editorial Office assign reviewers, record
            decisions and build the programme.
          </p>
          <p>
            An account is required to submit or review. Register with an email
            address and password, or sign in with Google or Microsoft — from
            those we receive only your{" "}
            <strong className="font-semibold text-slate-800 dark:text-slate-200">
              name and email address
            </strong>
            , used solely to create and identify your conference account. We
            never receive your password, and we do not use this information for
            advertising or share it with third parties.
          </p>
          {/* All four policies the payment gateway's review looks for, in one
              place. Registration is paid for from inside this portal, so a
              delegate must be able to reach the refund terms from the same box
              that explains what the portal is. */}
          <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-slate-500">
            <span>See our</span>
            {POLICY_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-blue-700 hover:underline dark:text-blue-300"
              >
                {label}
              </Link>
            ))}
          </p>
          <p className="text-slate-500">
            Operated by the Indian Institute of Management Sambalpur in
            association with the GIFT Society.
          </p>
        </div>
      </dialog>
    </>
  );
}
