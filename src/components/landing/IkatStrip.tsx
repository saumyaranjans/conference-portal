/**
 * A woven border in the Sambalpuri Ikat (Bandha) idiom — the textile the host
 * region is known for. Three things make that weave recognisable and all three
 * are here: the stepped, "feathered" edge that comes from tie-dyeing the yarn
 * before it is woven, the kumbha (temple) triangles that finish a Sambalpuri
 * border, and the red-black-white palette of a traditional Bandha saree.
 *
 * Drawn as a tiling SVG pattern in user space, so it repeats at its true size
 * across any viewport width instead of stretching.
 */

const TILE = 96; // pattern width in px
const HEIGHT = 26; // strip height in px

/* Sambalpuri Bandha palette. */
const RED = "#7b1113";
const DEEP = "#4a0c0e";
const CREAM = "#f6e7c8";
const GOLD = "#e0a92a";

/**
 * Rows of a stepped diamond, widest in the middle. Returned as rects rather
 * than a path because the staircase — not a smooth edge — is the whole point.
 */
function diamond(cx: number, cy: number, cell: number, rows: number) {
  const half = (rows - 1) / 2;
  return Array.from({ length: rows }, (_, i) => {
    const w = (half - Math.abs(i - half)) * 2 + 1;
    return {
      x: cx - (w * cell) / 2,
      y: cy - (rows * cell) / 2 + i * cell,
      width: w * cell,
      height: cell,
    };
  });
}

export function IkatStrip({ flip }: { flip?: boolean }) {
  const id = flip ? "ikat-b" : "ikat-a";
  return (
    <svg
      width="100%"
      height={HEIGHT}
      className="block"
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern
          id={id}
          x="0"
          y="0"
          width={TILE}
          height={HEIGHT}
          patternUnits="userSpaceOnUse"
          patternTransform={flip ? `rotate(180 ${TILE / 2} ${HEIGHT / 2})` : undefined}
        >
          <rect width={TILE} height={HEIGHT} fill={RED} />

          {/* Kumbha (temple) triangles along the top edge. */}
          <g fill={GOLD}>
            {Array.from({ length: TILE / 12 }, (_, i) => (
              <path key={i} d={`M ${i * 12} 0 H ${i * 12 + 12} L ${i * 12 + 6} 5 Z`} />
            ))}
          </g>
          {/* A selvedge hairline over a plain ground band. */}
          <rect y={HEIGHT - 4} width={TILE} height="1" fill={CREAM} opacity="0.7" />
          <rect y={HEIGHT - 3} width={TILE} height="3" fill={DEEP} />

          {/* Two stepped diamonds per tile: the larger in cream over a darker
              outline, the smaller in gold, as a Bandha border alternates. */}
          <g fill={DEEP}>
            {diamond(26, 14, 2, 7).map((r, i) => (
              <rect key={i} {...r} />
            ))}
          </g>
          <g fill={CREAM}>
            {diamond(26, 14, 2, 5).map((r, i) => (
              <rect key={i} {...r} />
            ))}
          </g>
          <g fill={GOLD}>
            {diamond(70, 14, 2, 5).map((r, i) => (
              <rect key={i} {...r} />
            ))}
          </g>
          <g fill={DEEP}>
            {diamond(70, 14, 2, 1).map((r, i) => (
              <rect key={i} {...r} />
            ))}
          </g>

          {/* Feathered ties between the motifs — the thread-level blur that
              gives ikat its name. */}
          <g fill={CREAM} opacity="0.75">
            {[47, 94].map((x) => (
              <rect key={x} x={x} y="13" width="2" height="2" />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={HEIGHT} fill={`url(#${id})`} />
    </svg>
  );
}
