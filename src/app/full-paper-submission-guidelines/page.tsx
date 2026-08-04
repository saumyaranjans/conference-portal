import type { Metadata } from "next";
import Link from "next/link";

import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Full Paper Submission Guidelines (Pathway B) - GLOGIFT2027",
  description:
    "Read the GLOGIFT 27 Pathway B full-paper guidelines and download the author worksheet and blinded manuscript template.",
};

const downloads = [
  {
    title: "Author Details Worksheet",
    description:
      "Prepare author names, affiliations, ORCID details, contributions and declarations separately from the blinded manuscript.",
    href: "/downloads/author-guidelines/glogift2027-springer-author-details-worksheet.docx",
    accent: "blue",
    contents: [
      "Author names, affiliations, e-mail addresses and ORCID details",
      "Corresponding-author and contribution statements",
      "Funding, interests, ethics, data and AI-use declarations",
    ],
  },
  {
    title: "Blinded Manuscript Template",
    description:
      "An editable, double-anonymous Word template with the required manuscript structure and journal-specific prompts.",
    href: "/downloads/author-guidelines/glogift2027-springer-blinded-manuscript-template.docx",
    accent: "amber",
    contents: [
      "Structured sections for a double-anonymous full paper",
      "Abstract, keywords, JEL codes, references and declarations",
      "IJGBC word-limit and application-question prompts",
    ],
  },
] as const;

const requirements = [
  {
    title: "Double-anonymous review",
    text: "Remove names, affiliations, acknowledgements and identity-revealing details from the manuscript and accompanying files.",
  },
  {
    title: "Abstract and indexing",
    text: "Provide a 150–250-word abstract, 4–6 keywords and appropriate JEL classification codes.",
  },
  {
    title: "Manuscript structure",
    text: "Use decimal headings with no more than three levels, define abbreviations at first use and use footnotes rather than endnotes.",
  },
  {
    title: "References and evidence",
    text: "Use consistent APA-style author–date references, alphabetize the list and include full DOI links when available.",
  },
  {
    title: "Declarations and data",
    text: "Include relevant funding, interests, ethics, consent, author-contribution and data-availability information.",
  },
  {
    title: "Responsible AI disclosure",
    text: "AI tools cannot be authors. Document substantive generative-AI use; human authors remain accountable for the complete paper.",
  },
] as const;

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12m-4-4 4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

