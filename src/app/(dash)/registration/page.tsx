import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { PageHeader, Section, formatDate } from "@/components/ui/Primitives";
import { RegistrationForm } from "@/components/RegistrationForm";
import {
  computeRegistrationFee,
  formatMoney,
  isEarlyBird,
  EARLY_BIRD_CUTOFF,
  MEMBER_DISCOUNT_PERCENT,
  GST_PERCENT,
} from "@/lib/registrationFees";
import { paymentsOpen, paymentsClosedMessage } from "@/lib/payments";
import {
  myActiveCoupon,
  myPresentableSubmissions,
  myRegistration,
} from "@/lib/registrationActions";
import { REFUND_POLICY_CLAUSES, REFUND_POLICY_HEADING } from "@/lib/refundPolicy";

/** What came back from the gateway, translated for a human. */
const PAYMENT_NOTICES: Record<
  string,
  { tone: "ok" | "warn" | "bad"; text: string }
> = {
  success: { tone: "ok", text: "Payment received. Your registration is confirmed." },
  cancelled: { tone: "warn", text: "You cancelled the payment. Your details are saved — you can pay again below." },
  failed: { tone: "bad", text: "The payment did not go through. Nothing has been charged. Please try again." },
  mismatch: {
    tone: "bad",
    text:
      "The bank reported a different amount from the one we requested, so the " +
      "registration has been held for checking. Please contact the Editorial " +
      "Office — do not pay again.",
  },
  unknown: { tone: "bad", text: "We could not match that payment to a registration. Please contact the Editorial Office." },
  unavailable: { tone: "warn", text: "Online payment is not open yet." },
};

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const profile = await requireProfile();
  const { payment } = await searchParams;

  // An ISSUED coupon, not the sign-up tick, decides whether the discounted
  // price is quoted. A delegate who claimed membership but has not been
  // verified sees the full fee, which is what they will actually be charged.
  const myCoupon = await myActiveCoupon(profile.id);

  const fee = computeRegistrationFee(
    profile.participant_category,
    !!myCoupon,
    undefined,
    profile.country
  );
  const papers = await myPresentableSubmissions(profile.id);
  const existing = await myRegistration(profile.id);
  const open = paymentsOpen();
  const notice = payment ? PAYMENT_NOTICES[payment] : undefined;

  const isPaid = existing?.status === "paid";

  return (
    <>
      <PageHeader
        title="Conference Registration"
        subtitle="GLOGIFT 2027 · 25–27 February 2027 · IIM Sambalpur"
      />

      {notice && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            notice.tone === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30"
              : notice.tone === "warn"
                ? "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30"
                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Already registered — nothing else on the page is relevant.        */}
      {/* ---------------------------------------------------------------- */}
      {isPaid ? (
        <Section title="Your registration">
          <div className="card card-pad bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">
              You are registered for GLOGIFT 2027 🎉
            </p>
            <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:block">
                <dt className="text-emerald-800/70 dark:text-emerald-300/70">Amount paid</dt>
                <dd className="font-medium text-emerald-900 dark:text-emerald-100">
                  {formatMoney(existing.currency, existing.total_amount ?? existing.amount)}
                  <span className="ml-1 text-xs font-normal opacity-70">
                    incl. GST
                  </span>
                </dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-emerald-800/70 dark:text-emerald-300/70">Paid on</dt>
                <dd className="font-medium text-emerald-900 dark:text-emerald-100">
                  {existing.paid_at ? formatDate(existing.paid_at) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </Section>
      ) : (
        <>
          {/* ------------------------------------------------------------ */}
          {/* What you owe                                                  */}
          {/* ------------------------------------------------------------ */}
          <Section title="Your fee">
            {fee.known ? (
              <div className="card card-pad">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      {profile.participant_category}
                      {fee.currency === "USD" && " · international rate"}
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                      {formatMoney(fee.currency, fee.total)}
                    </p>
                    <p className="text-xs text-slate-500">
                      including {GST_PERCENT}% GST
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      fee.tier === "early"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {fee.tier === "early" ? "Early bird" : "Regular"}
                  </span>
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-700">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Registration fee</dt>
                    <dd>{formatMoney(fee.currency, fee.base)}</dd>
                  </div>
                  {fee.isMember && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                      <dt>
                        GIFT member discount ({MEMBER_DISCOUNT_PERCENT}%)
                        {myCoupon && (
                          <span className="ml-1 font-mono text-xs opacity-80">
                            {myCoupon.code}
                          </span>
                        )}
                      </dt>
                      <dd>− {formatMoney(fee.currency, fee.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd>{formatMoney(fee.currency, fee.amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">GST ({GST_PERCENT}%)</dt>
                    <dd>+ {formatMoney(fee.currency, fee.tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium dark:border-slate-700">
                    <dt>Payable at checkout</dt>
                    <dd>{formatMoney(fee.currency, fee.total)}</dd>
                  </div>
                </dl>

                {isEarlyBird() && (
                  <p className="mt-3 text-xs text-slate-500">
                    The early-bird rate applies through {formatDate(EARLY_BIRD_CUTOFF)}.
                  </p>
                )}
              </div>
            ) : (
              <div className="card card-pad">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  We cannot work out your fee because your profile has no
                  participant category.
                </p>
                <Link href="/profile" className="btn-primary mt-3 inline-block">
                  Complete your profile
                </Link>
              </div>
            )}
          </Section>

          {/* ------------------------------------------------------------ */}
          {/* Gateway status — honest about not being live yet.             */}
          {/* ------------------------------------------------------------ */}
          {!open && (
            <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              {paymentsClosedMessage()}
            </div>
          )}

          {myCoupon && (
            <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              Your GIFT Society membership is verified. Enter{" "}
              <span className="font-mono font-semibold">{myCoupon.code}</span> in
              the coupon box below to take {myCoupon.discount_percent}% off.
            </div>
          )}

          <Section title="Register">
            <RegistrationForm papers={papers as any} payable={fee.known} />
          </Section>

          {existing?.status === "pending" && (
            <p className="-mt-4 mb-8 text-sm text-slate-500">
              You have a saved registration from {formatDate(existing.created_at)}{" "}
              awaiting payment.
            </p>
          )}
        </>
      )}

      {/* Policy stays visible after payment too — it governs no-shows. */}
      <Section title={REFUND_POLICY_HEADING}>
        <ul className="card card-pad space-y-2 text-sm text-slate-700 dark:text-slate-200">
          {REFUND_POLICY_CLAUSES.map((clause) => (
            <li key={clause} className="flex gap-2">
              <span aria-hidden className="text-slate-400">•</span>
              <span>{clause}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
