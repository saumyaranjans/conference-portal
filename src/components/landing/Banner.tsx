/**
 * The hero banner, drawn rather than photographed: an SVG at 2400×1000 that
 * stays sharp at any width and can be edited in place. Swap the whole
 * component for an <Image> if a designed artwork arrives later.
 */
export function Banner() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
      <svg
        viewBox="0 0 2400 1000"
        className="w-full h-auto block"
        role="img"
        aria-label="GLOGIFT 2027 — International Conference on AI-Driven Solutions in Management, 25 to 27 February 2027, IIM Sambalpur"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="45%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#818cf8" />
            <stop offset="70%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="2400" height="1000" fill="url(#sky)" />
        <circle cx="1950" cy="240" r="520" fill="url(#glow)" />
        <circle cx="380" cy="880" r="420" fill="url(#glow)" opacity="0.6" />

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

        <rect y="0" width="2400" height="10" fill="url(#accent)" />

        <text
          x="160"
          y="330"
          fill="#bfdbfe"
          fontSize="34"
          letterSpacing="10"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          IIM SAMBALPUR · GLOGIFT SOCIETY
        </text>

        <text
          x="160"
          y="470"
          fill="#ffffff"
          fontSize="132"
          fontWeight="800"
          fontFamily="Georgia, 'Times New Roman', serif"
          letterSpacing="2"
        >
          GLOGIFT 2027
        </text>

        <text
          x="160"
          y="580"
          fill="#e0e7ff"
          fontSize="52"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          AI-Driven Solutions in Management
        </text>
        <text
          x="160"
          y="650"
          fill="#a5b4fc"
          fontSize="42"
          fontFamily="system-ui, sans-serif"
        >
          Flexibility, Digitalisation &amp; Decarbonization
        </text>

        <rect x="160" y="720" width="8" height="150" fill="url(#accent)" />
        <text x="200" y="775" fill="#ffffff" fontSize="44" fontWeight="700" fontFamily="system-ui, sans-serif">
          25 – 27 February 2027
        </text>
        <text x="200" y="835" fill="#c7d2fe" fontSize="34" fontFamily="system-ui, sans-serif">
          IIM Sambalpur, Odisha, India · In-Person | Hybrid
        </text>
      </svg>
    </div>
  );
}
