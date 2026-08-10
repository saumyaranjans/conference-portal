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

/**
 * The delegate's half of registration: which paper (if any) they are
 * presenting, and acceptance of the refund policy.
 *
 * How they will attend, their pathway and their track are NOT asked for again.
 * All three were fixed when the paper was submitted — and the acknowledgement
 * email tells the author they cannot be changed afterwards — so picking the
 * paper fetches them and the form shows them back read-only. Only a delegate
 * attending without a paper still chooses a mode, because there is no
 * submission to read one from.
 *
 * Notably absent: the amount. The fee is shown above this form for
 * information, but nothing here submits a figure — submitRegistration computes
 * it from the signed-in profile, so a tampered form field has nowhere to land.
 * The same is true of the mode once a paper is linked: the server re-reads it
 * from the submission and ignores the field below.
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
  const [paperId, setPaperId] = useState(
    papers.length === 1 ? papers[0].id : ""
  );

  const paper = papers.find((p) => p.id === paperId) ?? null;
  const fetched = paper
    ? [
        ["How you will attend", participationModeLabel(paper.participation_mode ?? "")],
        ["Pathway", pathwayLabel(paper.submission_type)],
        ["Track", trackLabel(paper.tracks)],
      ].filter((row): row is [string, string] => !!row[1] && row[1] !== "—")
    : [];

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
        // The select and the consent box are controlled, so form.reset() alone
        // would leave both showing stale values.
        setPaperId(papers.length === 1 ? papers[0].id : "");
        setAccepted(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad space-y-6">
      <fieldset disabled={pending || !payable} className="contents">
        {/* Paper first: it is what the attendance, pathway and track are read
            from, so it cannot be asked for after them. */}
        {papers.length > 0 && (
          <div>
            <label
              htmlFor="submission_id"
              className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-2"
            >
              Paper you are presenting
            </label>
            <select
              id="submission_id"
              name="submission_id"
              className="input w-full"
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
            >
              <option value="">Not presenting a paper</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.paper_id ? `${p.paper_id} — ` : ""}
                  {p.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Registration is per delegate, not per paper. If you are presenting
              more than one, pick any — the fee is the same.
            </p>
          </div>
        )}

        {/* Carried over from the submission, not re-asked. */}
        {paper && fetched.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              From your submission
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              {fetched.map(([term, value]) => (
                <div key={term} className="sm:flex sm:gap-4">
                  <dt className="text-slate-500 sm:w-44 sm:shrink-0">{term}</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              These were set when the paper was submitted and cannot be changed
              here. If any of them is wrong, contact the Editorial Office.
            </p>
            {/* Informational only — submitRegistration re-reads the mode from
                the submission and ignores whatever arrives in this field. */}
            <input
              type="hidden"
              name="participation_mode"
              value={paper.participation_mode ?? ""}
            />
          </div>
        )}

        {/* No paper means no submission to read a mode from, so ask. */}
        {!paper && (
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
