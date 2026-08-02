import Link from "next/link";
import { Banner } from "@/components/landing/Banner";
import { IkatStrip } from "@/components/landing/IkatStrip";
import { BackToTop } from "@/components/landing/BackToTop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TRACKS } from "@/components/landing/tracks";

/**
 * The GLOGIFT 2027 landing page. Content comes from the conference brochure;
 * the section order follows the IMPeC-2025 shape the Convener asked for:
 * about → objectives → attractions → call for submission → guidelines →
 * fees → committees → dates → contact.
 */

const OBJECTIVES: { icon: React.ReactNode; text: string; tint: string }[] = [
  {
    text: "Advance AI-driven management research",
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    icon: (
      <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m0-11 2 2m7 7 2 2M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    ),
  },
  {
    text: "Bridge academia and industry",
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    icon: <path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-5h4v5" />,
  },
  {
    text: "Accelerate decarbonisation and sustainability",
    tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: (
      <path d="M12 21c5-3 8-7 8-11a8 8 0 1 0-16 0c0 4 3 8 8 11Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    ),
  },
  {
    text: "Shape responsible AI governance",
    tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    icon: (
      <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Zm0 7v5m0-8v.01" />
    ),
  },
  {
    text: "Publish and disseminate scholarship",
    tint: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    icon: (
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13ZM12 3h5.5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5H12" />
    ),
  },
];

/* `dot`/`halo` are written out in full because Tailwind only sees class names
   it can find as literal strings. Hues follow the pathway bands: blues across
   the abstract stretch, ambers for the Pathway B full-paper stretch, greens
   through registration, pink for the conference itself. */
const MILESTONES = [
  {
    date: "2026-08-07",
    label: "Open for abstract submission",
    dot: "bg-cyan-500",
    halo: "group-hover:shadow-cyan-500/50",
  },
  {
    date: "2026-09-21",
    label: "Registration opens",
    dot: "bg-violet-500",
    halo: "group-hover:shadow-violet-500/50",
  },
  {
    date: "2026-11-23",
    label: "Abstract submission closes",
    note: "All authors",
    dot: "bg-blue-600",
    halo: "group-hover:shadow-blue-600/50",
  },
  {
    date: "2026-11-30",
    label: "Abstract decisions announced",
    note: "All authors",
    dot: "bg-indigo-500",
    halo: "group-hover:shadow-indigo-500/50",
  },
  {
    date: "2026-12-08",
    label: "Full paper submission closes",
    note: "Pathway B",
    dot: "bg-amber-500",
    halo: "group-hover:shadow-amber-500/50",
  },
  {
    date: "2026-12-15",
    label: "Full paper decisions announced",
    note: "Pathway B",
    star: true,
    dot: "bg-orange-500",
    halo: "group-hover:shadow-orange-500/50",
  },
  {
    date: "2026-12-20",
    label: "Early bird registration closes",
    dot: "bg-emerald-500",
    halo: "group-hover:shadow-emerald-500/50",
  },
  {
    date: "2027-01-24",
    label: "Regular registration closes",
    dot: "bg-teal-500",
    halo: "group-hover:shadow-teal-500/50",
  },
  {
    date: "2027-02-25",
    label: "Conference, 25–27 February",
    note: "IIM Sambalpur",
    dot: "bg-pink-600",
    halo: "group-hover:shadow-pink-600/50",
  },
];

const PUBLICATIONS = [
  {
    title: "GLOGIFT 2027 Conference Proceedings",
    badge: "Book with ISBN",
    cover: "/journals/proceedings.svg",
    url: "",
    detail:
      "All accepted and presented papers appear in a dedicated proceedings volume.",
  },
  {
    title: "Global Journal of Flexible Systems Management",
    badge: "Springer · ABDC-A",
    cover: "/journals/gjfsm.jpg",
    url: "https://link.springer.com/journal/40171",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
  },
  {
    title: "International Journal of Global Business & Competitiveness",
    badge: "Springer · ABDC-C",
    cover: "/journals/ijgbc.jpg",
    url: "https://link.springer.com/journal/42943",
    detail:
      "Selected best papers fast-tracked after further peer review and revision.",
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
    icon: (
      <path d="M4 20c8 2 16-4 16-14 0-1-.2-2-.5-3-9 0-15 5-15 11 0 2 .6 4 1.5 5Zm0 0 7-7" />
    ),
  },
  {
    title: "Industry–Academia Conclave on Digital Finance",
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    card: "bg-blue-50/60 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/25",
    anim: "anim-bob",
    // A bridge between two banks.
    icon: (
      <path d="M3 17h18M5 17v-4m14 4v-4M3 13c4-5 14-5 18 0M8 17v-3m8 3v-3" />
    ),
  },
  {
    title: "Policy Roundtable on Decarbonization and Inclusive Growth",
    tint: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
    card: "bg-teal-50/60 border-teal-100 dark:bg-teal-500/10 dark:border-teal-500/25",
    anim: "anim-spin-slow",
    // A globe, turning.
    icon: (
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c3 3 3 15 0 18M3.5 9h17M3.5 15h17" />
    ),
  },
  {
    title: "Startup Showcase on FinTech and Smart Operations",
    tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    card: "bg-violet-50/60 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/25",
    anim: "anim-lift",
    // A rocket, lifting.
    icon: (
      <path d="M12 3c3 2 5 6 5 10l-3 3h-4l-3-3c0-4 2-8 5-10Zm0 6.5v.01M9 19l-2 2m8-2 2 2" />
    ),
  },
  {
    title: "Doctoral Colloquium for Emerging Researchers",
    tint: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    card: "bg-rose-50/60 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/25",
    anim: "anim-tip",
    // A graduation cap, tipping.
    icon: (
      <path d="m12 5 9 4-9 4-9-4 9-4Zm-5 6v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4" />
    ),
  },
  {
    title: "Directors’ Panel on Leadership in an AI-Driven Economy",
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    card: "bg-amber-50/60 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/25",
    anim: "anim-bob",
    // Speakers behind a panel table.
    icon: (
      <path d="M4 20h16M6 20v-4m12 4v-4M3 16h18M7.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4.5-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    ),
  },
];

// [title, detail, hashFootnote?] — the third flag marks the step with a "#"
// that points at the pathway footnote below the grid.
const GUIDELINES: [string, string, boolean?][] = [
  [
    "Stage 1 — Abstract (mandatory)",
    "Submit a 500-word abstract through the portal, naming the track it belongs to. State your intended Stage 2 pathway at this point.",
  ],
  [
    "Stage 2 — Choose your pathway",
    "Pathway A: present an accepted abstract without a full paper. Pathway B: prepare a double-anonymous manuscript using the published Full Paper Submission Guidelines and templates, following any target-journal requirements.",
    true,
  ],
  [
    "Review",
    "Abstracts are reviewed by the Track Editor, who may seek reviewers or decide directly. Pathway B full papers undergo double-blind peer review by the Scientific Committee.",
  ],
  [
    "Notification",
    "You are told of acceptance, rejection or required revisions, with feedback.",
  ],
  [
    "Your place is secured by the abstract",
    "If a Pathway B full paper is not accepted, you may still register, attend and present on the strength of the accepted abstract.",
  ],
  [
    "Registration and final formatting",
    "Accepted authors register. Pathway B authors submit a formatted paper; others submit presentation materials.",
  ],
];

const REGISTRATION_FEES = [
  ["Academicians (Faculty)", "10,000", "11,500", "350", "375"],
  ["Industry Professionals", "14,000", "16,000", "425", "450"],
  ["Research Scholars / PhD", "5,000", "6,000", "250", "300"],
  ["Students (UG/PG, full-time)", "3,000", "3,500", "90", "100"],
];

const LEADERSHIP = [
  {
    name: "Prof (Dr) Mahadeo Jaiswal",
    role: "Conference Patron",
    org: "Director, IIM Sambalpur",
  },
  {
    name: "Prof (Dr) Sushil",
    role: "GLOGIFT President",
    org: "Founder, GLOGIFT Society · Emeritus Professor, IIT Delhi",
  },
  {
    name: "Prof (Dr) Seema Gupta",
    role: "Conference Convenor",
    org: "IIM Sambalpur",
  },
  {
    name: "Prof (Dr) Saumyaranjan Sahoo",
    role: "Conference Co-Convenor",
    org: "IIM Sambalpur",
  },
];

/* Members are listed alphabetically, ignoring the honorific — sorted here
   rather than in the arrays below so a name added later lands in place. */
/* Strips "Prof (Dr) ", "Dr ", "Ms " and the like. The parenthesised part
   is matched only in brackets, so a plain "Dr Jayjit Chakraborty" keeps
   the given name instead of losing it to the title. */
const TITLE = /^(Prof|Dr|Mr|Ms|Mrs)\.?\s+(\([A-Za-z.]+\)\s+)?/i;
const byName = (a: string, b: string) =>
  a.replace(TITLE, "").localeCompare(b.replace(TITLE, ""), "en");

const COMMITTEE = [
  {
    group: "Conference committee — Faculty (IIM Sambalpur)",
    panel:
      "bg-blue-50/80 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/25",
    label: "text-blue-700 dark:text-blue-300",
    people: [
      "Prof (Dr) Aarti Singh",
      "Prof (Dr) Aqueeb Sohail Shaik",
      "Prof (Dr) Atul Prashar",
      "Prof (Dr) Dharen Kumar Pandey",
      "Prof (Dr) Hemachandra Padhan",
      "Prof (Dr) A. Manish Kumar",
      "Prof (Dr) Prasanta Kumar Chopdhar",
      "Prof (Dr) Ramakrushna Padhy",
    ],
  },
  {
    group: "Conference committee — Post doctoral (IIM Sambalpur)",
    panel:
      "bg-emerald-50/80 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/25",
    label: "text-emerald-700 dark:text-emerald-300",
    people: ["Dr Jogeshwar Mahato", "Dr Jayjit Chakraborty"],
  },
  {
    group: "Conference committee — Staff (IIM Sambalpur)",
    panel:
      "bg-amber-50/80 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/25",
    label: "text-amber-700 dark:text-amber-300",
    people: ["Ms Sasmita Mohanty", "Ms Sunita Sahu"],
  },
].map((g) => ({ ...g, people: [...g.people].sort(byName) }));

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .replace(TITLE, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/* Portraits, keyed by the exact name used in the lists above. Anyone absent
   falls back to their initials. Files live in public/people. */
const PORTRAITS: Record<string, string> = {
  "Prof (Dr) Mahadeo Jaiswal": "/people/mp-jaiswal.jpg",
  "Prof (Dr) Sushil": "/people/sushil.jpg",
  "Prof (Dr) Seema Gupta": "/people/seema-gupta.jpg",
  "Prof (Dr) Saumyaranjan Sahoo": "/people/saumyaranjan-sahoo.jpg",
  "Prof (Dr) A. Manish Kumar": "/people/a-manish-kumar.jpg",
  "Prof (Dr) Aarti Singh": "/people/aarti-singh.jpg",
  "Prof (Dr) Aqueeb Sohail Shaik": "/people/aqueeb-sohail-shaik.jpg",
  "Prof (Dr) Atul Prashar": "/people/atul-prashar.jpg",
  "Prof (Dr) Dharen Kumar Pandey": "/people/dharen-kumar-pandey.jpg",
  "Prof (Dr) Hemachandra Padhan": "/people/hemachandra-padhan.jpg",
  "Prof (Dr) Prasanta Kumar Chopdhar": "/people/prasanta-kumar-chopdhar.jpg",
  "Prof (Dr) Ramakrushna Padhy": "/people/ramakrushna-padhy.jpg",
  "Dr Jayjit Chakraborty": "/people/jayjit-chakraborty.jpg",
  "Dr Jogeshwar Mahato": "/people/jogeshwar-mahato.jpg",
  "Ms Sasmita Mohanty": "/people/sasmita-mohanty.jpg",
  "Ms Sunita Sahu": "/people/sunita-sahu.jpg",
};

const [FACULTY, POST_DOC, STAFF] = COMMITTEE;

/**
 * One membership type on its own coloured surface. `wide` lays the cards out
 * across a full row; the narrow panels sit two-abreast beside each other.
 */
function CommitteePanel({
  group,
  people,
  className,
  wide,
  hideLabel,
}: {
  group: (typeof COMMITTEE)[number];
  people: string[];
  className?: string;
  wide?: boolean;
  hideLabel?: boolean;
}) {
  if (people.length === 0) return null;
  return (
    <div className={`rounded-2xl border p-4 ${group.panel} ${className ?? ""}`}>
      <p
        className={`text-[11px] font-semibold tracking-wide mb-3 ${group.label} ${
          hideLabel ? "hidden lg:block lg:invisible" : ""
        }`}
      >
        {group.group}
      </p>
      <div
        className={`grid gap-3 grid-cols-2 ${
          wide ? "sm:grid-cols-3 lg:grid-cols-6" : ""
        }`}
      >
        {people.map((name) => (
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
  );
}

function Avatar({ name, size }: { name: string; size: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-32 w-32 text-3xl" : "h-24 w-24 text-xl";
  const ring = "ring-4 ring-white shadow-md dark:ring-slate-800";
  const photo = PORTRAITS[name];
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${dim} rounded-full object-cover ${ring}`}
      />
    );
  }
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
    <h2
      id={id}
      className="text-2xl font-semibold text-gradient mb-4 scroll-mt-8"
    >
      {children}
    </h2>
  );
}

const NAV_LINKS: { href: string; label: string; accent?: boolean }[] = [
  { href: "#submission", label: "Conference tracks" },
  { href: "#guidelines", label: "Submit abstract/full paper" },
  { href: "#fees", label: "Register for conference" },
  { href: "#dates", label: "Important dates" },
  // The one link that leaves the page, so it carries the colour and pulse
  // that mark it out from the section jumps.
  { href: "/travelogue", label: "Sambalpur travelogue", accent: true },
];

function NavLinks({ className }: { className: string }) {
  return (
    <div className={className}>
      {NAV_LINKS.map(({ href, label, accent }) => (
        <a
          key={href}
          href={href}
          className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium
                     text-slate-700 transition hover:bg-white hover:text-blue-700
                     dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {accent ? (
            <span className="text-gradient text-attention font-semibold">
              {label}
            </span>
          ) : (
            label
          )}
        </a>
      ))}
    </div>
  );
}

export function LandingPage() {
  const today = new Date();

  return (
    <main className="min-h-screen">
      {/* Sambalpuri Ikat borders, top and bottom of the page. */}
      <IkatStrip />

      {/* Slim utility row: home on the left, the two portal actions on the
          right. Kept above the banner so the hero stays uninterrupted. */}
      <nav className="max-w-6xl mx-auto px-4 pt-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <div className="flex items-center gap-1 order-1">
          <a
            href="/Home"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                     font-medium text-slate-700 transition hover:bg-white hover:text-blue-700
                     dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 11l9-8 9 8M6 10v10h12V10" />
            </svg>
            Home
          </a>

          <NavLinks className="hidden lg:flex items-center gap-1 text-sm" />
        </div>

        {/* On phones the same links get their own scrolling row beneath, so
            they are reachable without crowding the actions. */}
        <NavLinks className="order-3 w-full lg:hidden flex items-center gap-1
                             overflow-x-auto text-sm pb-0.5" />

        <div className="flex items-center gap-2 order-2 lg:order-3">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary px-4 py-1.5 text-sm">
            Login
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-1.5 text-sm">
            Sign up
          </Link>
        </div>
      </nav>

      <div id="top" className="max-w-6xl mx-auto px-4 py-4 space-y-10">
        {/* ---- Hero ---- */}
        <section className="space-y-4">
          <Banner />
        </section>

        {/* ---- 1. About ---- */}
        <section>
          <Heading id="about">About GLOGIFT 2027</Heading>
          <div className="card card-pad space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              The{" "}
              <strong>
                International Conference on AI-Driven Solutions in Management:
                Flexibility, Digitalisation &amp; Decarbonization
              </strong>{" "}
              is jointly organised by the Indian Institute of Management
              Sambalpur and the GLOGIFT Society — Global Institute of Flexible
              Systems Management — at IIM Sambalpur, Odisha, from 25 to 27
              February 2027.
            </p>
            <p>
              The theme joins three forces reshaping management at once.{" "}
              <strong>Flexibility</strong> is the capacity of organisations to
              absorb shocks and reconfigure quickly — the founding concern of
              flexible systems management. <strong>Digitalisation</strong> is
              the movement of intelligence into the operating core of the firm,
              from algorithmic finance to digital twins on the factory floor.{" "}
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
              <div
                key={o.text}
                className="card card-pad text-center card-hover"
              >
                <span
                  className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${o.tint}`}
                >
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
              doctoral scholars and practitioners across the ten conference
              tracks. Begin by submitting a <strong>500-word abstract</strong>{" "}
              under the most relevant track. Interdisciplinary, practice-based
              and policy-oriented work is welcome.
            </p>
            <p className="mt-3">
              Authors whose abstracts are accepted for Pathway B should prepare
              a double-anonymous full paper using the{" "}
              <Link
                href="/full-paper-submission-guidelines"
                className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
              >
                Full Paper Submission Guidelines
              </Link>
              , Author Details Worksheet and Blinded Manuscript Template.
              Requirements vary by target journal and must be checked before
              submission.
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
            {GUIDELINES.map(([title, detail, hash], i) => (
              <div key={title} className="card card-pad">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Step {i + 1}
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1 dark:text-slate-100">
                  {title}
                  {hash && <span className="text-blue-600">#</span>}
                </p>
                <p className="text-xs text-slate-600 mt-1.5 dark:text-slate-400">
                  {detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="text-blue-600">#</span> Choosing Pathway B keeps you
            in the Pathway A (abstract) phase until your abstract is accepted.
            Even after acceptance, the corresponding author may still return to
            Pathway A and present on the accepted abstract, or continue to submit
            the full manuscript under Pathway B.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/login" className="btn-primary px-6 py-3">
              Go to the submission portal
            </Link>
          </div>
        </section>

        {/* ---- 6. Registration fees ---- */}
        <section>
          <Heading id="fees">Registration fees</Heading>
          <p className="text-xs leading-relaxed text-slate-600 mb-5 dark:text-slate-300">
            Fees include the conference kit, certificates, working lunches,
            refreshments and the conference dinner. GST extra; travel and
            accommodation are not included. We would love to welcome you on
            campus &mdash; the kit, printed certificates and meals can be
            availed only on site. Virtual delegates receive e-certificates of
            attendance instead; the Book of Abstracts and the Conference
            Proceedings with ISBN reach every participant in digital format.
          </p>
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <h3 className="mb-1.5 text-sm font-semibold text-blue-800 dark:text-blue-200">
              Certificate eligibility
            </h3>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Certificates are issued in the name of each registered,
              fee-paid participant. A registered author who attends and
              presents receives the attendance/participation certificate and
              the presentation certificate. Registration is individual, not
              per paper.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <strong>Example:</strong> If Author A is the corresponding author
              and Author B is a co-author, both authors must register and pay
              the applicable registration fee if both require certificates.
              If only Author B registers, pays, attends and presents, the
              certificates are issued only to Author B; unregistered Author A
              receives no certificate.
            </p>
          </div>
          <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Per delegate
          </p>
          {/* One comparison table keeps Indian and foreign rates aligned by
              category. It scrolls horizontally on smaller screens. */}
          <div className="card mb-4 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm [&_td]:py-2 [&_th]:py-2">
              <thead>
                <tr className="text-left">
                  <th className="th" rowSpan={2}>Category</th>
                  <th
                    className="th text-center bg-blue-100/70 text-blue-800
                               dark:bg-blue-500/20! dark:text-blue-200!"
                    colSpan={2}
                  >
                    Indian participants (INR)
                  </th>
                  <th
                    className="th text-center border-l border-slate-200/70 bg-amber-100/70 text-amber-800
                               dark:border-slate-700/60 dark:bg-amber-500/20! dark:text-amber-200!"
                    colSpan={2}
                  >
                    Foreign delegates (USD)
                  </th>
                </tr>
                <tr className="text-left">
                  {["Early bird", "Regular", "Early bird", "Regular"].map((label, index) => {
                    const indian = index < 2;
                    const tint = indian
                      ? "bg-blue-50/70 dark:bg-blue-500/10!"
                      : "bg-amber-50/70 dark:bg-amber-500/10!";
                    const divider =
                      index === 2
                        ? " border-l border-slate-200/70 dark:border-slate-700/60"
                        : "";
                    return (
                      <th className={`th ${tint}${divider}`} key={`${label}-${index}`}>
                        {label}
                        <span className="block whitespace-nowrap text-xs font-normal">
                          On or before {index % 2 === 0 ? "20 Dec 2026" : "24 Jan 2027"}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {REGISTRATION_FEES.map((row) => (
                  <tr key={row[0]}>
                    <td className="td font-medium text-slate-800 dark:text-slate-200">
                      {row[0]}
                    </td>
                    <td className="td bg-blue-50/70 dark:bg-blue-500/[0.08]">₹{row[1]}</td>
                    <td className="td bg-blue-50/70 dark:bg-blue-500/[0.08]">₹{row[2]}</td>
                    <td className="td border-l border-slate-200/70 bg-amber-50/70 dark:border-slate-700/60 dark:bg-amber-500/[0.08]">
                      ${row[3]}
                    </td>
                    <td className="td bg-amber-50/70 dark:bg-amber-500/[0.08]">${row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 dark:text-blue-100 dark:bg-blue-500/15 dark:border-blue-500/40">
            <strong>GLOGIFT Society members</strong> can avail a{" "}
            <strong>15% discount on registration fees</strong> only, by applying
            the coupon code shared by the conference organizers or the GLOGIFT
            Society at the time of registration check-out.
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            On-campus rooms include meals and Wi-Fi, at ₹1,800 / $19 per night
            twin-sharing and ₹3,600 / $38 per night for a single room, with 18%
            GST charged extra. The same rates apply to accompanying spouses,
            relatives and guests. Rooms are limited and allotted on a
            first-come, first-served basis; off-campus hotel options will be
            shared on the conference website.
          </p>
        </section>

        {/* ---- 7. Conference timeline ---- */}
        <section>
          <Heading id="dates">Conference timeline</Heading>
          {/* Horizontal on wide screens: labels alternate above and below the
              rail so long text never collides with its neighbour. */}
          <div className="hidden md:block overflow-x-auto pb-2">
            <div className="relative min-w-[60rem] px-4">
              <div className="relative grid grid-cols-9 gap-3">
                {/* The rail sits on the dots, not at the wrapper's midpoint —
                    7rem clears the upper label row, +0.5rem centres it on the
                    1rem dot. */}
                <div className="absolute inset-x-0 top-[7.5rem] h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-700" />
                {MILESTONES.map((m, i) => {
                  const past = new Date(m.date) < today;
                  const above = i % 2 === 1;
                  const label = (
                    <div
                      className={`text-center px-1 transition-transform duration-200 ease-out group-hover:scale-110 ${
                        above ? "origin-bottom" : "origin-top"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {fmt(m.date)}
                      </p>
                      <p
                        className={`text-xs font-medium leading-snug ${
                          past
                            ? "text-slate-400 line-through"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {m.label}
                        {(m as { star?: boolean }).star && (
                          <span className="text-orange-500">*</span>
                        )}
                      </p>
                      {m.note && (
                        <span className="badge bg-slate-100 text-slate-600 mt-1">
                          {m.note}
                        </span>
                      )}
                    </div>
                  );
                  return (
                    /* `group` scopes the hover to this milestone alone; z-10 on
                       hover keeps the enlarged label above its neighbours. */
                    <div
                      key={m.date}
                      className="group relative flex flex-col items-center hover:z-10"
                    >
                      <div className="h-28 w-full flex items-end justify-center pb-3">
                        {above ? label : null}
                      </div>
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full ring-4 ring-white dark:ring-slate-900
                          transition-transform duration-200 ease-out group-hover:scale-[1.6]
                          shadow-[0_0_0_0_transparent] group-hover:shadow-[0_0_0_6px_var(--tw-shadow-color)]
                          ${past ? "bg-slate-300 group-hover:shadow-slate-400/50" : `${m.dot} ${m.halo}`}`}
                      />
                      <div className="h-28 w-full flex items-start justify-center pt-3">
                        {above ? null : label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Each pathway's own route: solid where it applies, dashed
                  where that pathway skips ahead. */}
              <div className="mt-6 space-y-3">
                {[
                  {
                    name: "Pathway A",
                    detail: "abstract & presentation",
                    colour: "bg-blue-500",
                    faint: "bg-blue-200 dark:bg-blue-500/25",
                    skips: true,
                  },
                  {
                    name: "Pathway B",
                    detail: "abstract, full paper & presentation",
                    colour: "bg-amber-500",
                    faint: "bg-amber-200 dark:bg-amber-500/25",
                    skips: false,
                  },
                ].map((route) => (
                  <div key={route.name}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {route.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {route.detail}
                      </span>
                    </div>
                    <div className="grid grid-cols-9 gap-3">
                      {[
                        {
                          anchor: "col-start-1",
                          left: "50%",
                          width: "calc(300% + 1.875rem)",
                          faded: false,
                        },
                        {
                          anchor: "col-start-4",
                          left: "calc(50% + 0.375rem)",
                          width: "calc(300% + 1.5rem)",
                          faded: true,
                        },
                        {
                          anchor: "col-start-7",
                          left: "calc(50% + 0.375rem)",
                          width: "calc(200% + 1.125rem)",
                          faded: false,
                        },
                      ].map((segment) => (
                        <span
                          key={segment.anchor}
                          className={`relative row-start-1 h-1.5 ${segment.anchor}`}
                        >
                          <span
                            className={`absolute top-0 h-1.5 rounded-full ${
                              segment.faded && route.skips
                                ? route.faint
                                : route.colour
                            }`}
                            style={{
                              left: segment.left,
                              width: segment.width,
                            }}
                            title={
                              segment.faded && route.skips
                                ? "Pathway A skips the full-paper stage"
                                : undefined
                            }
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">
                  The faded stretch is the full-paper stage, which Pathway A
                  skips — both pathways rejoin to register and present.
                </p>
              </div>
            </div>
          </div>

          {/* Vertical on narrow screens, where a rail cannot fit. */}
          <ol className="md:hidden relative border-l-2 border-slate-200 ml-3 dark:border-slate-700">
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
                    {(m as { star?: boolean }).star && (
                      <span className="text-orange-500">*</span>
                    )}
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

          <p className="mt-6 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="text-orange-500">*</span> Full-paper decisions are{" "}
            <strong>targeted for 15 December 2026</strong>, and may take up to
            around <strong>30 days beyond (or even more)</strong> this depending
            on how early the author submits the full paper, reviewer acceptance,
            and the time the Track Editor takes to reach a decision. The
            organisers make every effort to decide by 15 December 2026. Pathway B
            authors are therefore advised to submit at the earliest and to begin
            preparing their full paper as soon as they choose Pathway B.
          </p>
        </section>

        {/* ---- 8. Conference advisory committee ---- */}
        <section>
          <Heading id="committee">Conference advisory committee</Heading>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {LEADERSHIP.map((p) => (
              <div
                key={p.name}
                className="card card-pad text-center card-hover"
              >
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

          {/* Each membership type gets its own tinted surface. The faculty
              list runs a full row wide and its overflow sits beside the other
              two panels, so the row never ends in empty space. */}
          <div className="grid gap-4 lg:grid-cols-6">
            <CommitteePanel
              group={FACULTY}
              people={FACULTY.people.slice(0, 6)}
              className="-mb-4 pb-2 rounded-b-none border-b-0
                         lg:col-span-6 lg:mb-0 lg:pb-4 lg:rounded-2xl lg:border-b"
              wide
            />
            <CommitteePanel
              group={FACULTY}
              people={FACULTY.people.slice(6)}
              className="pt-2 rounded-t-none lg:col-span-2 lg:pt-4 lg:rounded-2xl"
              hideLabel
            />
            <CommitteePanel
              group={POST_DOC}
              people={POST_DOC.people}
              className="lg:col-span-2"
            />
            <CommitteePanel
              group={STAFF}
              people={STAFF.people}
              className="lg:col-span-2"
            />
          </div>
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
                GLOGIFT Society — Global Institute of Flexible Systems
                Management
                <br />
                B-51 (Basement), Sarvodaya Enclave, New Delhi 110017
              </p>
            </div>
          </div>
          {/* Directions sit above the email addresses: most people asking
              "where is it?" would rather read the page than write a mail. */}
          <div className="mt-5">
            <Link
              href="/how-to-reach"
              className="inline-flex items-center gap-2 rounded-full border-2
                         border-blue-600 bg-white px-5 py-2.5 text-sm font-semibold
                         transition hover:bg-blue-50
                         dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <span className="text-gradient">How to reach the campus</span>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              "glogift27.chair@iimsambalpur.ac.in",
              "glogift27.coordinator@iimsambalpur.ac.in",
            ].map((address) => (
              <a
                key={address}
                href={`mailto:${address}`}
                className="inline-flex items-center gap-2 text-blue-700 hover:underline
                           dark:text-blue-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2.5" y="5" width="19" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {address}
              </a>
            ))}
          </div>

          {/* Conference collateral — presented as document cards rather than
              plain links so they read as things you open, not stray text. */}
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Appendices
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/conference-flyer"
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl
                           border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur
                           transition duration-300 hover:-translate-y-0.5 hover:border-blue-300
                           hover:shadow-[0_14px_34px_-14px_rgba(37,99,235,0.6)]
                           dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-500/60"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-blue-700" />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50
                                 text-blue-600 transition group-hover:scale-105
                                 dark:bg-blue-500/15 dark:text-blue-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                    <path d="M9 13h6M9 17h4" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">
                    Conference Flyer
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Quick one-page overview
                  </span>
                </span>
                <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition
                     group-hover:translate-x-1 group-hover:text-blue-500 dark:text-slate-600"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>

              <Link
                href="/conference-brochure"
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl
                           border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur
                           transition duration-300 hover:-translate-y-0.5 hover:border-amber-300
                           hover:shadow-[0_14px_34px_-14px_rgba(245,158,11,0.65)]
                           dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-amber-500/60"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50
                                 text-amber-600 transition group-hover:scale-105
                                 dark:bg-amber-500/15 dark:text-amber-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 7c0-1.1-.9-2-2-2H3v13h7a2 2 0 0 1 2 2z" />
                    <path d="M12 7c0-1.1.9-2 2-2h7v13h-7a2 2 0 0 0-2 2z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">
                    Conference Brochure
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Full programme &amp; details
                  </span>
                </span>
                <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition
                     group-hover:translate-x-1 group-hover:text-amber-500 dark:text-slate-600"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>

              <Link
                href="/full-paper-submission-guidelines"
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl
                           border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur
                           transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300
                           hover:shadow-[0_14px_34px_-14px_rgba(16,185,129,0.65)]
                           dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-emerald-500/60"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-700" />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50
                                 text-emerald-600 transition group-hover:scale-105
                                 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5" />
                    <path d="m9 14 1.5 1.5L15 11" />
                    <path d="M9 18h6" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">
                    Full Paper Submission Guidelines (Pathway B)
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    Templates &amp; journal requirements
                  </span>
                </span>
                <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition
                     group-hover:translate-x-1 group-hover:text-emerald-500 dark:text-slate-600"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-700 pt-5 pb-6 text-center text-xs text-slate-500">
          {/* Separators break onto their own lines on narrow screens rather
              than leaving a bar stranded at the start of a line. */}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 2027
          </span>
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          International Conference on AI-Driven Solutions in Management:
          Flexibility, Digitalisation &amp; Decarbonization
          <span aria-hidden className="mx-2 text-slate-300 dark:text-slate-600">
            |
          </span>
          © Indian Institute of Management Sambalpur
        </footer>
      </div>
      <IkatStrip flip />
      <BackToTop />
    </main>
  );
}
