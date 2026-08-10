import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  REFUND_POLICY_CLAUSES,
  REFUND_POLICY_VERSION,
} from "@/lib/refundPolicy";
import { GST_PERCENT, MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";

export const metadata: Metadata = pageMetadata({
  title: "Refund & Cancellation Policy",
  description:
    "Refund and cancellation policy for GLOGIFT 2027 conference registration — no-refund terms, no-show consequences, and the one circumstance in which a refund is made.",
  path: "/refund-cancellation",
});

/**
 * Refund and cancellation policy — a public, standalone page.
 *
 * Required by the payment gateway: a card acquirer will not go live against a
 * site where a cardholder cannot read the refund terms before paying. It is
 * therefore deliberately reachable WITHOUT signing in, unlike the copy shown
 * at checkout.
 *
 * The clauses render from lib/refundPolicy.ts, the same source the checkout
 * tickbox uses, so the page a cardholder reads and the terms a delegate
 * accepts cannot drift apart.
 */

const UPDATED = "10 August 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function RefundCancellationPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          GLOGIFT 27
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Refund &amp; cancellation policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated {UPDATED} · Version {REFUND_POLICY_VERSION}
        </p>

        <p className="mt-5 leading-7 text-slate-600">
          This policy governs registration fees paid for the International
          Conference on AI-Driven Solutions in Management (GLOGIFT 27), to be
          held at the Indian Institute of Management Sambalpur on 25–27
          February 2027. Please read it before paying — by completing payment
          you accept these terms.
        </p>

        <Section title="Registration fees are not refundable">
          <ul className="list-disc space-y-2 pl-5 text-slate-600">
            {REFUND_POLICY_CLAUSES.map((clause) => (
              <li key={clause}>{clause}</li>
            ))}
          </ul>
        </Section>

        <Section title="Cancellation by the delegate">
          <p className="leading-7 text-slate-600">
            A delegate may cancel their participation at any time by writing to
            the Conference Coordinator, but no refund arises from doing so. A
            cancelled registration is treated the same as a no-show: no
            participation certificate is issued and the conference kit is
            forfeited.
          </p>
          <p className="leading-7 text-slate-600">
            A registration is personal to the delegate named on it and cannot be
            transferred to another person.
          </p>
        </Section>

        <Section title="Cancellation by the organisers">
          <p className="leading-7 text-slate-600">
            If the organisers cancel the conference on the scheduled dates
            (25–27 February 2027) due to unforeseen circumstances, registration
            fees are refunded in full. Refunds are made to the original payment
            instrument used at checkout. No other charge — travel, visa or
            accommodation booked independently — is reimbursed.
          </p>
          <p className="leading-7 text-slate-600">
            A change of venue, a change to the programme, or a move between
            on-site and virtual delivery is not a cancellation and does not give
            rise to a refund.
          </p>
        </Section>

        <Section title="Where a refund is due">
          <p className="leading-7 text-slate-600">
            Where a refund is payable under this policy, it is processed to the
            original payment method within 7–10 working days of the
            announcement. The time your bank or card issuer takes to credit the
            amount is outside our control.
          </p>
          <p className="leading-7 text-slate-600">
            A duplicate payment — the same delegate charged twice for one
            registration — is refunded on the same terms. Write to the
            Conference Coordinator with the order reference shown on your
            registration.
          </p>
        </Section>

        <Section title="Fees, taxes and discounts">
          <p className="leading-7 text-slate-600">
            Registration fees are quoted exclusive of GST; {GST_PERCENT}% GST is
            added at checkout and shown separately before you pay. Indian
            delegates are billed in Indian rupees and international delegates in
            US dollars, at the rate published for their participant category.
          </p>
          <p className="leading-7 text-slate-600">
            GIFT Society members are eligible for a {MEMBER_DISCOUNT_PERCENT}%
            discount on the registration fee. A discount cannot be applied
            retrospectively to a payment already made.
          </p>
        </Section>

        <Section title="Contact">
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-600">
              For any question about a payment, a refund or this policy, write
              to the Conference Coordinator:
            </p>
            <a
              href="mailto:glogift27.coordinator@iimsambalpur.ac.in"
              className="mt-2 block text-blue-700 hover:underline"
            >
              glogift27.coordinator@iimsambalpur.ac.in
            </a>
            <p className="pt-2 text-slate-600">
              Indian Institute of Management Sambalpur, Basantpur, Sambalpur,
              Odisha 768025, India
            </p>
          </div>
        </Section>

        <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
          See also our{" "}
          <Link href="/terms" className="text-blue-700 hover:underline">
            terms of use
          </Link>
          ,{" "}
          <Link href="/privacy" className="text-blue-700 hover:underline">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/contact" className="text-blue-700 hover:underline">
            contact details
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
