import Link from "next/link";
import { Banner } from "@/components/landing/Banner";

/** Everything on this page comes from the GLOGIFT 2027 brochure. */

const WHY = [
  "Engage with leading academicians, industry leaders, policymakers and entrepreneurs shaping AI-driven finance and operations worldwide.",
  "Present original research across 10 specialised tracks spanning AI, digital transformation, sustainable finance and inclusive growth.",
  "Publish in Springer-indexed proceedings, with fast-track options for the Global Journal of Flexible Manufacturing (ABDC ‘A’).",
  "Network at special panels, an industry–academia conclave and a dedicated doctoral colloquium.",
  "Experience IIM Sambalpur’s campus, along the Mahanadi River in Western Odisha.",
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

const COMMITTEE = [
  {
    group: "Conference Patron",
    people: [{ name: "Prof (Dr) M. P. Jaiswal", role: "Director, IIM Sambalpur" }],
  },
  {
    group: "GLOGIFT President",
    people: [
      { name: "Prof (Dr) Sushil", role: "Founder, GLOGIFT Society · Emeritus Professor, IIT Delhi" },
    ],
  },
  {
    group: "Conference Convenors",
    people: [
      { name: "Prof Seema Gupta", role: "IIM Sambalpur" },
      { name: "Prof Saumyaranjan Sahoo", role: "IIM Sambalpur" },
    ],
  },
  {
    group: "Conference Committee — Faculty",
    people: [
      "Prof Aarti Singh", "Prof Aqueeb Sohail Shaik", "Prof Atul Prashar",
      "Prof Dharen Kumar Pandey", "Prof Hemachandra Padhan", "Prof A. Manish Kumar",
      "Prof Prasanta Kumar Chopdhar", "Prof Ramakrushna Padhy",
    ].map((name) => ({ name, role: "IIM Sambalpur" })),
  },
  {
    group: "Post-Doctoral",
    people: [
      { name: "Dr Jogeshwar Mahato", role: "IIM Sambalpur" },
      { name: "Dr Jayjit Chakraborty", role: "IIM Sambalpur" },
    ],
  },
  {
    group: "Conference Staff",
    people: [
      { name: "Ms Sasmita Mohanty", role: "IIM Sambalpur" },
      { name: "Ms Sunita Sahu", role: "IIM Sambalpur" },
    ],
  },
];

const PUBLICATIONS = [
  ["Conference Proceedings", "All accepted and presented papers, published by a reputed publisher."],
  ["Global Journal of Flexible Manufacturing", "ABDC ‘A’, Springer — selected best papers fast-tracked after further review."],
  ["International Journal of Global Business and Competitiveness", "ABDC ‘C’, Springer — selected best papers fast-tracked."],
  ["Book Series on Flexible Systems Management", "Springer, Scopus-indexed — selected best papers fast-tracked."],
];

const SESSIONS = [
  "AI and Sustainability Leadership Forum",
  "Industry–Academia Conclave on Digital Finance",
  "Policy Roundtable on Decarbonization and Inclusive Growth",
  "Startup Showcase on FinTech and Smart Operations",
  "Doctoral Colloquium for Emerging Researchers",
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Initials({ name }: { name: string }) {
  const letters = name
    .replace(/^(Prof|Dr|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-semibold text-white">
      {letters}
    </span>
  );
}

export function LandingPage() {
  const today = new Date();

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-16">
        {/* ---- Hero ---- */}
        <section className="space-y-6">
          <Banner />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-primary text-base px-6 py-3">
              Submit your abstract
            </Link>
            <a href="#timeline" className="btn-secondary text-base px-6 py-3">
              Key dates
            </a>
            <a href="#tracks" className="btn-secondary text-base px-6 py-3">
              Conference tracks
            </a>
          </div>
          <p className="text-center text-sm text-slate-600 max-w-3xl mx-auto dark:text-slate-300">
            Exploring how AI, digital transformation and sustainable innovation
            are reshaping management for a flexible, technological and
            decarbonised future.
          </p>
        </section>

        {/* ---- Why attend ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-5">Why attend</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <div key={i} className="card card-pad">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-sm font-semibold mb-3">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">{w}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Timeline ---- */}
        <section id="timeline" className="scroll-mt-8">
          <h2 className="text-2xl font-semibold text-gradient mb-5">
            Timeline of submission
          </h2>
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

        {/* ---- Tracks ---- */}
        <section id="tracks" className="scroll-mt-8">
          <h2 className="text-2xl font-semibold text-gradient mb-5">
            Conference tracks
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {TRACKS.map(([title, topics], i) => (
              <div key={title} className="card card-pad card-hover">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Track {i + 1}
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1 dark:text-slate-100">
                  {title}
                </p>
                <p className="text-xs text-slate-600 mt-2 dark:text-slate-400">
                  {topics}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Submission pathways ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-2">
            How to submit
          </h2>
          <p className="text-sm text-slate-600 mb-5 dark:text-slate-300">
            Every author begins with a 500-word abstract. After the abstract
            decision, you choose one of two pathways.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card card-pad border-t-4 border-blue-500">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pathway A — Abstract &amp; presentation
              </p>
              <p className="text-sm text-slate-600 mt-2 dark:text-slate-400">
                Present at the conference without publishing a full paper. Once
                your abstract is accepted, register and present. No full paper
                required.
              </p>
            </div>
            <div className="card card-pad border-t-4 border-amber-500">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pathway B — Abstract, full paper &amp; presentation
              </p>
              <p className="text-sm text-slate-600 mt-2 dark:text-slate-400">
                Publish in the proceedings. Submit the full paper after abstract
                acceptance; it undergoes double-blind peer review by the
                Scientific Committee.
              </p>
            </div>
          </div>
          <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-4 py-3 mt-4">
            <strong>Your place is secured by the abstract.</strong> If a Pathway
            B full paper is not accepted, you may still register, attend and
            present on the strength of the accepted abstract.
          </p>
        </section>

        {/* ---- Registration fees ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-2">
            Registration
          </h2>
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
                      <th className="th">Early bird<span className="block font-normal text-xs">to 20 Dec 2026</span></th>
                      <th className="th">Regular<span className="block font-normal text-xs">to 24 Jan 2027</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r) => (
                      <tr key={r[0]}>
                        <td className="td font-medium text-slate-800 dark:text-slate-200">{r[0]}</td>
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
            On-campus twin-sharing accommodation is available from ₹1,800 per
            night for Indian delegates, including room, meals and Wi-Fi.
          </p>
        </section>

        {/* ---- Publication ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-5">
            Publication outcomes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {PUBLICATIONS.map(([title, detail]) => (
              <div key={title} className="card card-pad">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </p>
                <p className="text-xs text-slate-600 mt-1.5 dark:text-slate-400">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Special sessions ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-5">
            Special sessions &amp; panels
          </h2>
          <div className="flex flex-wrap gap-2">
            {SESSIONS.map((sn) => (
              <span
                key={sn}
                className="badge bg-blue-100 text-blue-800 text-sm px-3 py-1.5"
              >
                {sn}
              </span>
            ))}
          </div>
        </section>

        {/* ---- Committee ---- */}
        <section>
          <h2 className="text-2xl font-semibold text-gradient mb-5">
            Organising committee
          </h2>
          <div className="space-y-8">
            {COMMITTEE.map((g) => (
              <div key={g.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  {g.group}
                </p>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {g.people.map((p) => (
                    <div key={p.name} className="card card-pad text-center">
                      <div className="flex justify-center mb-3">
                        <Initials name={p.name} />
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Contact ---- */}
        <section className="card card-pad">
          <h2 className="text-xl font-semibold text-gradient mb-4">
            Contact &amp; organisers
          </h2>
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

        <footer className="text-center text-xs text-slate-500 pb-10">
          © GLOGIFT 2027 — AI-Driven Solutions in Management: Flexibility,
          Digitalisation &amp; Decarbonization
        </footer>
      </div>
    </main>
  );
}
