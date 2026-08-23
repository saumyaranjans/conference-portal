import Link from "next/link";
import {
  DeadlineCountdown,
  type Deadline,
} from "@/components/landing/DeadlineCountdown";
import { FaqBot } from "@/components/landing/FaqBot";
import { TOSHI_KNOWLEDGE } from "@/components/landing/toshiKnowledge";
import { SocialLinks } from "@/components/landing/SocialLinks";
import { AdvisoryReveal } from "@/components/landing/AdvisoryReveal";
import { Banner } from "@/components/landing/Banner";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/registrationFees";
import { CampusFilmCurtain } from "@/components/CampusFilmCurtain";
import { IkatStrip } from "@/components/landing/IkatStrip";
import { BackToTop } from "@/components/landing/BackToTop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TRACKS } from "@/components/landing/tracks";
import { PUBLICATIONS } from "@/components/landing/publications";

/**
 * The GLOGIFT 27 landing page. Content comes from the conference brochure;
 * the section order follows the IMPeC-2025 shape the Convener asked for:
 * about → objectives → attractions → call for submission → guidelines →
 * fees → committees → dates → contact.
 *
 * The campus film closes the page, after contact. It is the host institute
 * introducing itself rather than conference business, so it reads better as a
 * parting note than as an interruption between About and the tracks — which is
 * where it used to sit, ahead of everything a delegate actually came for.
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

// Action deadlines for the live countdown, in chronological order. It shows
// the next one still in the future and auto-advances as each passes.
const DEADLINES: Deadline[] = [
  {
    label: "Abstract submission",
    date: "2026-11-23",
    ctaLabel: "Submit your abstract",
    ctaHref: "/signup",
  },
  {
    label: "Full paper submission (Pathway B)",
    date: "2026-12-08",
    ctaLabel: "Submit your full paper",
    ctaHref: "/login",
  },
  {
    label: "Early-bird registration",
    date: "2026-12-20",
    ctaLabel: "Register — early bird",
    ctaHref: "/login",
  },
  {
    label: "Regular registration",
    date: "2027-01-24",
    ctaLabel: "Register now",
    ctaHref: "/login",
  },
  {
    label: "Conference begins",
    date: "2027-02-25",
    ctaLabel: "See important dates",
    ctaHref: "#dates",
  },
];

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "When and where is GLOGIFT 27 held?",
    a: "GLOGIFT 27 — the International Conference on AI-Driven Solutions in Management — is held from 25 to 27 February 2027 at the Indian Institute of Management (IIM) Sambalpur, Odisha, India. It runs in person with a hybrid (online) option for remote participants.",
  },
  {
    q: "Who can attend and submit papers?",
    a: "Academicians, PhD scholars, MBA and postgraduate students, research associates and practitioners from prominent Indian and international universities are welcome — across Management, Communication, Engineering, Information Technology and the Social Sciences — along with industry professionals and consultants from AI-focused sectors.",
  },
  {
    q: "What are the two submission pathways (A and B)?",
    a: "Every submission starts with a 500-word abstract. Pathway A: present on the accepted abstract, with no full paper required. Pathway B: after the abstract is accepted, submit a double-anonymous full paper that undergoes peer review — and present it. Authors declare their intended pathway at the abstract stage.",
  },
  {
    q: "What are the submission requirements and tracks?",
    a: "Submit a 500-word abstract (350 words minimum) under one of the ten conference tracks, naming the track it belongs to. Full papers (Pathway B) follow the published Full Paper Submission Guidelines and templates.",
  },
  {
    q: "What are the registration fees and deadlines?",
    a: `Fees depend on your participant category — Faculty / Academician, Industry Professional, PhD / Research Scholars, or Student. Delegates registering from outside India are billed at the international rate in US Dollars, determined by the country on your profile. Early-bird rates apply on or before 20 December 2026; regular rates apply from 21 December 2026. GIFT Society members receive a ${MEMBER_DISCOUNT_PERCENT}% discount.`,
  },
  {
    q: "Will accepted papers be published?",
    a: "All accepted and presented papers appear in the GLOGIFT 27 Conference Proceedings (a volume with ISBN). Selected best papers may be fast-tracked, after further peer review, to associated journals and edited volumes.",
  },
  {
    q: "How do I register and submit my work?",
    a: "Create an account on the submission portal, submit your 500-word abstract under the relevant track, and complete registration. Corresponding authors manage co-authors, revisions and the camera-ready copy from the same dashboard.",
  },
  {
    q: "Is there a discount for GIFT Society members?",
    a: `Yes — GIFT Society members receive a ${MEMBER_DISCOUNT_PERCENT}% discount on the registration fee. Indicate your membership at sign-up (with your membership number) to have the discount applied.`,
  },
  {
    q: "Can I attend and present online (hybrid)?",
    a: "Yes. GLOGIFT 27 runs in person at IIM Sambalpur with a hybrid option. Virtual delegates present remotely and receive an e-certificate of participation; the Book of Abstracts and the ISBN Proceedings reach every participant digitally.",
  },
  {
    q: "What are the key dates I should track?",
    a: "Abstract submission opens 7 Aug 2026 and closes 23 Nov 2026; abstract decisions on 30 Nov 2026; full-paper (Pathway B) submission closes 8 Dec 2026 with decisions by 15 Dec 2026; early-bird registration closes 20 Dec 2026; regular registration closes 24 Jan 2027; the conference runs 25–27 Feb 2027.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes. Presenting authors receive a certificate of participation and presentation; reviewers and Track Editors receive certificates of appreciation for their service. On-site delegates receive printed certificates; virtual delegates receive e-certificates.",
  },
  {
    q: "Who do I contact for queries?",
    a: "Write to the Conference Chair at glogift27.chair@iimsambalpur.ac.in or the Coordinator at glogift27.coordinator@iimsambalpur.ac.in. GLOGIFT 27 is organised by IIM Sambalpur with the GIFT Society (Global Institute of Flexible Systems Management).",
  },
  {
    q: "What is the abstract word limit?",
    a: "The abstract should be up to 500 words, with a minimum of 350 words. You submit it under one of the ten conference tracks.",
  },
  {
    q: "Can I submit more than one paper?",
    a: "Yes — an author may be the corresponding (submitting) author on up to two submissions. You can also be a co-author on additional papers.",
  },
  {
    q: "How does the review process work?",
    a: "Abstracts are reviewed by the Track Editor, who may seek reviewers or decide directly. Pathway B full papers undergo double-anonymous (double-blind) peer review and require two 'accept' recommendations to be accepted.",
  },
  {
    q: "In what currency are the fees charged?",
    a: "Delegates in India are billed in Indian Rupees (INR); delegates anywhere outside India are billed in US Dollars (USD) at the international rate. This follows the country on your profile — there is nothing to select. Fees vary by participant category, with early-bird rates on or before 20 December 2026.",
  },
  {
    q: "How do I reach IIM Sambalpur?",
    a: "The conference is at IIM Sambalpur, Odisha, India. Travel details (nearest airport, railway station and campus directions) are on the 'How to reach' page; for anything specific, contact the Coordinator.",
  },
  {
    q: "Is the conference in person or online?",
    a: "GLOGIFT 27 is held in person at IIM Sambalpur with a hybrid option. You may attend and present on-site or virtually; virtual delegates receive e-certificates and all digital materials.",
  },
];

// Outlets live in publications.ts so this section and the Publishing Outlet
// Guidelines page always show the same list.

/** Each session gets a colour and a small motion that suits its subject. */
const SESSIONS: {
  title: string;
  tint: string;
  card: string;
  anim: string;
  icon: React.ReactNode;
}[] = [
  {
    title: "AI Leadership Forum",
    // Was emerald with a leaf, from when this session was about sustainability.
    // A leaf now points at the wrong subject; sky-blue reads as technology and
    // stays distinct from the indigo used by the editors' session.
    tint: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    card: "bg-sky-50/60 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/25",
    anim: "anim-lift",
    // A small network: two inputs, a hidden node, two outputs.
    icon: (
      <path d="M3.4 8a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0Zm0 8a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0Zm7-4a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0Zm7-4a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0Zm0 8a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0ZM6.6 8.8l4 2.4m-4 4 4-2.4m2.8-1.6 4-2.4m-4 4 4 2.4" />
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
  {
    title: "Talk with Editors of Top-Tier Journals",
    // Amber is taken by the panel above; indigo keeps the four cards distinct
    // and matches the colour this session already carries on the schedule.
    tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    card: "bg-indigo-50/60 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/25",
    anim: "anim-bob",
    // An open journal.
    icon: (
      <path d="M12 7v13M12 7c-1.6-1.3-4-2-7-2v13c3 0 5.4.7 7 2 1.6-1.3 4-2 7-2V5c-3 0-5.4.7-7 2Z" />
    ),
  },
];

// [title, detail, hashFootnote?] — the third flag marks the step with a "#"
// that points at the pathway footnote below the grid.
const GUIDELINES: [string, string, boolean?][] = [
  [
    "Stage 1 — Abstract (mandatory)",
    "Submit a 500-word abstract through the portal, naming the track it belongs to. State your intended Stage 2 pathway — Pathway A or Pathway B — at this point.",
  ],
  [
    "Stage 2 — Choose your pathway",
    "Pathway A: present an accepted abstract without a full paper. Pathway B: prepare a double-anonymous manuscript using the published Full Paper Submission Guidelines and templates, following any target-journal requirements.",
    true,
  ],
  [
    "Review",
    "The abstract is reviewed by the Track Editor, who may seek reviewers or decide directly — this is the complete review for Pathway A. Pathway B full papers additionally undergo double-blind peer review by the Scientific Committee.",
  ],
  [
    "Notification",
    "You are told of acceptance, rejection or required revisions, with feedback.",
  ],
  [
    "Your place is secured by the abstract",
    "If a Pathway B full paper is not accepted, you may still register, attend and present on the strength of the accepted abstract under Pathway A.",
  ],
  [
    "Registration and final formatting",
    "Accepted authors register. Pathway B authors submit their final formatted full paper. Pathway A authors present on the accepted abstract — no full paper and no presentation materials are submitted.",
  ],
];

// Pathway A = emerald, Pathway B = violet — consistent with the Convener
// dashboard's pathway badges (see AuthorManagement.tsx).
const PATHWAY_CLASS = {
  A: "rounded px-1 font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300",
  B: "rounded px-1 font-bold text-violet-700 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300",
} as const;

/** Inline bold+highlighted "Pathway A" / "Pathway B" tag, for prose that also
 *  contains other JSX. */
function PW({ p }: { p: "A" | "B" }) {
  return <strong className={PATHWAY_CLASS[p]}>Pathway {p}</strong>;
}

/** Render plain text with every "Pathway A" / "Pathway B" mention bolded and
 *  highlighted. */
function highlightPathways(text: string) {
  return text.split(/(Pathway [AB])/g).map((part, i) => {
    if (part === "Pathway A") return <PW key={i} p="A" />;
    if (part === "Pathway B") return <PW key={i} p="B" />;
    return <span key={i}>{part}</span>;
  });
}

const REGISTRATION_FEES = [
  ["Academicians (Faculty)", "10,000", "11,000", "300", "350"],
  ["Industry Professionals", "14,000", "16,000", "425", "450"],
  ["PhD / Research Scholars", "5,000", "6,000", "150", "200"],
  ["Students (UG/PG, full-time)", "3,000", "3,500", "90", "100"],
];

export const LEADERSHIP = [
  {
    name: "Prof (Dr) Mahadeo Jaiswal",
    role: "Conference Patron",
    org: "Director, IIM Sambalpur",
  },
  {
    name: "Prof (Dr) Sushil",
    role: "GIFT Founder President",
    org: "GIFT Society · Emeritus Professor, IIT Delhi",
  },
  {
    name: "Prof (Dr) Seema Gupta",
    role: "Conference Convenor",
    org: "Associate Professor, IIM Sambalpur",
  },
  {
    name: "Prof (Dr) Saumyaranjan Sahoo",
    role: "Conference Co-Convenor",
    org: "Assistant Professor, IIM Sambalpur",
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

export const [FACULTY, POST_DOC, STAFF] = COMMITTEE;

/**
 * One membership type on its own coloured surface. `wide` lays the cards out
 * across a full row; the narrow panels sit two-abreast beside each other.
 */
export function CommitteePanel({
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

export function Avatar({ name, size }: { name: string; size: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-32 w-32 text-3xl" : "h-24 w-24 text-xl";
  const ring = "ring-4 ring-white shadow-md dark:ring-slate-800";
  const photo = PORTRAITS[name];
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        loading="lazy"
        decoding="async"
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
  { href: "/schedule", label: "Conference Schedule" },
  { href: "#fees", label: "Register for conference" },
  { href: "#dates", label: "Important dates" },
  // No nav entry for the advisory: the section on this page carries the four
  // leaders and a link through to the full committee, which keeps the bar to
  // one line at its original wording.
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
      {/* Visit tracking now lives in the root layout, so every public page is
          counted rather than this one alone. */}
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
        {/* ---- Hero + deadline countdown (kept together, above the fold) ---- */}
        <section className="space-y-3">
          {/* The hero is an SVG carousel, so the page's primary keywords need
              a real H1 — screen-reader-only keeps the visual design intact. */}
          <h1 className="sr-only">
            GLOGIFT 2027 — 27th Global Conference on Flexible Systems
            Management: International Conference on AI-Driven Solutions in
            Management. Call for papers, 25–27 February 2027, IIM Sambalpur,
            Odisha, India.
          </h1>
          <Banner />
          <DeadlineCountdown deadlines={DEADLINES} />
        </section>

        {/* ---- 1. About + objectives ----
            Kept in a single section so the pair reads as one screenful
            below the banner rather than straddling two. ---- */}
        <section className="space-y-5">
          <Heading id="about">About GLOGIFT 27</Heading>
          <div className="card card-pad space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              The{" "}
              <strong>
                International Conference on AI-Driven Solutions in Management:
                Flexibility, Digitalisation &amp; Decarbonization
              </strong>{" "}
              (GLOGIFT 27) is jointly organised by
              the Indian Institute of Management Sambalpur and the GIFT Society
              — Global Institute of Flexible Systems Management — at IIM
              Sambalpur, Odisha, from 25 to 27 February 2027. GLOGIFT 2027 is
              an international academic management conference in the GLOGIFT
              series, hosted in India in hybrid (in-person and online) mode.
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
              GLOGIFT 27 asks how artificial intelligence connects the three:
              whether AI-enabled management systems can make enterprises more
              flexible and more sustainable at the same time, rather than
              trading one against the other. The conference brings together
              academicians, researchers, practitioners, policymakers,
              entrepreneurs and students to examine that question across
              finance, operations, marketing, governance and public policy — in
              the context of Industry 5.0 and the Sustainable Development Goals.
            </p>
            {/* A plain crawlable anchor, server-rendered in the page HTML
                rather than behind script, so both search engines and the
                sign-in providers that inspect this page before showing our
                name on their consent screen can find and follow it. It sits
                inside the card so it costs no extra stacked block. */}
            <p className="text-slate-600 dark:text-slate-400">
              Papers are submitted, reviewed and managed through the GLOGIFT 27
              Submission Portal —{" "}
              <a
                href="https://glogift2027.in/login"
                className="font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                about the portal and signing in
              </a>
              .
            </p>
          </div>

          <Heading>The objective of the conference is to</Heading>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {OBJECTIVES.map((o) => (
              <div
                key={o.text}
                className="card card-pad py-4 text-center card-hover"
              >
                <span
                  className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl ${o.tint}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
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
            Publishing outlets — Springer journals &amp; Scopus-indexed series
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            {PUBLICATIONS.map((pub) => {
              const body = (
                <div className="card card-pad card-hover flex gap-4 h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pub.cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
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

            {/* Sits in the outlets grid rather than beside it: the prizes are
                the other thing a Pathway B paper can be worth, and an author
                weighing where the work might land should see both together.
                Seven outlets leave the last row half empty, which is where
                this goes. */}
            <div className="card card-pad card-hover flex gap-4 h-full border-l-4 border-l-amber-400">
              <span
                aria-hidden
                className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-md
                           bg-gradient-to-b from-amber-50 to-amber-100 text-amber-600
                           ring-1 ring-amber-200 dark:from-amber-500/15 dark:to-amber-500/5
                           dark:text-amber-300 dark:ring-amber-500/30"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-9 w-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
                  <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v.8A3.7 3.7 0 0 0 7.7 11H8" />
                  <path d="M16 5h2.5A1.5 1.5 0 0 1 20 6.5v.8A3.7 3.7 0 0 1 16.3 11H16" />
                  <path d="M12 13v3" />
                  <path d="M9 20h6" />
                  <path d="M10.5 16h3l.5 4h-4z" />
                </svg>
              </span>
              <div className="min-w-0">
                <span className="badge bg-amber-100 text-amber-900">
                  Pathway B only
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-2 dark:text-slate-100">
                  Best Paper Awards
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <span>
                    <strong>1st</strong> ₹15,000
                  </span>
                  <span>
                    <strong>2nd</strong> ₹12,000
                  </span>
                  <span>
                    <strong>3rd</strong> ₹10,000
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 dark:text-slate-400">
                  Awarded in every track, for work of exceptional scholarly
                  quality and real contribution to the field.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Special sessions &amp; panels
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ---- 4. Call for papers & submissions ---- */}
        <section>
          <Heading id="submission">Call for papers &amp; submissions</Heading>
          <div className="card card-pad mb-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              We invite original, unpublished research from academicians,
              doctoral scholars and practitioners across the ten conference
              tracks. Begin by submitting a <strong>500-word abstract</strong>{" "}
              under the most relevant track. Interdisciplinary, practice-based
              and policy-oriented work is welcome.
            </p>
            <p className="mt-3">
              Authors whose abstracts are accepted for <PW p="B" /> should
              prepare a double-anonymous full paper using the{" "}
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
                  {highlightPathways(detail)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="text-blue-600">#</span>{" "}
            {highlightPathways(
              "Choosing Pathway B keeps you in the Pathway A (abstract) phase until your abstract is accepted. Even after acceptance, the corresponding author may still return to Pathway A and present on the accepted abstract, or continue to submit the full manuscript under Pathway B."
            )}
          </p>
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0e7490] px-5 py-2.5 shadow-lg sm:px-6">
            {/* accent rule + soft glow for depth */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-400" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Content — centred on mobile, left-aligned on desktop */}
              <div className="text-center sm:text-left">
                <p className="text-sm leading-relaxed text-blue-100">
                  Be part of GLOGIFT 27 — submit a 500-word abstract across ten
                  tracks.
                  <br />
                  We look forward to hosting you on campus, 25–27 February 2027.
                </p>
              </div>
              {/* CTA — on the right */}
              <Link
                href="/login"
                className="shrink-0 rounded-xl !bg-white px-6 py-2.5 text-sm font-bold text-blue-800 shadow transition hover:!bg-blue-50"
              >
                Go to the submission portal →
              </Link>
            </div>
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
            <strong>GIFT Society members</strong> can avail a{" "}
            <strong>{MEMBER_DISCOUNT_PERCENT}% discount on registration fees</strong> only, by
            applying
            the coupon code shared by the conference organizers or the GIFT
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

          {/* Register CTA. Deliberately emerald rather than the blue used by
              the "submission portal" banner above: the two lead to different
              places (paying vs submitting) and a visitor scrolling past should
              not have to read them to tell which is which. */}
          <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#065f46] via-[#0d9488] to-[#0891b2] px-5 py-2.5 shadow-lg sm:px-6">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-400" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-sm leading-relaxed text-emerald-50">
                  Ready to join us? Complete your delegate registration online.
                  <br />
                  Sign in to see the fee that applies to you and pay securely.
                </p>
              </div>
              {/* Sign-in gate is the portal's, not ours: /registration is
                  behind requireProfile, and ?next= carries them straight there
                  once they are in rather than dropping them on a role home. */}
              <Link
                href="/login?next=/registration"
                className="shrink-0 rounded-xl !bg-white px-6 py-2.5 text-sm font-bold text-emerald-800 shadow transition hover:!bg-emerald-50"
              >
                Register for Conference →
              </Link>
            </div>
          </div>
        </section>

        {/* ---- 7. Conference timeline ---- */}
        <section>
          <Heading id="dates">Important dates &amp; submission deadlines</Heading>
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
                            ? "text-slate-400"
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
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {highlightPathways(
                    "Both pathways run identically through the abstract stage — a Pathway B author is on Pathway A until the abstract is accepted (30 Nov 2026). Only then does the faded full-paper stretch begin, which Pathway A skips; at that point a Pathway B author may either continue with the full manuscript or return to Pathway A and present on the accepted abstract. Both pathways rejoin to register and present."
                  )}
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
                        ? "text-slate-400"
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

          <p className="md:hidden mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {highlightPathways(
              "A Pathway B author is on Pathway A until the abstract is accepted (30 Nov 2026); only then does the full-paper stage begin. After acceptance, a Pathway B author may continue with the full manuscript or return to Pathway A and present on the accepted abstract."
            )}
          </p>

          <p className="mt-6 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="text-orange-500">*</span> Full-paper decisions are{" "}
            <strong>targeted for 15 December 2026</strong>, and may take up to
            around <strong>30 days beyond (or even more)</strong> this depending
            on how early the author submits the full paper, reviewer acceptance,
            and the time the Track Editor takes to reach a decision. The
            organisers make every effort to decide by 15 December 2026.{" "}
            <PW p="B" /> authors are therefore advised to submit at the earliest
            and to begin preparing their full paper as soon as they choose{" "}
            <PW p="B" />.
          </p>
        </section>

        {/* ---- 8. Conference advisory ---- */}
        <section>
          <Heading id="committee">Conference advisory</Heading>
          {/* The four leaders always show; the rest of the committee unfolds on
              request, so the list cannot bury the sections beneath it. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEADERSHIP.slice(0, 4).map((p) => (
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

          <AdvisoryReveal>
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
          </AdvisoryReveal>
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
              {/* Directions live right under the address — the empty area the
                  taller right column used to leave here. */}
              <div className="mt-3">
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
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Co-organised with
              </p>
              <p className="text-slate-600 mt-1 dark:text-slate-400">
                GIFT Society — Global Institute of Flexible Systems
                Management
                <br />
                B-51 (Basement), Sarvodaya Enclave, New Delhi 110017
              </p>
              <SocialLinks align="start" className="mt-3" />
            </div>
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

              <Link
                href="/publishing-outlet-guidelines"
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl
                           border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur
                           transition duration-300 hover:-translate-y-0.5 hover:border-violet-300
                           hover:shadow-[0_14px_34px_-14px_rgba(139,92,246,0.65)]
                           dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-violet-500/60"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-400 to-violet-700" />
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50
                                 text-violet-600 transition group-hover:scale-105
                                 dark:bg-violet-500/15 dark:text-violet-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2z" />
                    <path d="M17 7h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                    <path d="M8 7h5M8 11h5" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">
                    Publishing Outlet Guidelines
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    Journals, book series &amp; what each suits
                  </span>
                </span>
                <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition
                     group-hover:translate-x-1 group-hover:text-violet-500 dark:text-slate-600"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ---- IIM Sambalpur video — after Contact, as the closing note ---- */}
        <section aria-labelledby="campus-story">
          <Heading id="campus-story">Discover IIM Sambalpur</Heading>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5 dark:border-slate-700 dark:bg-slate-900">
            <div className="grid items-stretch lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
              {/* Teal, where the rest of the page is blue: this is the host
                  institute speaking about itself, not conference matter, and
                  the panel should read as a different voice. Lighter in the
                  light theme; deepened in the dark theme so it sits in the page
                  instead of glowing out of it. */}
              <div className="flex flex-col justify-center bg-gradient-to-br from-slate-100 via-teal-50 to-slate-200 p-6 text-slate-900 dark:from-slate-900 dark:via-teal-950 dark:to-slate-900 dark:text-slate-100 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-amber-200/90">
                  Host institution
                </p>
                <h2 className="mt-3 font-serif text-2xl font-bold leading-tight sm:text-3xl">
                  The IIM Sambalpur Story
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-teal-100/75">
                  <p>
                    Indian Institute of Management Sambalpur is a new-generation
                    IIM committed to academic excellence, responsible leadership
                    and an inclusive culture of innovation.
                  </p>
                  <p>
                    Watch this short film to discover the Institute&rsquo;s vision,
                    people and learning environment as it welcomes the GLOGIFT 27
                    community to Odisha.
                  </p>
                </div>
                <a
                  href="https://www.youtube.com/watch?v=FOFb0ebu2Vw"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-teal-800/25 bg-white/60 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-white/90 dark:border-teal-200/25 dark:bg-teal-200/10 dark:text-teal-50 dark:hover:bg-teal-200/20"
                >
                  Watch on YouTube
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
              </div>
              <CampusFilmCurtain />
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-700 pt-5 pb-6 text-center text-xs text-slate-500">
          {/* Socials live in the Contact section (under "Co-organised with"),
              so the footer stays a single copyright line. */}
          {/* Separators break onto their own lines on narrow screens rather
              than leaving a bar stranded at the start of a line. */}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            GLOGIFT 27
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
          {/* Policy links. The payment gateway's compliance review requires
              privacy, terms, refund/cancellation and contact to be reachable
              from the public site without signing in — a footer is where a
              cardholder (and a reviewer) looks for them. */}
          <nav className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] lowercase">
            {[
              { href: "/privacy", label: "privacy policy" },
              { href: "/terms", label: "terms and conditions" },
              { href: "/refund-cancellation", label: "refund and cancellation policy" },
              { href: "/contact", label: "contact us" },
            ].map(({ href, label }, i) => (
              <span key={href} className="inline-flex items-center gap-2">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="text-slate-300 dark:text-slate-600"
                  >
                    |
                  </span>
                )}
                <Link
                  href={href}
                  className="text-slate-500 underline underline-offset-2 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                >
                  {label}
                </Link>
              </span>
            ))}
          </nav>
        </footer>
      </div>
      <IkatStrip flip />
      <BackToTop />
      <FaqBot items={[...FAQ_ITEMS, ...TOSHI_KNOWLEDGE]} />
    </main>
  );
}