export default function FullPaperSubmissionGuidelinesPage() {
  return (
    <main className="min-h-screen">
      <IkatStrip />

      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3">
        <Link
          href="/Home"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                     font-medium text-slate-700 transition hover:bg-white hover:text-blue-700
                     dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11l9-8 9 8M6 10v10h12V10" />
          </svg>
          Home
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary px-4 py-1.5 text-sm">
            Login
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-1.5 text-sm">
            Sign up
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-7 px-4 py-5">
        <section className="card overflow-hidden">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-amber-400" />
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Pathway B · Full Paper
            </p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-gradient sm:text-4xl">
              Full Paper Submission Guidelines
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Prepare an editorially complete, double-anonymous manuscript for
              papers progressing through GLOGIFT 27 Pathway B and subsequently
              considered for the selected Springer journals.
            </p>
            <div className="mt-5 inline-flex max-w-4xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5m0 3h.01" />
              </svg>
              <p>
                <strong>Important:</strong> journal consideration is not acceptance.
                Every manuscript remains subject to independent editorial screening,
                peer review, revision and the journal&apos;s final decision.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="journal-fit-heading" className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Select by research fit
            </p>
            <h2 id="journal-fit-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Selected Springer journals
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="card card-pad border-l-4 border-l-blue-600">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Springer · ABDC-A
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    Global Journal of Flexible Systems Management
                  </h3>
                </div>
                <a
                  href="https://link.springer.com/journal/40171/submission-guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Official guidelines
                </a>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Best suited to general-management research on organizational
                flexibility—adaptive, responsive and agile strategy, structures,
                systems, people and culture.
              </p>
            </article>

            <article className="card card-pad border-l-4 border-l-amber-500">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Springer · ABDC-C
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    International Journal of Global Business and Competitiveness
                  </h3>
                </div>
                <a
                  href="https://link.springer.com/journal/42943/submission-guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Official guidelines
                </a>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Best suited to management and business research addressing
                international competitiveness, sustainability, flexibility,
                innovation and strategic leadership.
              </p>
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                Fewer than 4,000 words, including tables, figures and references;
                add 4–5 application-oriented questions after Conclusions.
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="requirements-heading" className="card card-pad">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Shared preparation standard
          </p>
          <h2 id="requirements-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Core manuscript requirements
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.map((requirement, index) => (
              <article key={requirement.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {requirement.title}
                  </h3>
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {requirement.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="workflow-heading" className="card card-pad">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Recommended workflow
          </p>
          <h2 id="workflow-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            From conference paper to journal-ready files
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-4">
            {[
              ["Choose", "Match the paper’s contribution to the aims and scope of the most suitable journal."],
              ["Separate", "Keep author details and identity-bearing declarations outside the blinded manuscript."],
              ["Prepare", "Use the template, complete all statements and apply the target journal’s special requirements."],
              ["Verify", "Run the final checklist and re-check the live official journal page before submission."],
            ].map(([title, text], index) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <span className="text-3xl font-black text-slate-200 dark:text-slate-700">0{index + 1}</span>
                <h3 className="mt-1 font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="technical-heading" className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Detailed preparation guidance
            </p>
            <h2 id="technical-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              References, tables, figures and source files
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                "References",
                "Cite by author and year. Alphabetize the reference list by first-author surname, italicize journal and book titles, and provide full DOI links wherever available.",
              ],
              [
                "Tables",
                "Number tables with Arabic numerals, cite them consecutively, provide concise captions and identify any reused material and permissions.",
              ],
              [
                "Figures",
                "Use legible lettering and accessible contrast. Preferred formats include EPS for vectors and TIFF for halftones; editable Microsoft Office files are also accepted.",
              ],
              [
                "Editable source files",
                "Supply the complete editable manuscript, tables, figures and supplementary source files at every submission and revision—not a flattened PDF alone.",
              ],
            ].map(([title, text]) => (
              <article key={title} className="card card-pad border-t-4 border-t-slate-300 dark:border-t-slate-600">
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="checklist-heading" className="card card-pad">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Final quality control
          </p>
          <h2 id="checklist-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Before submitting the full paper
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "The paper fits the aims and scope of the selected journal.",
              "All authors approve the manuscript, author order and submission.",
              "The blinded file contains no names, affiliations or revealing metadata.",
              "Abstract, keywords, JEL codes, references and declarations are complete.",
              "Every table and figure is cited, captioned, legible and editable.",
              "Original research includes a clear data availability statement.",
              "Permissions are available for all reused material.",
              "IJGBC only: fewer than 4,000 words and 4–5 application questions.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12 4 4L19 6" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section id="downloads" aria-labelledby="downloads-heading" className="space-y-4 scroll-mt-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Editable Word documents
            </p>
            <h2 id="downloads-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Download the two supporting Word files
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              The complete guidelines are published on this page. Download the
              two editable working files separately below.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {downloads.map((item) => {
              const palette = item.accent === "blue"
                ? "border-blue-200 hover:border-blue-400 hover:shadow-blue-500/20 dark:border-blue-500/25"
                : item.accent === "amber"
                  ? "border-amber-200 hover:border-amber-400 hover:shadow-amber-500/20 dark:border-amber-500/25"
                  : "border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-500/20 dark:border-emerald-500/25";
              return (
                <article key={item.href} className={`card flex h-full flex-col border-2 p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7 ${palette}`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5M9 13h6M9 17h4" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {item.contents.map((content) => (
                      <li key={content} className="flex items-start gap-2">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                        <span>{content}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">DOCX · Editable</p>
                  <a href={item.href} download className="btn-primary mt-4 inline-flex items-center justify-center gap-2">
                    <DownloadIcon />
                    Download file
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card card-pad text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Need conference assistance?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            For questions about GLOGIFT 27 Pathway B, contact the conference editorial team.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="mailto:glogift27.chair@iimsambalpur.ac.in" className="inline-flex text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
              glogift27.chair@iimsambalpur.ac.in
            </a>
            <a href="mailto:glogift27.coordinator@iimsambalpur.ac.in" className="inline-flex text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">
              glogift27.coordinator@iimsambalpur.ac.in
            </a>
          </div>
        </section>

        <footer className="border-t border-slate-200 pb-6 pt-5 text-center text-xs text-slate-500 dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-300">GLOGIFT 27</span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">|</span>
          Indian Institute of Management Sambalpur
        </footer>
      </div>

      <IkatStrip flip />
    </main>
  );
}
