import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { PageHeader, formatDate } from "@/components/ui/Primitives";
import { formatMoney } from "@/lib/registrationFees";
import { myRegistration } from "@/lib/registrationActions";
import { participationModeLabel } from "@/lib/types";

/**
 * Where a delegate lands after the bank confirms payment.
 *
 * Shows the receipt rather than describing it. A registration is the one thing
 * on this portal a delegate pays real money for, and being told "thank you,
 * your invoice is available somewhere" is a weaker confirmation than seeing
 * the document itself with their name and the amount on it.
 *
 * Reached only with a paid registration. Anyone else is sent back to
 * /registration — a thank-you page for a payment that did not happen would be
 * worse than useless, and the URL is guessable.
 */
export default async function ThankYouPage() {
  const profile = await requireProfile();
  const registration = await myRegistration(profile.id);

  if (!registration || registration.status !== "paid") {
    redirect("/registration");
  }

  const paid = registration.total_amount ?? registration.amount;
  const sub = Array.isArray(registration.submissions)
    ? registration.submissions[0]
    : registration.submissions;

  return (
    <>
      <PageHeader
        title="Thank you — you are registered"
        subtitle="GLOGIFT 2027 · 25–27 February 2027 · IIM Sambalpur"
      />

      <div className="card card-pad mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
            ✓
          </span>
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Your payment has been confirmed and your place is secured.
            </p>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {formatMoney(registration.currency, paid)} paid
              {registration.paid_at && ` on ${formatDate(registration.paid_at)}`}
              {sub?.paper_id && ` · presenting ${sub.paper_id}`}
              {registration.participation_mode &&
                ` · ${participationModeLabel(registration.participation_mode)}`}
            </p>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              We have emailed you a confirmation, and will send the programme
              nearer the conference. We look forward to seeing you in Sambalpur.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your invoice
        </h2>
        <div className="flex gap-2">
          <a
            href={`/api/invoices/${registration.id}`}
            className="btn-primary text-sm"
          >
            Download invoice
          </a>
          <Link href="/author" className="btn-secondary text-sm">
            Go to my dashboard
          </Link>
        </div>
      </div>

      {/* The browser's own PDF viewer rather than a rendered image: it is
          already installed, it prints and zooms, and it cannot disagree with
          the file the download button hands over — both are the same route. */}
      <object
        data={`/api/invoices/${registration.id}?inline=1`}
        type="application/pdf"
        className="mb-8 h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
        aria-label="Registration invoice preview"
      >
        {/* Shown where inline PDF viewing is unavailable — most mobile
            browsers. The receipt must still be reachable there. */}
        <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-300">
          <p>Your browser cannot display the invoice here.</p>
          <a
            href={`/api/invoices/${registration.id}`}
            className="btn-primary mt-3 inline-block"
          >
            Download invoice
          </a>
        </div>
      </object>
    </>
  );
}
