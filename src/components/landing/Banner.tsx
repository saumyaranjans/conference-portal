"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { TRACKS } from "@/components/landing/tracks";

/**
 * The hero banner: a slider of hand-drawn SVG panels at 2400×1000, so every
 * slide stays sharp at any width and can be edited in place. Add a slide by
 * appending a component to SLIDES below — the carousel takes at most five and
 * advances every 25 seconds.
 */
const SLIDE_MS = 25_000;
const MAX_SLIDES = 5;

/* Both logos live in /public. The IIM crest is cropped from the full lockup so
   only the mark shows, never the wordmark beside it. */
const IIM_CREST = "/iim-crest.png";
const GLOGIFT_LOGO = "/glogift-logo.png";
// WebP: the PNG was 2.74MB for a 1774x887 image in the hero carousel,
// which every visitor downloaded before the page settled. Same picture, 267KB.
const WEEK2_THEME_ART = "/banners/week-2-theme.webp";

/* The crest is navy artwork; on the dark panels it is flipped to solid white
   the same way the header logo is (see `.iim-adaptive` in globals.css). */
const CREST_WHITE = { filter: "brightness(0) invert(1)" } as const;

/**
 * One organiser: its logo sitting directly above its name. The image is given
 * a fixed box and centred inside it, so the two logos line up on their labels
 * whatever their aspect ratios are.
 */
