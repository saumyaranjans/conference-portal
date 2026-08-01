import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security | GLOGIFT2027 - IIM SAMBALPUR",
  description: "Responsible security reporting for the GLOGIFT 2027 website and submission portal.",
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <article className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          GLOGIFT 2027
        </p>
        <h1 className="mt-2 text-3xl font-bold">Responsible security reporting</h1>
        <p className="mt-4 leading-7 text-slate-600">
          If you believe you have found a security issue in this website or its
          conference portal, please report it privately. Do not access, change,
          download, or disclose another person&rsquo;s data while investigating.
        </p>

        <section className="mt-7 space-y-3">
          <h2 className="text-xl font-semibold">How to report</h2>
          <p className="text-slate-600">
            Include the affected page, a concise description, reproducible
            steps, and the potential impact. Please omit passwords, session
            tokens, manuscripts, and other personal or confidential data.
          </p>
          <div className="space-y-1 text-sm">
            <a className="block text-blue-700 hover:underline" href="mailto:glogift27.chair@iimsambalpur.ac.in">
              glogift27.chair@iimsambalpur.ac.in
            </a>
            <a className="block text-blue-700 hover:underline" href="mailto:glogift27.coordinator@iimsambalpur.ac.in">
              glogift27.coordinator@iimsambalpur.ac.in
            </a>
          </div>
        </section>

        <section className="mt-7 space-y-3">
          <h2 className="text-xl font-semibold">Good-faith testing</h2>
          <p className="text-slate-600">
            Automated denial-of-service testing, social engineering, malware,
            destructive testing, and testing against other users&rsquo; accounts
            are not permitted. Stop immediately if you encounter personal data.
          </p>
        </section>

        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-blue-700 hover:underline">
          Return to the conference website
        </Link>
      </article>
    </main>
  );
}
