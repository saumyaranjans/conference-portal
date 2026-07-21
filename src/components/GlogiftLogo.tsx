/**
 * Original GLOGIFT 2027 emblem — an interlocking-rings mark standing for the
 * conference's three pillars (Flexibility · Digitalisation · Decarbonization).
 * Self-contained SVG so it stays crisp at any size and in any theme.
 */
export function GlogiftMark({
  className = "",
  id = "glogift",
}: {
  className?: string;
  id?: string;
}) {
  const grad = `${id}-grad`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="GLOGIFT 2027"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${grad})`} />
      <g fill="none" stroke="#ffffff" strokeWidth="2.75">
        <circle cx="26" cy="27" r="11" opacity="0.95" />
        <circle cx="38" cy="27" r="11" opacity="0.85" />
        <circle cx="32" cy="38" r="11" opacity="0.7" />
      </g>
    </svg>
  );
}

/** Horizontal lockup: emblem + GLOGIFT 2027 wordmark. `light` for dark panels. */
export function GlogiftLockup({
  light = false,
  className = "",
  id = "glogift-lockup",
}: {
  light?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <GlogiftMark id={id} className="h-11 w-11 shrink-0" />
      <div className="leading-tight">
        <div
          className={`font-bold tracking-tight text-xl ${
            light ? "text-white" : "text-slate-900"
          }`}
        >
          GLOGIFT<span className="font-semibold"> 2027</span>
        </div>
        <div
          className={`text-[11px] ${light ? "text-white/70" : "text-slate-500"}`}
        >
          Global Institute of Flexible Systems Management
        </div>
      </div>
    </div>
  );
}
