"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/** Slide 2 — light and centred, with a circuit-trace backdrop. */
function CircuitSlide() {
  /* Traces fanning in from the edge, drawn as right-angled runs the way a
     board is actually routed. */
  const traces = Array.from({ length: 7 }, (_, i) => {
    const y = 140 + i * 120;
    const bend = 620 + (i % 3) * 90;
    return { d: `M 0 ${y} H ${bend} V 500`, key: `l${i}` };
  });

  return (
    <svg
      viewBox="0 0 2400 1000"
      className="w-full h-auto block"
      role="img"
      aria-label="GLOGIFT 2027 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur"
    >
      <defs>
        <linearGradient id="c-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="c-word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="35%" stopColor="#0891b2" />
          <stop offset="70%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>

      <rect width="2400" height="1000" fill="url(#c-bg)" />

      <g stroke="#93c5fd" strokeOpacity="0.55" strokeWidth="3" fill="none">
        {traces.map((t) => (
          <path key={t.key} d={t.d} />
        ))}
        {traces.map((t) => (
          <path
            key={`${t.key}r`}
            d={t.d}
            transform="translate(2400,1000) rotate(180)"
          />
        ))}
      </g>
      <g fill="#60a5fa" fillOpacity="0.5">
        {traces.map((t, i) => (
          <circle key={t.key} cx={0} cy={140 + i * 120} r="9" />
        ))}
      </g>

      <Organiser
        logo={IIM_CREST}
        label="IIM SAMBALPUR"
        cx={920}
        top={90}
        size={110}
        baseline={262}
        fill="#1e3a8a"
      />
      <text
        x="1185"
        y="262"
        textAnchor="middle"
        fill="#1e3a8a"
        fontSize="34"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        ·
      </text>
      <Organiser
        logo={GLOGIFT_LOGO}
        label="GLOGIFT SOCIETY"
        cx={1450}
        top={90}
        size={110}
        baseline={262}
        fill="#1e3a8a"
      />

      <text
        x="1200"
        y="420"
        textAnchor="middle"
        fill="#4f46e5"
        fontSize="34"
        letterSpacing="12"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        INTERNATIONAL CONFERENCE ON
      </text>
      <text
        x="1200"
        y="530"
        textAnchor="middle"
        fill="#0f172a"
        fontSize="88"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        AI-Driven Solutions in Management
      </text>
      <text
        x="1200"
        y="600"
        textAnchor="middle"
        fill="#475569"
        fontSize="40"
        fontFamily="system-ui, sans-serif"
      >
        Flexibility, Digitalisation &amp; Decarbonization
      </text>

      <text
        x="1200"
        y="760"
        textAnchor="middle"
        fill="url(#c-word)"
        fontSize="116"
        fontWeight="800"
        fontFamily="Georgia, 'Times New Roman', serif"
        letterSpacing="2"
      >
        GLOGIFT 2027
      </text>

      <line x1="820" y1="820" x2="1580" y2="820" stroke="#c7d2fe" strokeWidth="3" />
      <text
        x="1200"
        y="890"
        textAnchor="middle"
        fill="#1e293b"
        fontSize="38"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        25 – 27 February 2027 · IIM Sambalpur, Odisha, India · In-Person | Hybrid
      </text>
    </svg>
  );
}

/* Up to five. Anything beyond MAX_SLIDES is ignored rather than silently
   lengthening the rotation. */
const SLIDES: { key: string; label: string; render: () => React.ReactNode }[] = [
  { key: "lattice", label: "Navy lattice", render: () => <LatticeSlide /> },
  { key: "circuit", label: "Light circuit", render: () => <CircuitSlide /> },
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
