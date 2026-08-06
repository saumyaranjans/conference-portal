/* GLOGIFT 27 banner — PENCIL SKETCH edition, 1920x673.
   Same layout and same drawing (perspective sketch A of the Koutilya admin
   building), re-rendered as graphite on sketchbook paper: colours remapped to
   pencil greys, multi-pass "searching" strokes, hatched shading, paper tooth.

   Usage: node make-banner-pencil.js <outDir>   -> writes both variants:
     glogift-27-banner-pencil.{svg,png}          (pure graphite)
     glogift-27-banner-pencil-tinted.{svg,png}   (graphite, flag hand-tinted) */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT_DIR = process.argv[2] || ".";

const dataUri = (p) =>
  "data:image/png;base64," + fs.readFileSync(path.join(REPO, "public", p)).toString("base64");

const IIM = dataUri("iim-crest.png");
const GIFT = dataUri("glogift-logo.png");

const RAW = fs.readFileSync(path.join(REPO, "design/banner/building-A.svg"), "utf8");

/* Graphite is never pure black — it is a cool grey that sits lighter than ink,
   with the hardest pressure saved for structure (fascias, columns). */
const PENCIL = {
  "#9a3412": "#4a4a52", // main contour ink -> HB
  "#475569": "#2b2b31", // steel / fascia   -> 4B, pressed hard
  "#c2410c": "#8b8b93", // brick wash       -> 2H, soft tone
  "#1e3a8a": "#3c3c44", // chakra
};
const FLAG_GREY = { "#f97316": "#6e6e77", "#16a34a": "#585860" };

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/* Hand-drawn tone: a block of graphite is laid down as strokes, not as a flat
   fill, so shaded planes get a hatch overlay instead of a solid wash. */
function hatch(x, y, w, h, op = 0.13, id = "h") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})" opacity="${op}"/>`;
}

function build({ tintFlag }) {
  let frag = RAW;
  const map = tintFlag ? PENCIL : { ...PENCIL, ...FLAG_GREY };
  for (const [from, to] of Object.entries(map)) frag = frag.split(from).join(to);

  // A pencil line is never laid down once: the hand searches, so contours read
  // as two or three near-coincident passes.
  const pass = (dx, dy, rot, op) =>
    `<g transform="translate(${dx} ${dy}) rotate(${rot} 1420 480)" opacity="${op}">${frag}</g>`;

  const drawing = `
    <g filter="url(#graphite)">
      ${pass(1.7, 1.2, 0.10, 0.30)}
      ${pass(-1.3, -0.8, -0.08, 0.24)}
      ${pass(0, 0, 0, 0.95)}
    </g>
    <!-- shading passes: cast shadow under the canopy, the shaded right cheek of
         the entrance block, the recessed wings, and the ground shadow -->
    <g>
      ${hatch(1152, 424, 196, 52, 0.17, "hatchA")}
      ${hatch(1300, 430, 48, 168, 0.11, "hatchA")}
      ${hatch(944, 500, 204, 100, 0.07, "hatchB")}
      ${hatch(1362, 512, 344, 78, 0.08, "hatchB")}
      ${hatch(1706, 536, 196, 46, 0.06, "hatchB")}
      <!-- ground shadow, dragged out to the right away from the light -->
      ${hatch(950, 598, 960, 26, 0.14, "hatchC")}
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="673" viewBox="0 0 1920 673">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fcfaf6"/>
      <stop offset="55%" stop-color="#f7f4ec"/>
      <stop offset="100%" stop-color="#efeade"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3f3f46"/>
      <stop offset="45%" stop-color="#71717a"/>
      <stop offset="78%" stop-color="#a8a29e"/>
      <stop offset="100%" stop-color="#d6d3d1"/>
    </linearGradient>

    <!-- hatching: the three pressures a hand actually uses -->
    <pattern id="hatchA" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <path d="M0 0 V7" stroke="#3f3f46" stroke-width="1.5"/>
    </pattern>
    <pattern id="hatchB" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <path d="M0 0 V9" stroke="#52525b" stroke-width="1"/>
    </pattern>
    <pattern id="hatchC" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
      <path d="M0 0 V6" stroke="#3f3f46" stroke-width="1.6"/>
    </pattern>

    <!-- paper tooth: fine noise the graphite catches on -->
    <filter id="tooth" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
    </filter>
    <!-- graphite grain: breaks strokes up so they read as pencil, not vector -->
    <filter id="graphite" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="3" result="grain"/>
      <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="30%" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="52%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="sketchMask"><rect width="1920" height="673" fill="url(#fade)"/></mask>
  </defs>

  <rect width="1920" height="673" fill="url(#paper)"/>
  <rect width="1920" height="673" filter="url(#tooth)" opacity="0.06"/>

  <!-- construction lines, left in as a real sketch would -->
  <g stroke="#71717a" stroke-opacity="0.09" stroke-width="1">
    <path d="M920 600 H1920 M920 472 H1920 M920 414 H1920"/>
    <path d="M1330 660 V180 M1576 640 V360 M1170 640 V420"/>
  </g>

  <g mask="url(#sketchMask)">${drawing}</g>

  <rect y="0" width="1920" height="8" fill="url(#accent)"/>
  <rect y="665" width="1920" height="8" fill="url(#accent)"/>

  <image xlink:href="${IIM}" x="116" y="50" width="300" height="86" preserveAspectRatio="xMidYMid meet"/>
  <text x="266" y="176" text-anchor="middle" fill="#3f3f46" font-size="25" letter-spacing="8" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="470" y="176" text-anchor="middle" fill="#52525b" font-size="25" font-weight="600" font-family="${SANS}">·</text>
  <image xlink:href="${GIFT}" x="524" y="50" width="300" height="86" preserveAspectRatio="xMidYMid meet"/>
  <text x="674" y="176" text-anchor="middle" fill="#3f3f46" font-size="25" letter-spacing="8" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <text x="118" y="298" fill="#1c1c21" font-size="98" font-weight="800" font-family="${SERIF}" letter-spacing="2">GLOGIFT 27</text>
  <text x="122" y="342" fill="#52525b" font-size="30" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="122" y="404" fill="#71717a" font-size="23" letter-spacing="7" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="118" y="462" fill="#27272a" font-size="41" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="118" y="508" fill="#52525b" font-size="29" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <rect x="118" y="550" width="6" height="96" fill="url(#accent)"/>
  <text x="148" y="592" fill="#1c1c21" font-size="33" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="148" y="634" fill="#52525b" font-size="25" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India · In-Person | Hybrid</text>
</svg>`;
}

const variants = [
  { name: "glogift-27-banner-pencil", tintFlag: false },
  { name: "glogift-27-banner-pencil-tinted", tintFlag: true },
];

Promise.all(
  variants.map(({ name, tintFlag }) => {
    const svg = build({ tintFlag });
    fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), svg, "utf8");
    return sharp(Buffer.from(svg))
      .png({ quality: 100 })
      .toFile(path.join(OUT_DIR, `${name}.png`))
      .then((info) => console.log(`${name}.png:`, info.width + "x" + info.height, info.size + " bytes"));
  })
).catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
