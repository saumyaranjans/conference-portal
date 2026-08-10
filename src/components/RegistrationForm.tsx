"use client";

import { useState } from "react";
import { submitRegistration } from "@/lib/registrationActions";
import {
  PARTICIPATION_MODES,
  participationModeLabel,
  pathwayLabel,
  trackLabel,
} from "@/lib/types";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";
import {
  REFUND_POLICY_CLAUSES,
  REFUND_POLICY_CONSENT,
  REFUND_POLICY_HEADING,
} from "@/lib/refundPolicy";

type Track = { code: string | null; name: string | null };

type Paper = {
  id: string;
  paper_id: string | null;
  title: string;
  submission_type: string;
  participation_mode: string | null;
  /** Supabase returns a to-one embed as an object, but not always. */
  tracks: Track | Track[] | null;
};

/** The read-only rows shown for one accepted paper. */
function detailsOf(p: Paper): [string, string][] {
  return (
    [
      ["Pathway", pathwayLabel(p.submission_type)],
      ["Track", trackLabel(p.tracks)],
      ["Attending as", participationModeLabel(p.participation_mode ?? "")],
    ] as [string, string | null][]
  ).filter((r): r is [string, string] => !!r[1] && r[1] !== "—");
}

/**
 * The delegate's half of registration: confirming what has been accepted, and
 * accepting the refund policy.
 *
 * An author with accepted work is asked NOTHING about it here. The pathway,
 * the track and how they will attend were all fixed when the paper was
 * submitted — and the acknowledgement email tells the author they cannot be
 * changed afterwards — so offering a choice would be offering to change
 * something that cannot change. Every accepted abstract is listed instead:
 * one block if one was accepted, two if both were. A delegate with no accepted
 * paper still picks a mode, because there is no submission to read one from.
 *
 * Notably absent: the amount. The fee is shown above this form for
 * information, but nothing here submits a figure — submitRegistration computes
 * it from the signed-in profile, so a tampered form field has nowhere to land.
 * The same is true of the paper and the mode: the server re-reads both from
 * the author's own accepted submissions and ignores the fields below.
 */
export function RegistrationForm({
  papers,
  payable,
}: {
  papers: Paper[];
  /** False when the fee could not be determined (no participant category). */
  payable: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(
    null
  );
  const [accepted, setAccepted] = useState(false);

  // Registration is per delegate, so one row is written however many papers
  // were accepted. The first is the one it is filed against; the rest are
  // shown because the delegate is presenting them too.
  const primary = papers[0] ?? null;

  // Both abstracts should carry the same mode — they were submitted by the
  // same person — but nothing in the schema enforces it, so say so rather than
  // silently registering them under one of the two.
  const modes = new Set(papers.map((p) => p.participation_mode ?? ""));
  const modesDisagree = modes.size > 1;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setResult(null);
    try {
      const res = await submitRegistration(new FormData(form));

      // The gateway wants a signed form POST, not a redirect: build it in a
      // detached form and submit, so the signed fields never touch the URL.
      if (res.ok && res.checkout) {
        const c = res.checkout;
        if (c.method === "redirect") {
          window.location.href = c.url;
          return;
        }
        const form = document.createElement("form");
        form.method = "POST";
        form.action = c.url;
        for (const [name, value] of Object.entries(c.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      setResult(res);
      if (res.ok) {
        form.reset();
        // The consent box is controlled, so form.reset() alone would leave it
        // ticked.
        setAccepted(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad space-y-6">
      <fieldset disabled={pending || !payable} className="contents">
        {/* Every accepted abstract, read-only. No selector: the delegate is
            presenting all of them, and none of these values is theirs to
            change here. */}
        {papers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">
              {papers.length > 1
                ? `Your accepted papers (${papers.length})`
                : "Your accepted paper"}
            </h3>

            <div className="space-y-3">
              {papers.map((p) => {
                const isB = p.submission_type === "full_paper_presentation";
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {p.paper_id ? `${p.paper_id} — ` : ""}
                        {p.title}
                      </p>
                      {/* The pathway, called out rather than buried in the
                          rows — it is the thing authors ask about most. */}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          isB
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        }`}
                      >
                        {isB ? "Pathway B" : "Pathway A"}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      {detailsOf(p).map(([term, value]) => (
                        <div key={term} className="sm:flex sm:gap-4">
                          <dt className="text-slate-500 sm:w-32 sm:shrink-0">
                            {term}
                          </dt>
                          <dd className="text-slate-900 dark:text-slate-100">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Fetched from your submissions and fixed when you submitted them —
              they cannot be changed here. If anything is wrong, contact the
              Editorial Office.
              {papers.length > 1 &&
                " Registration is per delegate, not per paper: one fee covers both."}
            </p>

            {modesDisagree && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Your papers record different attendance modes. Registration will
                be filed as{" "}
                <strong>
                  {participationModeLabel(primary?.participation_mode ?? "")}
                </strong>
                . Contact the Editorial Office if that is wrong.
              </p>
            )}

            {/* Informational only — submitRegistration re-reads both from the
                author's own accepted submissions and ignores these. */}
            <input type="hidden" name="submission_id" value={primary?.id ?? ""} />
            <input
              type="hidden"
              name="participation_mode"
              value={primary?.participation_mode ?? ""}
            />
          </div>
        )}

        {/* No accepted paper means no submission to read a mode from, so ask. */}
        {papers.length === 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">
              How will you attend? <span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              {PARTICIPATION_MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <input
                    type="radio"
                    name="participation_mode"
                    value={m.value}
                    required
                    className="accent-blue-600"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Coupon. Shown to everyone rather than only to self-declared
            members: the code is what grants the discount, and a delegate who
            has one should not have to have ticked a box at sign-up to be
            offered the box to type it in. */}
        <div>
          <label
            htmlFor="coupon_code"
            className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-2"
          >
            Coupon code{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="coupon_code"
            name="coupon_code"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="GIFT-XXXX-XXXX"
            className="input w-full font-mono uppercase sm:max-w-xs"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            GIFT Society members are emailed a {MEMBER_DISCOUNT_PERCENT}%
            discount code once the Editorial Office has verified their
            membership. The reduced amount is shown before anything is charged.
          </p>
        </div>

        {/* Refund policy — displayed in full, acceptance recorded */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {REFUND_POLICY_HEADING}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90 dark:text-amber-100/90">
            {REFUND_POLICY_CLAUSES.map((clause) => (
              <li key={clause} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{clause}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="refund_policy"
              value="1"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-blue-600"
            />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {REFUND_POLICY_CONSENT}
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={pending || !accepted || !payable}
        >
          {pending ? "Please wait…" : "Continue to payment"}
        </button>
      </fieldset>

      {result?.message && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            result.ok
              ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10"
              : "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/10"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
