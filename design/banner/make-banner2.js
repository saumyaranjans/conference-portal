/* GLOGIFT 27 download banner v2 — 1920x673.
   Faithful sketch of the IIM Sambalpur Koutilya (admin) building: low red-brick
   massing, floating entrance canopy on slender columns, IKAT jali screen
   panels, roof fascias, flag mast. Warm ivory "architectural print" theme. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT_DIR = process.argv[2] || ".";

const dataUri = (p) =>
  "data:image/png;base64," + fs.readFileSync(path.join(REPO, "public", p)).toString("base64");

const IIM = dataUri("iim-crest.png");
const GIFT = dataUri("glogift-logo.png");

/* ---------------- building sketch ----------------
   Ground line y=600. Building sits x 950..1900, low + horizontal.
   Ink: terracotta; light brick washes; slate for the canopy + fascias. */

const INK = "#9a3412";      // terracotta ink
const BRICK = "#c2410c";    // brick wash
const SLATE = "#475569";    // steel / fascia

// One jali screen panel (freestanding, perforated lattice) at x, ground y=600.
function jali(x, h = 92, w = 30) {
  const top = 600 - h;
  const lines = [];
  // diamond lattice: diagonals clipped to the panel
  for (let i = -3; i < 7; i++) {
    lines.push(`<path d="M${x + i * 14} ${top} l${h} ${h}" />`);
    lines.push(`<path d="M${x + i * 14 + 14} ${top} l-${h} ${h}" />`);
  }
  return `
  <g stroke="${INK}" stroke-width="1" opacity="0.55">
    <clipPath id="jali${x}"><rect x="${x}" y="${top}" width="${w}" height="${h}"/></clipPath>
    <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${BRICK}" fill-opacity="0.10" stroke="${INK}" stroke-width="1.8"/>
    <g clip-path="url(#jali${x})">${lines.join("")}</g>
  </g>`;
}

// Horizontal brick course hints inside a wall panel.
function courses(x, y, w, h, gap = 9) {
  const out = [];
  for (let yy = y + gap; yy < y + h; yy += gap)
    out.push(`<path d="M${x} ${yy} H${x + w}" stroke="${INK}" stroke-width="0.6" opacity="0.28"/>`);
  return out.join("");
}

// Strip window band with mullions.
function windows(x, y, w, h, n) {
  const step = w / n;
  const mullions = Array.from({ length: n - 1 }, (_, i) =>
    `<path d="M${x + (i + 1) * step} ${y} V${y + h}" stroke="${INK}" stroke-width="1"/>`
  ).join("");
  return `<g opacity="0.8">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" fill-opacity="0.45" stroke="${INK}" stroke-width="1.4"/>
    ${mullions}
  </g>`;
}

const jaliLeft = [956, 998, 1040, 1082, 1124].map((x) => jali(x)).join("");
const jaliRight = [1800, 1842, 1884].map((x) => jali(x, 84)).join("");

const building = `
<g stroke-linecap="round" stroke-linejoin="round">
  <!-- lawn / ground -->
  <path d="M920 600 H1910" stroke="${INK}" stroke-width="2.2" opacity="0.7"/>
  <g stroke="${INK}" stroke-width="1.1" opacity="0.35">
    <path d="M940 616 H1180 M1240 616 H1520 M1590 616 H1900"/>
    <path d="M980 632 H1140 M1300 632 H1460 M1660 632 H1850"/>
  </g>

  <!-- LEFT WING: two-storey brick block -->
  <g>
    <rect x="1170" y="472" width="230" height="128" fill="${BRICK}" fill-opacity="0.14" stroke="${INK}" stroke-width="2"/>
    ${courses(1170, 472, 230, 128)}
    <!-- dark roof fascia -->
    <rect x="1162" y="460" width="246" height="12" fill="${SLATE}" fill-opacity="0.55" stroke="${SLATE}" stroke-width="1.4"/>
    ${windows(1186, 496, 198, 26, 6)}
    ${windows(1186, 548, 198, 26, 6)}
  </g>

  <!-- RIGHT WING: two-storey block -->
  <g>
    <rect x="1560" y="484" width="220" height="116" fill="${BRICK}" fill-opacity="0.14" stroke="${INK}" stroke-width="2"/>
    ${courses(1560, 484, 220, 116)}
    <rect x="1552" y="472" width="236" height="12" fill="${SLATE}" fill-opacity="0.55" stroke="${SLATE}" stroke-width="1.4"/>
    ${windows(1578, 506, 184, 24, 5)}
    ${windows(1578, 554, 184, 24, 5)}
  </g>

  <!-- CENTRAL ENTRANCE PAVILION: floating canopy on slender columns -->
  <g>
    <!-- canopy slab -->
    <rect x="1394" y="398" width="182" height="16" fill="${SLATE}" fill-opacity="0.7" stroke="${SLATE}" stroke-width="1.6"/>
    <path d="M1394 414 H1576" stroke="${SLATE}" stroke-width="1"/>
    <!-- slender columns -->
    <g stroke="${SLATE}" stroke-width="2.6">
      <path d="M1408 414 V600 M1444 414 V600 M1526 414 V600 M1562 414 V600"/>
    </g>
    <!-- recessed double-height glazed entrance -->
    <rect x="1420" y="440" width="130" height="160" fill="#fff" fill-opacity="0.5" stroke="${INK}" stroke-width="1.6"/>
    <g stroke="${INK}" stroke-width="1" opacity="0.85">
      <path d="M1420 480 H1550 M1420 520 H1550 M1420 560 H1550"/>
      <path d="M1452 440 V600 M1485 440 V600 M1518 440 V600"/>
    </g>
    <!-- brick piers beside the entrance -->
    <rect x="1400" y="440" width="20" height="160" fill="${BRICK}" fill-opacity="0.2" stroke="${INK}" stroke-width="1.6"/>
    <rect x="1550" y="440" width="20" height="160" fill="${BRICK}" fill-opacity="0.2" stroke="${INK}" stroke-width="1.6"/>
    <!-- institute board over the entrance -->
    <rect x="1452" y="452" width="66" height="14" fill="${BRICK}" fill-opacity="0.35" stroke="${INK}" stroke-width="1"/>
  </g>

  <!-- FLAG MAST with tricolour -->
  <g>
    <path d="M1330 600 V236" stroke="${SLATE}" stroke-width="2.6"/>
    <circle cx="1330" cy="230" r="3" fill="${SLATE}"/>
    <g stroke="${INK}" stroke-width="0.8">
      <rect x="1330" y="238" width="52" height="10" fill="#f97316" fill-opacity="0.9"/>
      <rect x="1330" y="248" width="52" height="10" fill="#ffffff"/>
      <rect x="1330" y="258" width="52" height="10" fill="#16a34a" fill-opacity="0.85"/>
    </g>
    <circle cx="1356" cy="253" r="3.4" fill="none" stroke="#1e3a8a" stroke-width="1"/>
    <!-- mast base plinth -->
    <rect x="1318" y="588" width="24" height="12" fill="${BRICK}" fill-opacity="0.25" stroke="${INK}" stroke-width="1.4"/>
  </g>

  <!-- IKAT JALI SCREEN PANELS flanking the building -->
  ${jaliLeft}
  ${jaliRight}

  <!-- sketched tree at the left edge -->
  <g stroke="${INK}" stroke-width="1.6" fill="none" opacity="0.6">
    <path d="M930 600 V556 M930 568 l-15 -13 M930 576 l15 -13 M930 556 l-11 -16 M930 556 l11 -16"/>
  </g>
</g>`;

