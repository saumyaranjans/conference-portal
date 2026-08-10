"use client";

import { useState } from "react";
import { submitRegistration } from "@/lib/registrationActions";
import { PARTICIPATION_MODES } from "@/lib/types";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";
import {
  REFUND_POLICY_CLAUSES,
  REFUND_POLICY_CONSENT,
  REFUND_POLICY_HEADING,
} from "@/lib/refundPolicy";

type Paper = {
  id: string;
  paper_id: string | null;
  title: string;
  submission_type: string;
};

/**
 * The delegate's half of registration: how they will attend, which paper (if
 * any) they are presenting, and acceptance of the refund policy.
 *
 * Notably absent: the amount. The fee is shown above this form for
 * information, but nothing here submits a figure — submitRegistration computes
 * it from the signed-in profile, so a tampered form field has nowhere to land.
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const res = await submitRegistration(new FormData(e.currentTarget));

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
      if (res.ok) e.currentTarget.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad space-y-6">
      <fieldset disabled={pending || !payable} className="contents">
        {/* How they will attend */}
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

        {/* Paper, when they have one */}
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
              defaultValue={papers.length === 1 ? papers[0].id : ""}
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