function Organiser({
  logo,
  label,
  cx,
  top,
  size,
  baseline,
  fill,
  invert,
}: {
  logo: string;
  label: string;
  cx: number;
  top: number;
  size: number;
  baseline: number;
  fill: string;
  invert?: boolean;
}) {
  return (
    <g>
      <image
        href={logo}
        x={cx - 150}
        y={top}
        width={300}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        style={invert ? CREST_WHITE : undefined}
      />
      <text
        x={cx}
        y={baseline}
        textAnchor="middle"
        fill={fill}
        fontSize="34"
        letterSpacing="10"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Slide 1 on a phone: the same panel redrawn in a 5:4 box with everything
 * centred, so the type is legible instead of being the desktop layout shrunk
 * to a quarter of its size.
 */
function LatticeSlideMobile() {
  return (
    <svg viewBox="0 0 1000 856" className="w-full h-auto block sm:hidden" role="img"
      aria-label="GLOGIFT 27 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur">
      <defs>
        <linearGradient id="m-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="45%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <linearGradient id="m-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#818cf8" />
          <stop offset="70%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="m-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1000" height="856" fill="url(#m-sky)" />
      <circle cx="820" cy="140" r="330" fill="url(#m-glow)" />
      <circle cx="140" cy="700" r="280" fill="url(#m-glow)" opacity="0.6" />
      <g stroke="#93c5fd" strokeOpacity="0.2" strokeWidth="2" fill="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <path key={i} d={`M ${60 + i * 220} 800 C ${200 + i * 220} ${560 - i * 30}, ${
            20 + i * 220} ${300 + i * 24}, ${140 + i * 220} 0`} />
        ))}
      </g>
      <rect y="0" width="1000" height="8" fill="url(#m-accent)" />

      <image href={IIM_CREST} x="360" y="48" width="110" height="92"
        preserveAspectRatio="xMidYMid meet" style={CREST_WHITE} />
      <image href={GLOGIFT_LOGO} x="520" y="48" width="120" height="92"
        preserveAspectRatio="xMidYMid meet" />
      <text x="500" y="190" textAnchor="middle" fill="#bfdbfe" fontSize="28"
        letterSpacing="4" fontWeight="600" fontFamily="system-ui, sans-serif">
        IIM SAMBALPUR · GIFT SOCIETY
      </text>

      <text x="500" y="320" textAnchor="middle" fill="#ffffff" fontSize="96"
        fontWeight="800" fontFamily="Georgia, 'Times New Roman', serif">
        GLOGIFT 27
      </text>
      <text x="500" y="374" textAnchor="middle" fill="#c7d2fe" fontSize="24"
        fontFamily="Georgia, 'Times New Roman', serif">
        Twenty Seventh Global Conference on Flexible Systems Management
      </text>
      <text x="500" y="434" textAnchor="middle" fill="#a5b4fc" fontSize="28"
        letterSpacing="6" fontWeight="600" fontFamily="system-ui, sans-serif">
        INTERNATIONAL CONFERENCE ON
      </text>
      <text x="500" y="506" textAnchor="middle" fill="#e0e7ff" fontSize="44"
        fontWeight="600" fontFamily="system-ui, sans-serif">
        AI-Driven Solutions in Management
      </text>
      <text x="500" y="562" textAnchor="middle" fill="#a5b4fc" fontSize="31"
        fontFamily="system-ui, sans-serif">
        Flexibility, Digitalisation &amp; Decarbonization
      </text>

      <rect x="330" y="632" width="340" height="4" fill="url(#m-accent)" />
      <text x="500" y="702" textAnchor="middle" fill="#ffffff" fontSize="42"
        fontWeight="700" fontFamily="system-ui, sans-serif">
        25 – 27 February 2027
      </text>
      <text x="500" y="756" textAnchor="middle" fill="#c7d2fe" fontSize="30"
        fontFamily="system-ui, sans-serif">
        IIM Sambalpur, Odisha, India
      </text>
      <text x="500" y="804" textAnchor="middle" fill="#c7d2fe" fontSize="30"
        fontFamily="system-ui, sans-serif">
        In-Person | Hybrid
      </text>
    </svg>
  );
}

/** Slide 1 — the original navy panel: lattice backdrop, left-aligned text. */
function LatticeSlide() {
  return (
    <>
    <LatticeSlideMobile />
    <svg
      viewBox="0 0 2400 1000"
      className="w-full h-auto hidden sm:block"
      role="img"
      aria-label="GLOGIFT 27 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur"
    >
      <defs>
        <linearGradient id="l-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="45%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
        <linearGradient id="l-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#818cf8" />
          <stop offset="70%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="l-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="2400" height="1000" fill="url(#l-sky)" />
      <circle cx="1950" cy="240" r="520" fill="url(#l-glow)" />
      <circle cx="380" cy="880" r="420" fill="url(#l-glow)" opacity="0.6" />

      {/* A light network lattice — AI without the clichés. */}
      <g stroke="#93c5fd" strokeOpacity="0.22" strokeWidth="2" fill="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M ${120 + i * 260} 1000 C ${300 + i * 260} ${700 - i * 40}, ${
              60 + i * 260
            } ${380 + i * 30}, ${240 + i * 260} 0`}
          />
        ))}
      </g>
      <g fill="#bfdbfe" fillOpacity="0.5">
        {[
          [300, 300], [640, 180], [980, 340], [1320, 200], [1660, 300],
          [2000, 170], [460, 620], [860, 700], [1240, 620], [1620, 720],
          [1980, 640], [2200, 420],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 7 : 4} />
        ))}
      </g>

      <rect y="0" width="2400" height="10" fill="url(#l-accent)" />

      <Organiser
        logo={IIM_CREST}
        label="IIM SAMBALPUR"
        cx={360}
        top={96}
        size={118}
        baseline={278}
        fill="#bfdbfe"
        invert
      />
      <text
        x="630"
        y="278"
        textAnchor="middle"
        fill="#bfdbfe"
        fontSize="34"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        ·
      </text>
      <Organiser
        logo={GLOGIFT_LOGO}
        label="GIFT SOCIETY"
        cx={900}
        top={96}
        size={118}
        baseline={278}
        fill="#bfdbfe"
      />

      <text
        x="160"
        y="440"
        fill="#ffffff"
        fontSize="132"
        fontWeight="800"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing="2"
      >
        GLOGIFT 27
      </text>

      <text
        x="164"
        y="500"
        fill="#c7d2fe"
        fontSize="42"
        fontWeight="500"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        Twenty Seventh Global Conference on Flexible Systems Management
      </text>

      <text
        x="164"
        y="588"
        fill="#a5b4fc"
        fontSize="32"
        letterSpacing="9"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        INTERNATIONAL CONFERENCE ON
      </text>
      <text
        x="160"
        y="668"
        fill="#e0e7ff"
        fontSize="56"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        AI-Driven Solutions in Management
      </text>
      <text
        x="160"
        y="732"
        fill="#a5b4fc"
        fontSize="40"
        fontFamily="system-ui, sans-serif"
      >
        Flexibility, Digitalisation &amp; Decarbonization
      </text>

      <rect x="160" y="806" width="8" height="132" fill="url(#l-accent)" />
      <text x="200" y="861" fill="#ffffff" fontSize="44" fontWeight="700" fontFamily="system-ui, sans-serif">
        25 – 27 February 2027
      </text>
      <text x="200" y="921" fill="#c7d2fe" fontSize="34" fontFamily="system-ui, sans-serif">
        IIM Sambalpur, Odisha, India · In-Person | Hybrid
      </text>
    </svg>
    </>
  );
}