/* ---------------- layout ---------------- */

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="673" viewBox="0 0 1920 673">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fdf8ee"/>
      <stop offset="55%" stop-color="#faf0dd"/>
      <stop offset="100%" stop-color="#f4e4c9"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="40%" stop-color="#c2410c"/>
      <stop offset="75%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <radialGradient id="warmglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="30%" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="52%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="sketchMask"><rect width="1920" height="673" fill="url(#fade)"/></mask>
  </defs>

  <rect width="1920" height="673" fill="url(#paper)"/>
  <circle cx="1500" cy="200" r="430" fill="url(#warmglow)"/>

  <!-- faint ikat diamond motif drifting across the top-right sky -->
  <g stroke="#c2410c" stroke-opacity="0.10" fill="none" stroke-width="1.6">
    ${[ [1240,120],[1330,84],[1420,140],[1510,92],[1600,148],[1690,100],[1780,150],[1860,104] ]
      .map(([x,y]) => `<path d="M${x} ${y} l22 22 l-22 22 l-22 -22 Z"/><path d="M${x} ${y+8} l14 14 l-14 14 l-14 -14 Z"/>`)
      .join("")}
  </g>

  <!-- the campus sketch, fading toward the type -->
  <g mask="url(#sketchMask)">${building}</g>

  <!-- top + bottom accent rules -->
  <rect y="0" width="1920" height="8" fill="url(#accent)"/>
  <rect y="665" width="1920" height="8" fill="url(#accent)"/>

  <!-- organisers (crest keeps its native navy on the light ground) -->
  <image xlink:href="${IIM}" x="116" y="50" width="300" height="86" preserveAspectRatio="xMidYMid meet"/>
  <text x="266" y="176" text-anchor="middle" fill="#7c2d12" font-size="25" letter-spacing="8" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="470" y="176" text-anchor="middle" fill="#9a3412" font-size="25" font-weight="600" font-family="${SANS}">·</text>
  <image xlink:href="${GIFT}" x="524" y="50" width="300" height="86" preserveAspectRatio="xMidYMid meet"/>
  <text x="674" y="176" text-anchor="middle" fill="#7c2d12" font-size="25" letter-spacing="8" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <!-- headline -->
  <text x="118" y="298" fill="#1e3a8a" font-size="98" font-weight="800" font-family="${SERIF}" letter-spacing="2">GLOGIFT 27</text>
  <text x="122" y="342" fill="#7c2d12" font-size="30" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="122" y="404" fill="#b45309" font-size="23" letter-spacing="7" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="118" y="462" fill="#0f172a" font-size="41" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="118" y="508" fill="#475569" font-size="29" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <!-- dates -->
  <rect x="118" y="550" width="6" height="96" fill="url(#accent)"/>
  <text x="148" y="592" fill="#1e3a8a" font-size="33" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="148" y="634" fill="#7c2d12" font-size="25" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India · In-Person | Hybrid</text>
</svg>`;

fs.writeFileSync(path.join(OUT_DIR, "glogift-27-banner-1920x673-v2.svg"), svg, "utf8");
sharp(Buffer.from(svg))
  .png({ quality: 100 })
  .toFile(path.join(OUT_DIR, "glogift-27-banner-1920x673-v2.png"))
  .then((info) => console.log("PNG written:", info.width + "x" + info.height, info.size + " bytes"))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
