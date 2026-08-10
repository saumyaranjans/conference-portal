import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "Terms of use for the GLOGIFT 2027 conference website and submission portal — submission, review, registration and participation.",
  path: "/terms",
});

/**
 * Terms of use for the website and submission portal.
 *
 * States the rules the portal already enforces — the two-submission cap, the
 * declarations required at submission, the integrity thresholds, the deadline
 * — so what a user agrees to matches what the software actually does.
 */

const UPDATED = "7 August 2026";

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

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-slate-600">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          GLOGIFT 27
        </p>
        <h1 className="mt-2 text-3xl font-bold">Terms of use</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>

        <p className="mt-5 leading-7 text-slate-600">
          These terms govern use of the GLOGIFT 27 website and submission portal
          at <span className="font-medium text-slate-800">glogift2027.in</span>.
          By creating an account or submitting a paper you accept them.
        </p>

        <Section title="Your account">
          <Bullets
            items={[
              "Give accurate details. Your name, affiliation and participant category appear on the programme and on any certificate issued to you.",
              "One account per person. Do not share your sign-in credentials.",
              "You are responsible for activity under your account. Tell us promptly if you believe it has been misused.",
              "If you sign in with Google, the email address held by that account becomes your identity on the portal.",
            ]}
          />
        </Section>

        <Section title="Submitting a paper">
          <Bullets
            items={[
              "You may hold at most two submissions at any time, counting papers you submit and papers on which you are a co-author.",
              "At submission you must declare that the work is original, is not plagiarised, and is not simultaneously submitted or already published elsewhere.",
              "You must declare that AI tools were used for assistance only and are not credited as authors.",
              "You must list every co-author with a valid email address, and you are responsible for having their agreement to be listed.",
              "Abstracts must fall within the stated word limits. Submission closes on the published deadline and the portal will not accept papers afterwards.",
            ]}
          />
        </Section>

        <Section title="Review and decisions">
          <p className="text-slate-600">
            Submissions are reviewed by the Track Editor and by reviewers
            appointed for the track. Full papers additionally undergo a
            similarity and AI-assistance check; a paper exceeding{" "}
            <span className="font-medium text-slate-800">20% similarity</span> or{" "}
            <span className="font-medium text-slate-800">
              30% detected AI content
            </span>{" "}
            is flagged for editorial consideration and may be returned or
            rejected.
          </p>
          <p className="text-slate-600">
            Editorial decisions are final. Reviews are provided to help you
            improve the work; the conference does not enter into correspondence
            disputing a decision.
          </p>
        </Section>

        <Section title="Registration, fees and attendance">
          <Bullets
            items={[
              "Presenting an accepted paper requires registration and payment of the applicable fee by the published deadline.",
              "Fees depend on participant category and on whether you register in the early bird or regular period. GIFT Society members receive the stated discount on production of a valid membership number.",
              "Registration is per person, not per paper. Each presenting author must register.",
              "Certificates are issued only where registration payment, attendance and presentation have all been confirmed by the Editorial Office.",
            ]}
          />
          <p className="text-slate-600">
            Refund and cancellation terms, where offered, are those published on
            the registration page at the time you register.
          </p>
        </Section>

        <Section title="Publication">
          <p className="text-slate-600">
            Consenting at submission allows an accepted paper to be considered
            by the editorial boards of the associated journals, book series and
            the conference proceedings. Consideration is not an offer of
            publication: each outlet applies its own independent review and its
            own terms. You retain copyright in your work except as separately
            agreed with an outlet that accepts it.
          </p>
        </Section>

        <Section title="Conduct">
          <p className="text-slate-600">
            Participants are expected to behave professionally and respectfully
            in sessions, online and in correspondence. The organisers may
            withdraw a paper, cancel a registration or remove access to the
            portal where conduct, academic integrity or these terms are
            seriously breached.
          </p>
        </Section>

        <Section title="Acceptable use of the portal">
          <Bullets
            items={[
              "Do not attempt to access papers, reviews or accounts that are not yours.",
              "Do not upload malicious files, or attempt to disrupt or overload the service.",
              "Do not scrape or bulk-extract data from the site.",
              "Security researchers acting in good faith should follow our responsible reporting process.",
            ]}
          />
        </Section>

        <Section title="Availability and changes">
          <p className="text-slate-600">
            We aim to keep the portal available but cannot guarantee
            uninterrupted service, and we are not liable for indirect loss
            arising from unavailability. Conference dates, format, programme,
            fees and deadlines may change; material changes will be published on
            this website and, where they affect you directly, sent by email.
          </p>
        </Section>

        <Section title="Governing law">
          <p className="text-slate-600">
            These terms are governed by the laws of India, and the courts at
            Sambalpur, Odisha have jurisdiction.
          </p>
        </Section>

        <Section title="Contact">
          <div className="space-y-1 text-sm">
            <a
              className="block text-blue-700 hover:underline"
              href="mailto:glogift27.chair@iimsambalpur.ac.in"
            >
              glogift27.chair@iimsambalpur.ac.in
            </a>
            <a
              className="block text-blue-700 hover:underline"
              href="mailto:glogift27.coordinator@iimsambalpur.ac.in"
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
          <Link href="/privacy" className="text-blue-700 hover:underline">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/" className="text-blue-700 hover:underline">
            conference home
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
