import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  productionBlocked,
  sandboxOutcomes,
} from "@/lib/payments/sandbox";
import { paymentsAreSandbox } from "@/lib/payments";
import { formatMoney } from "@/lib/registrationFees";

// Never indexed, never followed — it is a test fixture, not a page.
export const metadata: Metadata = {
  title: "Sandbox payment gateway",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * A stand-in for the bank's hosted payment page.
 *
 * Deliberately styled to look nothing like ICICI: no bank logo, no imitation
 * of a real payment form, and a red banner across the top. This page must
 * never be mistakable for the genuine article, either by a delegate who lands
 * on it or by someone reading a screenshot later.
 *
 * It collects no card details and asks for nothing — a real hosted page would,
 * but reproducing one would mean building a form that LOOKS like it takes card
 * numbers, which is exactly the thing not to build. Instead the tester picks
 * the outcome, and each outcome is pre-signed on the server so this page
 * cannot mint a "paid" the server did not authorise.
 */
export default async function SandboxGatewayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  // Unreachable unless the sandbox is the selected provider. Anything else —
  // including the real ICICI adapter being live — makes this a 404.
  if (!(await paymentsAreSandbox()) || productionBlocked()) notFound();

  const q = await searchParams;
  const orderId = q.orderId ?? "";
  const amount = q.amount ?? "0";
  const currency = (q.currency === "USD" ? "USD" : "INR") as "INR" | "USD";
  const returnUrl = q.returnUrl ?? "/api/payments/callback";

  if (!orderId) notFound();

  const outcomes = sandboxOutcomes({ orderId, amount, currency });
  const labels: Record<string, { text: string; cls: string; hint: string }> = {
    paid: {
      text: "Simulate a successful payment",
      cls: "bg-emerald-600 hover:bg-emerald-700 text-white",
      hint: "Marks the registration paid, burns any coupon, and fills in the Editorial Office register.",
    },
    failed: {
      text: "Simulate a failed payment",
      cls: "bg-red-600 hover:bg-red-700 text-white",
      hint: "Nothing is charged. The delegate can try again.",
    },
    cancelled: {
      text: "Simulate the delegate cancelling",
      cls: "bg-slate-600 hover:bg-slate-700 text-white",
      hint: "Their details stay saved and they return to the registration page.",
    },
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-t-2xl bg-red-600 px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-white">
          Test gateway · no money moves
        </div>

        <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm text-slate-500">
            This is a stand-in for the ICICI Bank payment page, used while the
            real gateway is being set up. No card details are collected and no
            payment is taken.
          </p>

          <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
            <div className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-slate-500">Order reference</dt>
              <dd className="font-mono font-medium text-slate-900">{orderId}</dd>
            </div>
            {q.payer && (
              <div className="flex justify-between px-4 py-3 text-sm">
                <dt className="text-slate-500">Payer</dt>
                <dd className="text-slate-900">{q.payer}</dd>
              </div>
            )}
            {q.description && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="shrink-0 text-slate-500">For</dt>
                <dd className="text-right text-slate-900">{q.description}</dd>
              </div>
            )}
            <div className="flex justify-between px-4 py-3">
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-lg font-bold text-slate-900">
                {formatMoney(currency, Number(amount))}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Choose an outcome
          </p>

          <div className="mt-3 space-y-3">
            {outcomes.map(({ status, fields, signature }) => (
              <form key={status} action={returnUrl} method="POST">
                {Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                {/* Signed server-side: the callback verifies this with a
                    constant-time HMAC comparison, so the outcome cannot be
                    forged by editing the page. */}
                <input type="hidden" name="signature" value={signature} />
                <button
                  type="submit"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${labels[status].cls}`}
                >
                  {labels[status].text}
                </button>
                <p className="mt-1 px-1 text-xs text-slate-500">
                  {labels[status].hint}
                </p>
              </form>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
