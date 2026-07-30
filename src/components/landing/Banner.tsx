"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TRACKS } from "@/components/landing/tracks";

/**
 * The hero banner: a slider of hand-drawn SVG panels at 2400×1000, so every
 * slide stays sharp at any width and can be edited in place. Add a slide by
 * appending a component to SLIDES below — the carousel takes at most five and
 * advances every 20 seconds.
 */
const SLIDE_MS = 20_000;
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

/** Slide 1 — the original navy panel: lattice backdrop, left-aligned text. */
function LatticeSlide() {
  return (
    <svg
      viewBox="0 0 2400 1000"
      className="w-full h-auto block"
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
        GLOGIFT 2027
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
  );
}

/* One glyph per track, in the track's own colour. Drawn at 24x24 with a
   stroke so they stay crisp at the large size the boxes use. */
const TRACK_ICONS: { tint: string; icon: React.ReactNode }[] = [
  {
    // Banknote - finance, FinTech, digital assets.
    tint: "#10b981",
    icon: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 12h.01M18 12h.01" />
      </>
    ),
  },
  {
    // Delivery truck - operations and supply chain.
    tint: "#f59e0b",
    icon: (
      <>
        <path d="M3 16.5V7a1 1 0 0 1 1-1h9v10.5" />
        <path d="M13 10h4l3.5 3.5v3H18" />
        <circle cx="7.5" cy="17.5" r="1.9" />
        <circle cx="16.5" cy="17.5" r="1.9" />
      </>
    ),
  },
  {
    // Cloud with an upward arrow - digital transformation.
    tint: "#0ea5e9",
    icon: (
      <>
        <path d="M6.5 18a4 4 0 0 1 .6-7.95A5.5 5.5 0 0 1 18 10.5a3.75 3.75 0 0 1 0 7.5H6.5Z" />
        <path d="M12 16v-4.5M9.8 13.2 12 11l2.2 2.2" />
      </>
    ),
  },
  {
    // Leaf - sustainable finance and decarbonization.
    tint: "#22c55e",
    icon: (
      <>
        <path d="M4 20c8 2 16-4 16-14 0-1-.2-2-.5-3-9 0-15 5-15 11 0 2 .6 4 1.5 5Z" />
        <path d="m4 20 7-7" />
      </>
    ),
  },
  {
    // Megaphone - marketing and customer engagement.
    tint: "#ec4899",
    icon: (
      <>
        <path d="m3.5 11 13-5.5v13L3.5 13z" />
        <path d="M7 13.2V17a2 2 0 0 0 4 0v-2.6" />
        <path d="M20 9.5v5" />
      </>
    ),
  },
  {
    // Scales - governance, ethics, responsible AI.
    tint: "#6366f1",
    icon: (
      <>
        <path d="M12 3.5v17M7.5 20.5h9M5 7.5h14" />
        <path d="m5 7.5-2.4 5.6a2.9 2.9 0 0 0 4.8 0Z" />
        <path d="m19 7.5-2.4 5.6a2.9 2.9 0 0 0 4.8 0Z" />
      </>
    ),
  },
  {
    // Bar chart - analytics and big data.
    tint: "#8b5cf6",
    icon: (
      <>
        <path d="M3 20.5h18" />
        <path d="M6.5 20.5v-8M11 20.5V6M15.5 20.5v-6M20 20.5v-3.5" />
      </>
    ),
  },
  {
    // Two people - human capital and leadership.
    tint: "#f97316",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.2 20a5.8 5.8 0 0 1 11.6 0" />
        <path d="M16 5.4a3 3 0 0 1 0 5.9" />
        <path d="M20.8 20a5.6 5.6 0 0 0-3.4-4.7" />
      </>
    ),
  },
  {
    // Lightbulb - strategy, innovation, new business models.
    tint: "#ef4444",
    icon: (
      <>
        <path d="M12 3a6 6 0 0 0-3.4 10.9c.6.5.9 1.2.9 1.9v.2h5v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z" />
        <path d="M9.5 19h5M10.5 21.5h3" />
      </>
    ),
  },
  {
    // Globe - inclusive growth and global transformation.
    tint: "#06b6d4",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c3 3.5 3 14.5 0 18-3-3.5-3-14.5 0-18Z" />
      </>
    ),
  },
];

/**
 * Slide 2 - the call for submissions: all ten tracks as boxed cards. Built in
 * HTML rather than SVG so the names wrap on their own; `cqw` units size
 * everything against the banner's own width, keeping it identical in
 * proportion to the SVG panel at any screen size.
 */
function TracksSlide() {
  return (
    <div
      className="relative w-full aspect-[12/5] overflow-hidden
                 bg-[linear-gradient(135deg,#ffffff_0%,#eef2ff_55%,#dbeafe_100%)]"
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute inset-0 flex flex-col px-[2.6cqw] py-[2.2cqw]">
        <div className="text-center">
          <p className="text-gradient text-[3.2cqw] font-extrabold leading-none tracking-tight">
            Call for Submissions
          </p>
          <p className="mt-[0.7cqw] text-[1.35cqw] font-medium text-[#475569]">
            Ten tracks &middot; abstracts and full papers invited &middot; GLOGIFT 2027
          </p>
        </div>

        <div className="mt-[1.6cqw] grid flex-1 grid-cols-5 gap-[0.9cqw]">
          {TRACKS.map(([name], i) => {
            const { tint, icon } = TRACK_ICONS[i];
            return (
              <div
                key={name}
                className="flex flex-col items-center rounded-[1.1cqw] border
                           border-[#dbe3f5] bg-white/80 px-[0.7cqw] py-[0.9cqw] text-center"
              >
                <span
                  className="grid place-items-center rounded-[1.6cqw]"
                  style={{
                    width: "6.4cqw",
                    height: "6.4cqw",
                    backgroundColor: `${tint}1f`,
                    color: tint,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{ width: "4cqw", height: "4cqw" }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {icon}
                  </svg>
                </span>
                <p className="mt-[0.7cqw] text-[1.2cqw] font-semibold leading-tight text-[#0f172a]">
                  {name}
                </p>
              </div>
            );
          })}
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    // Anyone who asks for reduced motion gets a static first slide.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setInterval(
      () => setIndex((i) => (i + 1) % count),
      SLIDE_MS,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused, index]);

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

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
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
