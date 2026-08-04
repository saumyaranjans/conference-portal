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
    <svg viewBox="0 0 1000 800" className="w-full h-auto block sm:hidden" role="img"
      aria-label="GLOGIFT 2027 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur">
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

      <rect width="1000" height="800" fill="url(#m-sky)" />
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
        IIM SAMBALPUR · GLOGIFT SOCIETY
      </text>

      <text x="500" y="320" textAnchor="middle" fill="#ffffff" fontSize="96"
        fontWeight="800" fontFamily="Georgia, 'Times New Roman', serif">
        GLOGIFT 27
      </text>
      <text x="500" y="378" textAnchor="middle" fill="#a5b4fc" fontSize="28"
        letterSpacing="6" fontWeight="600" fontFamily="system-ui, sans-serif">
        INTERNATIONAL CONFERENCE ON
      </text>
      <text x="500" y="450" textAnchor="middle" fill="#e0e7ff" fontSize="44"
        fontWeight="600" fontFamily="system-ui, sans-serif">
        AI-Driven Solutions in Management
      </text>
      <text x="500" y="506" textAnchor="middle" fill="#a5b4fc" fontSize="31"
        fontFamily="system-ui, sans-serif">
        Flexibility, Digitalisation &amp; Decarbonization
      </text>

      <rect x="330" y="576" width="340" height="4" fill="url(#m-accent)" />
      <text x="500" y="646" textAnchor="middle" fill="#ffffff" fontSize="42"
        fontWeight="700" fontFamily="system-ui, sans-serif">
        25 – 27 February 2027
      </text>
      <text x="500" y="700" textAnchor="middle" fill="#c7d2fe" fontSize="30"
        fontFamily="system-ui, sans-serif">
        IIM Sambalpur, Odisha, India
      </text>
      <text x="500" y="748" textAnchor="middle" fill="#c7d2fe" fontSize="30"
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
      aria-label="GLOGIFT 2027 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur"
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
        label="GLOGIFT SOCIETY"
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
        y="512"
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
        y="592"
        fill="#e0e7ff"
        fontSize="56"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        AI-Driven Solutions in Management
      </text>
      <text
        x="160"
        y="656"
        fill="#a5b4fc"
        fontSize="40"
        fontFamily="system-ui, sans-serif"
      >
        Flexibility, Digitalisation &amp; Decarbonization
      </text>

      <rect x="160" y="730" width="8" height="150" fill="url(#l-accent)" />
      <text x="200" y="785" fill="#ffffff" fontSize="44" fontWeight="700" fontFamily="system-ui, sans-serif">
        25 – 27 February 2027
      </text>
      <text x="200" y="845" fill="#c7d2fe" fontSize="34" fontFamily="system-ui, sans-serif">
        IIM Sambalpur, Odisha, India · In-Person | Hybrid
      </text>
    </svg>
    </>
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
                 bg-[linear-gradient(120deg,#fff7ed_0%,#ffe4e6_20%,#ede9fe_45%,#dbeafe_70%,#ccfbf1_100%)]"
      style={{ containerType: "inline-size" }}
    >
      {/* Soft colour blooms, for depth behind the cards. */}
      <div className="pointer-events-none absolute -left-[6cqw] -top-[8cqw] h-[26cqw] w-[26cqw] rounded-full bg-[radial-gradient(circle,#f472b666,transparent_70%)]" />
      <div className="pointer-events-none absolute -right-[5cqw] top-[2cqw] h-[24cqw] w-[24cqw] rounded-full bg-[radial-gradient(circle,#38bdf866,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-10cqw] left-[38cqw] h-[28cqw] w-[28cqw] rounded-full bg-[radial-gradient(circle,#fbbf2455,transparent_70%)]" />

      <div className="absolute inset-0 flex flex-col px-[2.4cqw] py-[1.9cqw] sm:py-[1.9cqw]">
        <div className="text-center">
          <p className="text-gradient text-[6cqw] sm:text-[3.1cqw] font-extrabold leading-none tracking-tight">
            Call for Submissions
          </p>
          <p className="mt-[1.4cqw] sm:mt-[0.6cqw] text-[2.9cqw] sm:text-[1.3cqw] font-medium text-[#3f3f6b]">
            Ten tracks &middot; abstracts and full papers invited &middot; GLOGIFT 2027
          </p>
        </div>

        {/* Phones get the tracks named in prose: ten photo cards at this width
            would render the labels at about four pixels. */}
        <div className="sm:hidden flex flex-1 flex-col items-center justify-center px-[4cqw] text-center">
          <p className="text-[3.1cqw] font-semibold leading-relaxed text-[#111c3a]">
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
                className="flex flex-col overflow-hidden rounded-[1.1cqw] border bg-white/90"
                style={{ borderColor: `${tint}66` }}
              >
                <div className="relative w-full" style={{ height: "7.2cqw" }}>
                  {/* Decorative: the track name below already says what this
                      is, so the photo carries no alt text. */}
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                  <span
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent 50%, ${tint}59 100%)`,
                    }}
                  />
                </div>
                <span
                  className="block w-full"
                  style={{ height: "0.35cqw", backgroundColor: tint }}
                />
                <p className="flex-1 px-[0.55cqw] py-[0.65cqw] text-center text-[1.5cqw] lg:text-[1.15cqw] font-semibold leading-tight text-[#111c3a]">
                  {name}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-[2cqw] sm:mt-[1.2cqw] flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-[0.7cqw] rounded-full
                       px-[4cqw] py-[1.8cqw] text-[2.8cqw]
                       sm:px-[2.4cqw] sm:py-[0.95cqw] sm:text-[1.4cqw] font-semibold text-white
                       transition hover:brightness-110"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#2563eb 0%,#7c3aed 45%,#db2777 100%)",
              boxShadow: "0 0.6cqw 1.6cqw -0.5cqw #7c3aedcc",
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
      aria-label="GLOGIFT 2027 banners"
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