/** Slide 2 — Week 2 campaign creative, adapted from the social carousel. */
function Week2ThemeSlide() {
  return (
    <div
      className="relative w-full aspect-[5/4] sm:aspect-[12/5] overflow-hidden
                 bg-[linear-gradient(125deg,#06162f_0%,#123d72_48%,#3b2478_100%)]"
      style={{ containerType: "inline-size" }}
      role="img"
      aria-label="GLOGIFT 27 conference theme — Flexibility, Digitalisation and Decarbonization"
    >
      <div className="absolute inset-x-0 top-0 h-[0.45cqw] bg-[linear-gradient(90deg,#38bdf8,#818cf8,#f472b6,#fbbf24)]" />
      <div className="pointer-events-none absolute -left-[10cqw] top-[2cqw] h-[35cqw] w-[35cqw] rounded-full bg-[radial-gradient(circle,#0ea5e955,transparent_68%)]" />
      <div className="pointer-events-none absolute -right-[8cqw] top-[4cqw] h-[32cqw] w-[32cqw] rounded-full bg-[radial-gradient(circle,#f472b644,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-15cqw] left-[34cqw] h-[30cqw] w-[30cqw] rounded-full bg-[radial-gradient(circle,#fbbf2433,transparent_68%)]" />

      <div className="absolute inset-x-[4cqw] top-[2.2cqw] text-center">
        <div className="text-center">
          <p className="font-serif text-[5.8cqw] sm:text-[3.3cqw] font-extrabold leading-none text-white">GLOGIFT 27</p>
          <p className="mt-[1.2cqw] text-[3.5cqw] sm:text-[1.55cqw] font-black leading-none tracking-[0.2em] text-[#fbbf24]">CONFERENCE THEME</p>
        </div>
      </div>

      {/* Headline and strapline share ONE positioned block and stack in normal
          flow inside it. Given a `top` each, the headline wrapped to two lines
          on a narrow screen and grew straight through the strapline below —
          absolute positioning cannot know how tall the text above it became. */}
      <div className="absolute inset-x-[3cqw] top-[18cqw] sm:top-[8.2cqw] text-center">
        <p className="font-serif text-[6.2cqw] sm:text-[2.8cqw] font-extrabold leading-tight text-white">
          Three words. Three management questions.
        </p>
        <p className="mt-[1.5cqw] sm:mt-[0.7cqw] text-[3.4cqw] sm:text-[1.35cqw] font-bold text-[#bfdbfe]">
          Flexibility · Digitalisation · Decarbonization
        </p>
      </div>

      <img
        src={WEEK2_THEME_ART}
        alt="Illustrations representing flexibility, digitalisation and decarbonization"
        // Slide 2 of a carousel that opens on slide 1 and turns after 25s, so
        // this need not be fetched before first paint. It was the only eager
        // image left on the landing page.
        loading="lazy"
        decoding="async"
        className="absolute inset-x-0 top-[34cqw] sm:top-[16.8cqw] h-[38cqw] sm:h-[16cqw] w-full object-cover object-[center_42%]
                   saturate-[0.78] contrast-[1.08] brightness-[0.72]"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-[34cqw] sm:top-[16.8cqw] h-[38cqw] sm:h-[16cqw]
                   bg-[linear-gradient(90deg,#0f172a99,#1e3a8a88,#312e8199)] mix-blend-color"
      />

      <div className="absolute inset-x-[2.2cqw] bottom-[1.5cqw] grid grid-cols-3 gap-[1cqw] text-center">
        {[
          ["Flexibility", "Adaptability is not automation.", "Does AI make the organisation more adaptable—or simply automate what is already rigid?"],
          ["Digitalisation", "Accuracy is only the beginning.", "Who remains accountable when an AI recommendation becomes a management decision?"],
          ["Decarbonization", "Count both halves of the ledger.", "Can AI reduce emissions while we account honestly for the energy it consumes?"],
        ].map(([theme, dilemma, question]) => (
          <div key={theme} className="border-t border-[#93c5fd]/45 px-[1cqw] pt-[0.8cqw]">
            <p className="text-[2.35cqw] sm:text-[0.82cqw] font-extrabold uppercase tracking-[0.08em] text-[#fbbf24]">{theme}</p>
            <p className="mt-[0.3cqw] font-serif text-[2.25cqw] sm:text-[1cqw] font-bold leading-tight text-[#dbeafe]">{dilemma}</p>
            <p className="mt-[0.5cqw] font-serif text-[1.9cqw] sm:text-[0.72cqw] font-medium italic leading-[1.25] text-white/90">
              “{question}”
            </p>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[0.45cqw] bg-[linear-gradient(90deg,#38bdf8,#818cf8,#f472b6,#fbbf24)]" />
    </div>
  );
}

/* One photograph per track, in TRACKS order, each paired with the accent
   colour used for its card. The images are CC0 / public domain; provenance is
   recorded in docs/track-photos.md. */
const TRACK_ART: { tint: string; photo: string }[] = [
  { tint: "#10b981", photo: "/tracks/finance.jpg" },
  { tint: "#f59e0b", photo: "/tracks/operations.jpg" },
  { tint: "#0ea5e9", photo: "/tracks/digital.jpg" },
  { tint: "#22c55e", photo: "/tracks/sustainability.jpg" },
  { tint: "#ec4899", photo: "/tracks/marketing.jpg" },
  { tint: "#6366f1", photo: "/tracks/governance.jpg" },
  { tint: "#8b5cf6", photo: "/tracks/analytics.jpg" },
  { tint: "#f97316", photo: "/tracks/people.jpg" },
  { tint: "#ef4444", photo: "/tracks/strategy.jpg" },
  { tint: "#06b6d4", photo: "/tracks/global.jpg" },
];

/**
 * Slide 2 - the call for submissions: all ten tracks as boxed cards, each in
 * its own colour, over a multi-hue wash. Built in HTML rather than SVG so the
 * names wrap on their own; `cqw` units size everything against the banner's
 * own width, keeping it identical in proportion to the SVG panel at any
 * screen size.
 */
function TracksSlide() {
  return (
    <div
      className="relative w-full aspect-[5/4] sm:aspect-[12/5] overflow-hidden
                 bg-[linear-gradient(125deg,#07152f_0%,#102a62_38%,#312e81_68%,#701a75_100%)]"
      style={{ containerType: "inline-size" }}
    >
      {/* Colour blooms and a fine technical grid add depth without competing
          with the track photography. */}
      <div className="pointer-events-none absolute -left-[8cqw] -top-[12cqw] h-[34cqw] w-[34cqw] rounded-full bg-[radial-gradient(circle,#0ea5e988,transparent_68%)]" />
      <div className="pointer-events-none absolute -right-[7cqw] -top-[4cqw] h-[31cqw] w-[31cqw] rounded-full bg-[radial-gradient(circle,#ec489977,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-15cqw] left-[34cqw] h-[34cqw] w-[34cqw] rounded-full bg-[radial-gradient(circle,#f59e0b55,transparent_68%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#93c5fd33 1px,transparent 1px),linear-gradient(90deg,#93c5fd33 1px,transparent 1px)",
          backgroundSize: "3.2cqw 3.2cqw",
          maskImage: "linear-gradient(to bottom,black,transparent 78%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[0.45cqw] bg-[linear-gradient(90deg,#38bdf8,#818cf8,#f472b6,#fbbf24)]" />

      <div className="absolute inset-0 flex flex-col px-[2.4cqw] py-[1.9cqw] sm:py-[1.9cqw]">
        <div className="text-center">
          <div className="inline-flex items-center gap-[1cqw]">
            <span className="hidden sm:block h-px w-[6cqw] bg-[linear-gradient(90deg,transparent,#fbbf24)]" />
            <p className="text-[6cqw] sm:text-[3.15cqw] font-extrabold leading-none tracking-tight text-white [text-shadow:0_0.35cqw_1.2cqw_#02061799]">
              Call for <span className="text-[#fbbf24]">Papers</span>
            </p>
            <span className="hidden sm:block h-px w-[6cqw] bg-[linear-gradient(90deg,#fbbf24,transparent)]" />
          </div>
          <p className="mt-[1.4cqw] sm:mt-[0.65cqw] text-[2.9cqw] sm:text-[1.28cqw] font-medium tracking-wide text-[#dbeafe]">
            Ten future-facing tracks <span className="mx-[0.65cqw] text-[#fbbf24]">&bull;</span>
            Abstracts and full papers invited <span className="mx-[0.65cqw] text-[#fbbf24]">&bull;</span>
            GLOGIFT 27
          </p>
        </div>

        {/* Phones get the tracks named in prose: ten photo cards at this width
            would render the labels at about four pixels. */}
        <div className="sm:hidden flex flex-1 flex-col items-center justify-center px-[4cqw] text-center">
          <p className="text-[3.1cqw] font-semibold leading-relaxed text-white [text-shadow:0_0.2cqw_0.8cqw_#020617]">
            Finance &amp; FinTech &middot; Operations &amp; Supply Chain &middot;
            Digital Transformation &middot; Sustainable Finance &middot;
            Marketing &middot; Governance &amp; Ethics &middot; Analytics &amp;
            Big Data &middot; Human Capital &middot; Strategy &amp; Innovation
            &middot; Inclusive Growth
          </p>
        </div>

        <div className="hidden sm:grid mt-[1.3cqw] flex-1 grid-cols-5 gap-[0.85cqw]">
          {TRACKS.map(([name], i) => {
            const { tint, photo } = TRACK_ART[i];
            return (
              <div
                key={name}
                className="group relative flex flex-col overflow-hidden rounded-[1.05cqw] border bg-[#07152fcc]
                           shadow-[0_0.8cqw_1.8cqw_-0.9cqw_#020617] backdrop-blur-sm
                           transition duration-300 hover:-translate-y-[0.18cqw] hover:brightness-110"
                style={{ borderColor: `${tint}aa` }}
              >
                <div className="relative w-full overflow-hidden" style={{ height: "7.4cqw" }}>
                  {/* Decorative: the track name below already says what this
                      is, so the photo carries no alt text. */}
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover saturate-[1.15] contrast-[1.05] transition duration-500 group-hover:scale-105"
                  />
                  <span
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent 32%, #07152f44 62%, ${tint}aa 125%)`,
                    }}
                  />
                  <span
                    className="absolute left-[0.55cqw] top-[0.5cqw] grid h-[2cqw] min-w-[2cqw] place-items-center rounded-full border border-white/50 bg-[#07152fdd] px-[0.4cqw] text-[0.9cqw] font-bold text-white shadow-lg"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span
                  className="block w-full"
                  style={{ height: "0.35cqw", backgroundColor: tint }}
                />
                <p className="flex flex-1 items-center justify-center px-[0.6cqw] py-[0.62cqw] text-center text-[1.5cqw] lg:text-[1.12cqw] font-semibold leading-tight text-white">
                  {name}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-[2cqw] sm:mt-[1.2cqw] flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-[0.7cqw] rounded-full border border-[#fde68a99]
                       px-[4cqw] py-[1.8cqw] text-[2.8cqw]
                       sm:px-[2.4cqw] sm:py-[0.88cqw] sm:text-[1.35cqw] font-bold text-[#172554]
                       transition hover:scale-[1.02] hover:brightness-110"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#fbbf24 0%,#fb923c 52%,#f472b6 100%)",
              boxShadow: "0 0.7cqw 2cqw -0.5cqw #f59e0bcc",
            }}
          >
            Submit through the portal
            <svg
              viewBox="0 0 24 24"
              className="w-[3cqw] h-[3cqw] sm:w-[1.5cqw] sm:h-[1.5cqw]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Up to five. Anything beyond MAX_SLIDES is ignored rather than silently
   lengthening the rotation. */
const SLIDES: { key: string; label: string; render: () => React.ReactNode }[] = [
  { key: "lattice", label: "Navy lattice", render: () => <LatticeSlide /> },
  { key: "week-2-theme", label: "Week 2 conference theme", render: () => <Week2ThemeSlide /> },
  { key: "tracks", label: "Call for submissions", render: () => <TracksSlide /> },
].slice(0, MAX_SLIDES);

export function Banner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = SLIDES.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    // Anyone who asks for reduced motion gets a static first slide.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Each tick steps to the next slide and wraps past the last one back to
    // the first. `index` is deliberately not a dependency: the interval runs
    // uninterrupted rather than being torn down and restarted every slide.
    const id = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg"
      role="region"
      aria-roledescription="carousel"
      aria-label="GLOGIFT 27 banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            className="w-full shrink-0"
            aria-hidden={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {s.render()}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center
                       rounded-full bg-black/25 text-white backdrop-blur-sm transition
                       hover:bg-black/45 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center
                       rounded-full bg-black/25 text-white backdrop-blur-sm transition
                       hover:bg-black/45 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Bottom-right rather than centred, so they never crowd a slide's
              own call to action. */}
          <div className="absolute bottom-3 right-4 flex gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show banner ${i + 1}: ${s.label}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all focus:outline-none
                            focus:ring-2 focus:ring-white/70 ${
                              i === index
                                ? "w-7 bg-white"
                                : "w-2.5 bg-white/50 hover:bg-white/80"
                            }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
