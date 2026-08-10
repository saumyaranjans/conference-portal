import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How GLOGIFT 2027 and IIM Sambalpur collect, use, store and share personal data through the conference website and submission portal.",
  path: "/privacy",
});

/**
 * Privacy policy for the conference website and submission portal.
 *
 * Written against what the system actually does rather than a template: the
 * fields the registration form asks for, the evidence the Editorial Office
 * records before issuing a certificate, and the coarse geolocation the visit
 * counter derives from edge headers. A policy that overstates or understates
 * collection is worse than none, because people rely on it.
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

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          GLOGIFT 27
        </p>
        <h1 className="mt-2 text-3xl font-bold">Privacy policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>

        <p className="mt-5 leading-7 text-slate-600">
          This policy explains what personal data the GLOGIFT 27 website and
          submission portal collect, why, who can see it, and how to have it
          corrected or removed. It covers{" "}
          <span className="font-medium text-slate-800">glogift2027.in</span> and
          the submission portal hosted on it.
        </p>

        <Section title="Who is responsible">
          <p className="text-slate-600">
            GLOGIFT 27 &mdash; the 27th Global Conference on Flexible Systems
            Management &mdash; is hosted by the Indian Institute of Management
            Sambalpur in association with the Global Institute of Flexible
            Systems Management (GIFT Society). IIM Sambalpur is the data
            controller for the portal. Contact details are at the end of this
            page.
          </p>
        </Section>

        <Section title="What we collect">
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">
              When you create an account
            </span>{" "}
            we collect your name and title, email address, institution,
            department, designation, country, participant category, and
            optionally your mobile number, gender, ORCID iD and GIFT Society
            membership number. If you sign in with Google we receive your email
            address and name from Google, and nothing else; we never receive
            your Google password.
          </p>
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">
              When you submit a paper
            </span>{" "}
            we collect the title, abstract, keywords, chosen track and pathway,
            your intended mode of attendance, uploaded files, and the name,
            email address and affiliation of every co-author you list. You are
            responsible for telling your co-authors that you have entered their
            details.
          </p>
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">
              During review and after
            </span>{" "}
            we record reviewer assignments, review scores and comments,
            editorial decisions, similarity and AI-detection percentages where a
            full paper is submitted, session allocation, and &mdash; before a
            certificate is issued &mdash; confirmation of registration payment
            (amount, currency and payment reference), attendance and
            presentation.
          </p>
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">
              When you visit the public website
            </span>{" "}
            we record the page, the time, and an approximate location (country,
            state and city) derived from your network address by our hosting
            provider. We do not store your IP address, we do not use advertising
            or tracking cookies, and we do not attempt to identify you. This
            exists to tell the organisers which regions the conference is
            reaching.
          </p>
        </Section>

        <Section title="Why we use it">
          <Bullets
            items={[
              "To operate peer review — assigning papers, collecting reviews, recording decisions, and notifying authors.",
              "To organise the conference — building the programme, allocating sessions and rooms, and issuing certificates.",
              "To contact you about your own submission, registration and participation.",
              "To meet the academic integrity obligations of a peer-reviewed conference.",
              "To understand, in aggregate, how the conference website is being found and read.",
            ]}
          />
        </Section>

        <Section title="Who can see it">
          <Bullets
            items={[
              "Reviewers see the paper assigned to them. Author identities are visible to the Track Editor and the Editorial Office.",
              "Track Editors see the submissions in their track and the reviews on them.",
              "The Convener and Editorial Office see all submissions, decisions and registration records.",
              "Session chairs receive the running order and author names for the session they chair.",
              "Where you have consented at submission, accepted full papers may be shared with the editorial boards of the associated journals and book series for their own separate review.",
            ]}
          />
          <p className="text-slate-600">
            The published conference programme shows paper titles, author names
            and affiliations, and session details. Joining links for online
            sessions are sent by email to registered participants and are never
            published.
          </p>
          <p className="text-slate-600">
            We do not sell personal data, and we do not share it for advertising.
          </p>
        </Section>

        <Section title="Where it is stored">
          <p className="text-slate-600">
            Data is held in a managed PostgreSQL database and file storage
            operated by Supabase on Amazon Web Services infrastructure in
            Singapore. The website is served by Vercel. Transactional email is
            sent through Resend. These providers process data on our behalf
            under their own security and data-protection terms. This means your
            data is processed outside India.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p className="text-slate-600">
            Submissions, reviews, decisions and certificate records are retained
            as the permanent scholarly record of the conference. Account details
            are kept while your account exists. Website visit records are kept in
            aggregate and contain no identifier that links them to you.
          </p>
        </Section>

        <Section title="Cookies and similar storage">
          <p className="text-slate-600">
            The portal sets a session cookie when you sign in; without it you
            cannot stay signed in. The public site stores a short random
            identifier in your browser for the length of the browsing session so
            that one visitor reading several pages is not counted several times.
            No advertising or cross-site tracking cookies are used.
          </p>
        </Section>

        <Section title="Your choices">
          <Bullets
            items={[
              "You can view and correct most of your details yourself under My Profile in the portal.",
              "You can ask for a copy of the personal data we hold about you.",
              "You can ask us to correct anything inaccurate.",
              "You can ask us to delete your account. Where a paper has already been reviewed, decided or presented, the scholarly record of that decision is retained.",
              "You can withdraw a submission before a decision is issued.",
            ]}
          />
          <p className="text-slate-600">
            Write to us at the address below and we will respond within a
            reasonable period.
          </p>
        </Section>

        <Section title="Security">
          <p className="text-slate-600">
            Access is controlled by role, so reviewers, editors and the
            Editorial Office each see only what their role requires. Traffic is
            encrypted in transit. If you believe you have found a security
            issue, please see our{" "}
            <Link href="/security" className="text-blue-700 hover:underline">
              responsible reporting page
            </Link>
            .
          </p>
        </Section>

        <Section title="Changes">
          <p className="text-slate-600">
            If this policy changes materially before the conference we will
            update this page and change the date at the top.
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
          <Link href="/terms" className="text-blue-700 hover:underline">
            terms of use
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
