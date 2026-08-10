import Link from "next/link";
import { formatMoney } from "@/lib/registrationFees";
import { formatDate } from "@/components/ui/Primitives";

/**
 * "Are you registered for the conference?", answered on the author dashboard.
 *
 * Reads the delegate's own registration row rather than the Editorial Office
 * flags on submission_authors: those are per-paper and a delegate may have
 * none, or several. Registration is per person.
 */
export function RegistrationStatus({
  registration,
  accepted,
  justPaid = false,
  paymentFailed = false,
}: {
  registration: {
    id?: string;
    status: string;
    currency: "INR" | "USD";
    amount: number;
    total_amount: number | null;
    paid_at: string | null;
  } | null;
  /** True on the redirect back from the gateway — shows the thank-you once. */
  justPaid?: boolean;
  /** True on the redirect back from a gateway that declined or was cancelled. */
  paymentFailed?: boolean;
  /**
   * Whether the author has had at least one paper accepted. Nothing can be
   * registered against until then, so prompting for it would send the author
   * to a page with an empty paper list and no reason to be there.
   */
  accepted: boolean;
}) {
  // Nothing to say yet: no acceptance, and no registration already under way.
  if (!accepted && !registration && !paymentFailed) return null;

  if (registration?.status === "paid") {
    const paid = registration.total_amount ?? registration.amount;
    return (
      <div className="card card-pad mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Registered for GLOGIFT 2027
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                {formatMoney(registration.currency, paid)} paid
                {registration.paid_at &&
                  ` on ${formatDate(registration.paid_at)}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {registration.id && (
              <a
                href={`/api/invoices/${registration.id}`}
                className="btn-secondary text-sm"
              >
                Download invoice
              </a>
            )}
            <Link
              href="/registration"
              className="text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-300"
            >
              View details →
            </Link>
          </div>
        </div>

        {/* Shown only on the hop back from the gateway. It thanks them once,
            for the payment they just made — on every later visit the badge
            above is the whole message. */}
        {justPaid && (
          <p className="mt-3 border-t border-emerald-200/70 pt-3 text-sm text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-100">
            <strong className="font-semibold">Thank you.</strong> Your payment
            has been confirmed and your place at GLOGIFT 2027 is secured. A
            receipt is available above, and we will email you the programme
            nearer the conference. We look forward to seeing you in Sambalpur.
          </p>
        )}
      </div>
    );
  }

  const started = registration?.status === "pending";

  // Straight back from a gateway that did not settle. The apology comes first,
  // and it says plainly that no money moved — the delegate's own bank app may
  // not agree yet, and "did it go through?" is the question they actually have.
  if (paymentFailed) {
    return (
      <div className="card card-pad mb-6 flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
        <div>
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
            Sorry — your payment did not go through
          </p>
          <p className="text-xs text-red-800/80 dark:text-red-300/80">
            Nothing has been charged, and your registration details are saved.
            Please try again. If your bank shows the money as taken, contact the
            Editorial Office and do not pay a second time.
          </p>
        </div>
        <Link href="/registration" className="btn-primary shrink-0">
          Try payment again
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-pad mb-6 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {started
            ? "Your registration is not paid yet"
            : "You are not registered for the conference yet"}
        </p>
        <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
          {started
            ? "Your place is held but not confirmed. It is confirmed once the registration fee is paid."
            : "Your paper has been accepted. To present it you must also register as a delegate and pay the registration fee."}
        </p>
      </div>
      <Link href="/registration" className="btn-primary shrink-0">
        {started ? "Complete payment" : "Register for Conference"}
      </Link>
    </div>
  );
}
