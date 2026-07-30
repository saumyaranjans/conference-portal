import Link from "next/link";
import { Banner } from "@/components/landing/Banner";

/**
 * The GLOGIFT 2027 landing page. Content comes from the conference brochure;
 * the section order follows the IMPeC-2025 shape the Convener asked for:
 * about → objectives → attractions → call for submission → guidelines →
 * fees → committees → dates → contact.
 */

const OBJECTIVES: { icon: React.ReactNode; text: string }[] = [
  {
    text: "Advance AI-driven management research",
    icon: (
      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m0-11 2 2m7 7 2 2M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    ),
  },
  {
    text: "Bridge academia and industry",
    icon: <path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-5h4v5" />,
  },
  {
    text: "Accelerate decarbonisation and sustainability",
    icon: (
      <path d="M12 21c5-3 8-7 8-11a8 8 0 1 0-16 0c0 4 3 8 8 11Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    ),
  },
  {
    text: "Shape responsible AI governance",
    icon: (
      <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Zm0 7v5m0-8v.01" />
    ),
  },
  {
    text: "Publish and disseminate scholarship",
    icon: (
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13ZM12 3h5.5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5H12" />
    ),
  },
];

const MILESTONES = [
  { date: "2026-09-21", label: "Registration opens" },
  { date: "2026-11-23", label: "Abstract submission closes" },
  { date: "2026-11-30", label: "Abstract decisions announced" },
  { date: "2026-12-08", label: "Full paper submission closes", note: "Pathway B" },
  { date: "2026-12-15", label: "Full paper decisions announced" },
  { date: "2026-12-20", label: "Early bird registration closes" },
  { date: "2027-01-24", label: "Regular registration closes" },
  { date: "2027-02-25", label: "Conference, 25–27 February", note: "IIM Sambalpur" },
];

const TRACKS = [
  ["AI in Finance, Accounting, FinTech & Digital Assets", "Risk assessment, portfolio management, algorithmic trading, fraud detection, generative AI, digital banking, blockchain, CBDCs, tokenisation"],
  ["AI for Operations, Supply Chain & Industry 5.0", "Intelligent manufacturing, smart factories, predictive maintenance, digital twins, warehouse automation, demand forecasting"],
  ["Digital Transformation & Intelligent Business", "Digital business models, cloud computing, IoT, process automation, digital governance"],
  ["Sustainable Finance & Decarbonization", "Green finance, ESG investing, carbon accounting, climate finance, green bonds, circular economy, SDGs"],
  ["AI in Marketing: Consumer Insights, Branding & Customer Engagement", "Consumer behaviour, brand management, personalisation, generative AI in advertising, marketing analytics"],
  ["Governance, Ethics & Responsible AI", "Responsible and ethical AI, data privacy, AI regulation, corporate governance"],
  ["Analytics, Big Data & Intelligent Systems", "Business and predictive analytics, deep learning, NLP, business intelligence, real-time decision systems"],
  ["Human Capital & Leadership", "AI in HRM, future of work, talent analytics, knowledge management"],
  ["Strategy, Innovation & Emerging Business Models", "AI in product and technology management, AI startups, platform economies, digital entrepreneurship, venture capital"],
  ["Inclusive Growth & Global Transformation", "Financial inclusion, smart cities, AI for public policy, healthcare analytics, economic resilience"],
];

const PUBLICATIONS = [
  {
    title: "GLOGIFT 2027 Conference Proceedings",
    badge: "Book with ISBN",
    cover: "/journals/proceedings.svg",
    url: "",
    detail: "All accepted and presented papers appear in a dedicated proceedings volume.",
  },
  {
    title: "Global Journal of Flexible Systems Management",
    badge: "Springer · ABDC-A",
    cover: "/journals/gjfsm.jpg",
    url: "https://link.springer.com/journal/40171",
    detail: "Selected best papers fast-tracked after further peer review and revision.",
  },
  {
    title: "International Journal of Global Business & Competitiveness",
    badge: "Springer · ABDC-C",
    cover: "/journals/ijgbc.jpg",
    url: "https://link.springer.com/journal/42943",
    detail: "Selected best papers fast-tracked after further peer review and revision.",
  },
  {
    title: "Book Series on Flexible Systems Management",
    badge: "Springer · Scopus-indexed",
    cover: "/journals/book-series.jpg",
    url: "https://link.springer.com/series/10780",
    detail: "Selected best papers fast-tracked as book chapters.",
  },
];

/** Each session gets a colour and a small motion that suits its subject. */
const SESSIONS: {
  title: string;
  tint: string;
  card: string;
  anim: string;
  icon: React.ReactNode;
}[] = [
  {
    title: "AI and Sustainability Leadership Forum",
    tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    card: "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/25",
    anim: "anim-sway",
    // A leaf, swaying.
    icon: <path d="M4 20c8 2 16-4 16-14 0-1-.2-2-.5-3-9 0-15 5-15 11 0 2 .6 4 1.5 5Zm0 0 7-7" />,
  },
  {
    title: "Industry–Academia Conclave on Digital Finance",
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    card: "bg-blue-50/60 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/25",
    anim: "anim-bob",
    // A bridge between two banks.
    icon: <path d="M3 17h18M5 17v-4m14 4v-4M3 13c4-5 14-5 18 0M8 17v-3m8 3v-3" />,
  },
  {
    title: "Policy Roundtable on Decarbonization and Inclusive Growth",
    tint: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
    card: "bg-teal-50/60 border-teal-100 dark:bg-teal-500/10 dark:border-teal-500/25",
    anim: "anim-spin-slow",
    // A globe, turning.
    icon: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c3 3 3 15 0 18M3.5 9h17M3.5 15h17" />,
  },
  {
    title: "Startup Showcase on FinTech and Smart Operations",
    tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    card: "bg-violet-50/60 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/25",
    anim: "anim-lift",
    // A rocket, lifting.
    icon: <path d="M12 3c3 2 5 6 5 10l-3 3h-4l-3-3c0-4 2-8 5-10Zm0 6.5v.01M9 19l-2 2m8-2 2 2" />,
  },
  {
    title: "Doctoral Colloquium for Emerging Researchers",
    tint: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    card: "bg-rose-50/60 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/25",
    anim: "anim-tip",
    // A graduation cap, tipping.
    icon: <path d="m12 5 9 4-9 4-9-4 9-4Zm-5 6v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4" />,
  },
  {
    title: "Directors’ Panel on Leadership in an AI-Driven Economy",
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    card: "bg-amber-50/60 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/25",
    anim: "anim-bob",
    // Speakers behind a panel table.
    icon: <path d="M4 20h16M6 20v-4m12 4v-4M3 16h18M7.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4.5-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  },
];

const GUIDELINES = [
  ["Stage 1 — Abstract (mandatory)", "Submit a 500-word abstract through the portal, naming the track it belongs to. State your intended Stage 2 pathway at this point."],
  ["Stage 2 — Choose your pathway", "Pathway A: present without a full paper. Pathway B: submit a full paper for the proceedings after your abstract is accepted."],
  ["Review", "Abstracts are reviewed by the Track Editor, who may seek reviewers or decide directly. Pathway B full papers undergo double-blind peer review by the Scientific Committee."],
  ["Notification", "You are told of acceptance, rejection or required revisions, with feedback."],
  ["Your place is secured by the abstract", "If a Pathway B full paper is not accepted, you may still register, attend and present on the strength of the accepted abstract."],
  ["Registration and final formatting", "Accepted authors register. Pathway B authors submit a formatted paper; others submit presentation materials."],
];

const FEES_INR = [
  ["Academicians (Faculty)", "9,000", "10,000", "11,500"],
  ["Industry Professionals", "12,000", "14,000", "16,000"],
  ["Research Scholars / PhD", "4,000", "5,000", "6,000"],
  ["Students (UG/PG, full-time)", "2,500", "3,000", "3,500"],
];
const FEES_USD = [
  ["Academicians (Faculty)", "300", "350", "375"],
  ["Industry Professionals", "400", "425", "450"],
  ["Research Scholars / PhD", "200", "250", "300"],
  ["Students (UG/PG, full-time)", "80", "90", "100"],
];

const LEADERSHIP = [
  { name: "Prof (Dr) M. P. Jaiswal", role: "Conference Patron", org: "Director, IIM Sambalpur" },
  { name: "Prof (Dr) Sushil", role: "GLOGIFT President", org: "Founder, GLOGIFT Society · Emeritus Professor, IIT Delhi" },
  { name: "Prof Seema Gupta", role: "Conference Convenor", org: "IIM Sambalpur" },
  { name: "Prof Saumyaranjan Sahoo", role: "Conference Convenor", org: "IIM Sambalpur" },
];

const COMMITTEE = [
  {
    group: "Conference Committee — Faculty",
    people: [
      "Prof Aarti Singh", "Prof Aqueeb Sohail Shaik", "Prof Atul Prashar",
      "Prof Dharen Kumar Pandey", "Prof Hemachandra Padhan", "Prof A. Manish Kumar",
      "Prof Prasanta Kumar Chopdhar", "Prof Ramakrushna Padhy",
    ],
  },
  { group: "Post-Doctoral", people: ["Dr Jogeshwar Mahato", "Dr Jayjit Chakraborty"] },
  { group: "Conference Staff", people: ["Ms Sasmita Mohanty", "Ms Sunita Sahu"] },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .replace(/^(Prof|Dr|Mr|Ms|Mrs)\s*\(?[A-Za-z.]*\)?\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function Avatar({ name, size }: { name: string; size: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-32 w-32 text-3xl" : "h-16 w-16 text-base";
  return (
    <span
      className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 font-semibold text-white ring-4 ring-white shadow-md dark:ring-slate-800`}
    >
      {initials(name)}
    </span>
  );
}

function Heading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold text-gradient mb-4 scroll-mt-8">
      {children}
    </h2>
  );
}

export function LandingPage() {
  const today = new Date();

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-10">
        {/* ---- Hero ---- */}
        <section className="space-y-4">
          <Banner />
        </section>

        {/* ---- 1. About ---- */}
        <section>
          <Heading id="about">About GLOGIFT 2027</Heading>
          <div className="card card-pad space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              The <strong>International Conference on AI-Driven Solutions in
              Management: Flexibility, Digitalisation &amp; Decarbonization</strong>{" "}
              is jointly organised by the Indian Institute of Management
              Sambalpur and the GLOGIFT Society — Global Institute of Flexible
              Systems Management — at IIM Sambalpur, Odisha, from 25 to 27
              February 2027.
            </p>
            <p>
              The theme joins three forces reshaping management at once.{" "}
              <strong>Flexibility</strong> is the capacity of organisations to
              absorb shocks and reconfigure quickly — the founding concern of
              flexible systems management.{" "}
              <strong>Digitalisation</strong> is the movement of intelligence
              into the operating core of the firm, from algorithmic finance to
              digital twins on the factory floor.{" "}
              <strong>Decarbonization</strong> is the obligation now shaping
              investment, supply chains and public policy alike.
            </p>
            <p>
              GLOGIFT 2027 asks how artificial intelligence connects the three:
              whether AI-enabled management systems can make enterprises more
              flexible and more sustainable at the same time, rather than
              trading one against the other. The conference brings together
              academicians, researchers, practitioners, policymakers,
              entrepreneurs and students to examine that question across
              finance, operations, marketing, governance and public policy — in
              the context of Industry 5.0 and the Sustainable Development Goals.
            </p>
          </div>
        </section>

        {/* ---- 2. Objectives ---- */}
        <section>
          <Heading>The objective of the conference is to</Heading>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {OBJECTIVES.map((o) => (
              <div key={o.text} className="card card-pad text-center card-hover">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/15">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {o.icon}
                  </svg>
                </span>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {o.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- 3. Attractions ---- */}
        <section>
          <Heading id="attractions">Conference attractions</Heading>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Publishing outlets
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            {PUBLICATIONS.map((pub) => {
              const body = (
                <div className="card card-pad card-hover flex gap-4 h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pub.cover}
                    alt=""
                    className="h-24 w-[4.5rem] shrink-0 rounded-md object-cover ring-1 ring-slate-200 bg-white dark:ring-slate-700"
                  />
                  <div className="min-w-0">
                    <span className="badge bg-amber-100 text-amber-900">
                      {pub.badge}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 mt-2 dark:text-slate-100">
                      {pub.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1.5 dark:text-slate-400">
                      {pub.detail}
                    </p>
                  </div>
                </div>
              );
              return pub.url ? (
                <a
                  key={pub.title}
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {body}
                </a>
              ) : (
                <div key={pub.title}>{body}</div>
              );
            })}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Special sessions &amp; panels
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SESSIONS.map((sn) => (
              <div
                key={sn.title}
                className={`card card-pad card-hover flex items-start gap-3 ${sn.card}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${sn.tint}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-6 w-6 ${sn.anim}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {sn.icon}
                  </svg>
                </span>
                <p className="text-sm text-slate-800 pt-1.5 dark:text-slate-200">
                  {sn.title}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- 4. Call for submission ---- */}
        <section>
          <Heading id="submission">Call for submission</Heading>
          <div className="card card-pad mb-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              We invite original, unpublished research from academicians,
              doctoral scholars and practitioners on any aspect of AI-driven
              management. Every submission begins with a{" "}
              <strong>500-word abstract</strong> naming one of the ten tracks
              below; authors then choose whether to present on the abstract
              alone or to take a full paper through peer review into the
              proceedings. Interdisciplinary work, industry case studies and
              policy-oriented research are all welcome.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRACKS.map(([title, topics], i) => (
              <div
                key={title}
                className="card card-hover overflow-hidden flex flex-col"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400" />
                <div className="card-pad flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-200 dark:text-slate-700">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {title}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 dark:text-slate-400">
                    {topics}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- 5. Submission guidelines ---- */}
        <section>
          <Heading id="guidelines">Submission guidelines</Heading>
          <div className="grid gap-4 sm:grid-cols-2">
            {GUIDELINES.map(([title, detail], i) => (
              <div key={title} className="card card-pad">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Step {i + 1}
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1 dark:text-slate-100">
                  {title}
                </p>
                <p className="text-xs text-slate-600 mt-1.5 dark:text-slate-400">
                  {detail}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Link href="/login" className="btn-primary px-6 py-3">
              Go to the submission portal
            </Link>
          </div>
        </section>

        {/* ---- 6. Registration fees ---- */}
        <section>
          <Heading id="fees">Registration fees</Heading>
          <p className="text-sm text-slate-600 mb-5 dark:text-slate-300">
            Fees include the conference kit, all technical sessions, working
            lunches, refreshments and the conference dinner. GST extra; travel
            and accommodation are not included.
          </p>
          {[
            { title: "Indian participants (INR, per delegate)", rows: FEES_INR },
            { title: "Foreign delegates (USD, per delegate)", rows: FEES_USD },
          ].map((table) => (
            <div key={table.title} className="mb-6">
              <p className="text-sm font-semibold text-slate-800 mb-2 dark:text-slate-200">
                {table.title}
              </p>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="th">Category</th>
                      <th className="th">GLOGIFT members</th>
                      <th className="th">
                        Early bird
                        <span className="block font-normal text-xs">to 20 Dec 2026</span>
                      </th>
                      <th className="th">
                        Regular
                        <span className="block font-normal text-xs">to 24 Jan 2027</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r) => (
                      <tr key={r[0]}>
                        <td className="td font-medium text-slate-800 dark:text-slate-200">
                          {r[0]}
                        </td>
                        <td className="td">{r[1]}</td>
                        <td className="td">{r[2]}</td>
                        <td className="td">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            On-campus twin-sharing accommodation from ₹1,800 per night for
            Indian delegates, including room, meals and Wi-Fi.
          </p>
        </section>

        {/* ---- 7. Committees ---- */}
        <section>
          <Heading id="committee">Committees</Heading>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {LEADERSHIP.map((p) => (
              <div key={p.name} className="card card-pad text-center card-hover">
                <div className="flex justify-center mb-4">
                  <Avatar name={p.name} size="lg" />
                </div>
                <p className="badge bg-blue-100 text-blue-800">{p.role}</p>
                <p className="text-base font-semibold text-slate-900 mt-2 dark:text-slate-100">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">{p.org}</p>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            {COMMITTEE.map((g) => (
              <div key={g.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  {g.group}
                </p>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
                  {g.people.map((name) => (
                    <div key={name} className="card card-pad text-center">
                      <div className="flex justify-center mb-2">
                        <Avatar name={name} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- 8. Important dates ---- */}
        <section>
          <Heading id="dates">Important dates</Heading>
          <ol className="relative border-l-2 border-slate-200 ml-3 dark:border-slate-700">
            {MILESTONES.map((m) => {
              const past = new Date(m.date) < today;
              return (
                <li key={m.date} className="ml-6 pb-6 last:pb-0">
                  <span
                    className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${
                      past ? "bg-slate-300" : "bg-blue-600"
                    }`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {fmt(m.date)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      past
                        ? "text-slate-400 line-through"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {m.label}
                    {m.note && (
                      <span className="ml-2 badge bg-slate-100 text-slate-600">
                        {m.note}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---- 9. Contact ---- */}
        <section className="card card-pad">
          <Heading id="contact">Contact us</Heading>
          <div className="grid gap-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Organising institution
              </p>
              <p className="text-slate-600 mt-1 dark:text-slate-400">
                Indian Institute of Management Sambalpur
                <br />
                Basantpur, Sambalpur, Odisha, India
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Co-organised with
              </p>
              <p className="text-slate-600 mt-1 dark:text-slate-400">
                GLOGIFT Society — Global Institute of Flexible Systems Management
                <br />
                B-51 (Basement), Sarvodaya Enclave, New Delhi 110017
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <a
              href="mailto:glogift27.chair@iimsambalpur.ac.in"
              className="text-blue-700 hover:underline"
            >
              glogift27.chair@iimsambalpur.ac.in
            </a>
            <a
              href="mailto:glogift27.coordinator@iimsambalpur.ac.in"
              className="text-blue-700 hover:underline"
            >
              glogift27.coordinator@iimsambalpur.ac.in
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-500 pb-6">
          © GLOGIFT 2027 — AI-Driven Solutions in Management: Flexibility,
          Digitalisation &amp; Decarbonization
        </footer>
      </div>
    </main>
  );
}
