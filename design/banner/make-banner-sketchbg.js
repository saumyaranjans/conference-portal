/* GLOGIFT 27 banner — hand-drawn campus sketch as the background.

   The Koutilya admin-block sketch (perspective variant A) is placed full-size
   into a taller canvas, given a paved forecourt and a hand wobble, and the
   conference text is set into the clear sky at the left. Nothing is cropped:
   the drawing is scaled to leave that column open. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = process.argv[2] || ".";

const W = 1920, H = 860;

const dataUri = (p) =>
  "data:image/png;base64," + fs.readFileSync(path.join(REPO, "public", p)).toString("base64");
const IIM = dataUri("iim-crest.png");
const GIFT = dataUri("glogift-logo.png");

// The sketch was drawn in a 1920x673 frame: building x 938..1906, ground y~600.
// Scale 1.1 and shift so it fills the right of this canvas with the ground at
// y=650, leaving x<800 clear for type and 210px of forecourt below.
const S = 1.1, TX = -232, TY = -10;
const raw = fs.readFileSync(path.join(REPO, "design/banner/building-A.svg"), "utf8");

/* The sketch was drawn as a pale wash. Deepen only the brick so the building
   reads as a coloured drawing rather than a faint outline — element by element,
   so the white glazing and the steel fascias keep their own weight. */
const drawing = raw.replace(/<[^>]*#c2410c[^>]*>/g, (el) =>
  el
    .replace(/fill-opacity="([0-9.]+)"/, (_, o) =>
      `fill-opacity="${Math.min(0.58, parseFloat(o) * 5).toFixed(3)}"`)
    .replace(/ opacity="([0-9.]+)"/, (_, o) =>
      ` opacity="${Math.min(1, parseFloat(o) * 1.5).toFixed(3)}"`)
);

const INK = "#9a3412";

/* Paved forecourt: courses of slabs running to the same vanishing point as the
   building, drawn loosely so it reads as sketched paving rather than a grid. */
function forecourt() {
  const horizon = 648, vpx = 1180;
  const rows = [];
  for (let i = 1; i <= 11; i++) {
    const t = i / 11;
    const y = horizon + Math.pow(t, 1.75) * (H - horizon + 40);
    rows.push(
      `<path d="M${-40 + t * 30} ${y + t * 4} Q ${W / 2} ${y - 6 - t * 5} ${W + 40} ${y + t * 3}" stroke="${INK}" stroke-width="${0.7 + t * 0.9}" opacity="${0.13 + t * 0.16}" fill="none"/>`
    );
  }
  const ribs = [];
  for (let i = -9; i <= 12; i++) {
    const xBottom = vpx + i * 186;
    ribs.push(
      `<path d="M${vpx + i * 26} ${horizon} L${xBottom} ${H + 30}" stroke="${INK}" stroke-width="0.9" opacity="0.14" fill="none"/>`
    );
  }
  return `<g stroke-linecap="round">${rows.join("")}${ribs.join("")}</g>`;
}

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#fdfbf6"/>
      <stop offset="60%" stop-color="#fbf7ee"/>
      <stop offset="100%" stop-color="#f6efe1"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <!-- hand wobble: bends every line just off true -->
    <filter id="hand" x="-3%" y="-3%" width="106%" height="106%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves="3" seed="9" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="tooth" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="5" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
    </filter>
    <!-- the drawing dissolves toward the type instead of stopping at an edge -->
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="24%" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="42%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="softLeft"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#paper)"/>

  <g filter="url(#hand)">
    <g mask="url(#softLeft)">
      <g transform="translate(${TX} ${TY}) scale(${S})">${drawing}</g>
    </g>
    <g mask="url(#softLeft)">${forecourt()}</g>
  </g>

  <rect width="${W}" height="${H}" filter="url(#tooth)" opacity="0.045"/>

  <rect y="0" width="${W}" height="9" fill="url(#accent)"/>
  <rect y="${H - 9}" width="${W}" height="9" fill="url(#accent)"/>

  <!-- organisers -->
  <image xlink:href="${IIM}" x="104" y="52" width="250" height="72" preserveAspectRatio="xMidYMid meet"/>
  <image xlink:href="${GIFT}" x="392" y="52" width="250" height="72" preserveAspectRatio="xMidYMid meet"/>
  <text x="229" y="152" text-anchor="middle" fill="#7c2d12" font-size="19" letter-spacing="5" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="517" y="152" text-anchor="middle" fill="#7c2d12" font-size="19" letter-spacing="5" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <!-- headline -->
  <text x="106" y="288" fill="#1e3a8a" font-size="86" font-weight="800" font-family="${SERIF}" letter-spacing="1">GLOGIFT 27</text>
  <text x="109" y="326" fill="#7c2d12" font-size="22" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="109" y="392" fill="#b45309" font-size="18" letter-spacing="6" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="106" y="442" fill="#0f172a" font-size="35" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="106" y="482" fill="#475569" font-size="25" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <!-- dates -->
  <rect x="106" y="536" width="6" height="92" fill="url(#accent)"/>
  <text x="134" y="576" fill="#1e3a8a" font-size="30" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="134" y="616" fill="#7c2d12" font-size="22" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India</text>
  <text x="134" y="650" fill="#475569" font-size="20" font-family="${SANS}">In-Person | Hybrid  ·  glogift2027.in</text>
</svg>`;

fs.writeFileSync(path.join(OUT, "glogift-27-banner-sketch.svg"), svg, "utf8");
sharp(Buffer.from(svg))
  .png({ quality: 100 })
  .toFile(path.join(OUT, "glogift-27-banner-sketch.png"))
  .then((i) => console.log("PNG:", i.width + "x" + i.height, i.size + " bytes"))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
