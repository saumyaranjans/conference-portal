import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Contact details for GLOGIFT 2027 — the organising institution, conference email addresses, and the registered address at IIM Sambalpur.",
  path: "/contact",
});

/**
 * Public contact page.
 *
 * The landing page already carries a Contact section, but a payment gateway's
 * compliance review looks for a standalone, linkable page giving the merchant's
 * identity and a reachable address — an anchor part-way down a long single-page
 * site does not satisfy it.
 *
 * TELEPHONE: intentionally absent. A card acquirer usually wants a contact
 * phone number, but none is published for the conference and inventing one on a
 * public page would be worse than omitting it. Add the Coordinator's number
 * here before submitting the site to the bank for review.
 */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="mt-2 space-y-1 text-slate-700">{children}</div>
    </section>
  );
}

const EMAILS = [
  { label: "Conference Chair", address: "glogift27.chair@iimsambalpur.ac.in" },
  {
    label: "Conference Coordinator",
    address: "glogift27.coordinator@iimsambalpur.ac.in",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          GLOGIFT 27
        </p>
        <h1 className="mt-2 text-3xl font-bold">Contact us</h1>
        <p className="mt-5 leading-7 text-slate-600">
          GLOGIFT 27 — the International Conference on AI-Driven Solutions in
          Management: Flexibility, Digitalisation &amp; Decarbonization — is
          organised by the Indian Institute of Management Sambalpur with the
          GIFT Society, and is held on 25–27 February 2027.
        </p>

        <Card title="Organising institution">
          <p className="font-medium text-slate-800">
            Indian Institute of Management Sambalpur
          </p>
          <p>Basantpur, Sambalpur</p>
          <p>Odisha 768025, India</p>
          <Link
            href="/how-to-reach"
            className="mt-2 inline-block text-blue-700 hover:underline"
          >
            How to reach the campus →
          </Link>
        </Card>

        <Card title="Co-organised with">
          <p className="font-medium text-slate-800">
            GIFT Society — Global Institute of Flexible Systems Management
          </p>
          <p>B-51 (Basement), Sarvodaya Enclave</p>
          <p>New Delhi 110017, India</p>
        </Card>

        <Card title="Email">
          <ul className="space-y-2">
            {EMAILS.map(({ label, address }) => (
              <li key={address}>
                <span className="block text-xs text-slate-500">{label}</span>
                <a
                  href={`mailto:${address}`}
                  className="text-blue-700 hover:underline"
                >
                  {address}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Registration & payment queries">
          <p>
            For anything to do with a registration fee, a payment or a refund,
            write to the Conference Coordinator and quote the order reference
            shown on your registration.
          </p>
          <Link
            href="/refund-cancellation"
            className="mt-2 inline-block text-blue-700 hover:underline"
          >
            Refund &amp; cancellation policy →
          </Link>
        </Card>

        <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
          See also our{" "}
          <Link href="/terms" className="text-blue-700 hover:underline">
            terms of use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
