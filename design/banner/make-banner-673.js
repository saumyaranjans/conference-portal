/* GLOGIFT 27 banner — 1920x673, text column left, campus sketch right.

   The supplied drawing is placed whole against the right edge and its left side
   is dissolved into the paper with a gradient mask, so the two halves read as
   one sheet rather than a photo pasted beside a caption. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = process.argv[2] || ".";
const SKETCH = path.join(REPO, "design/banner/campus-sketch.jpg");

const W = 1920, H = 673;

// Sketch 1280x658 -> 1080 wide, lifted clear of the footer band (which starts
// at y=590) while staying whole and flush to the right edge.
const IW = 1080, IH = 555, IX = W - IW, IY = 26;
const FOOT = 584;

/* Display forms of the ten official tracks. The full titles run to ~460
   characters with separators — three times what fits on one line at a legible
   size — so each is cut to its distinguishing phrase. */
const TRACKS = [
  "AI in Finance & FinTech",
  "Operations, Supply Chain & Industry 5.0",
  "Digital Transformation",
  "Sustainable Finance & Decarbonization",
  "AI in Marketing",
  "Governance, Ethics & Responsible AI",
  "Analytics & Big Data",
  "Human Capital & Leadership",
  "Strategy & Innovation",
  "Inclusive Growth",
];

const b64 = (p, mime) =>
  `data:${mime};base64,` + fs.readFileSync(p).toString("base64");
const SK = b64(SKETCH, "image/jpeg");
const IIM = b64(path.join(REPO, "public/iim-crest.png"), "image/png");
const GIFT = b64(path.join(REPO, "public/glogift-logo.png"), "image/png");

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <!-- dissolve the drawing's left edge into the paper -->
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="${IX}" y1="0" x2="${IX + 280}" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="fadeLeft">
      <rect x="${IX}" y="${IY}" width="${IW}" height="${IH}" fill="url(#fade)"/>
    </mask>
  </defs>

  <rect width="${W}" height="${H}" fill="#fdf8f2"/>

  <image xlink:href="${SK}" x="${IX}" y="${IY}" width="${IW}" height="${IH}"
         preserveAspectRatio="xMidYMid meet" mask="url(#fadeLeft)"/>

  <rect y="0" width="${W}" height="8" fill="url(#accent)"/>
  <rect y="${H - 8}" width="${W}" height="8" fill="url(#accent)"/>

  <!-- organisers -->
  <image xlink:href="${IIM}" x="88" y="40" width="196" height="58" preserveAspectRatio="xMidYMid meet"/>
  <image xlink:href="${GIFT}" x="320" y="40" width="196" height="58" preserveAspectRatio="xMidYMid meet"/>
  <text x="186" y="122" text-anchor="middle" fill="#7c2d12" font-size="15" letter-spacing="4" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="418" y="122" text-anchor="middle" fill="#7c2d12" font-size="15" letter-spacing="4" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <!-- call to action, in the clear sky left of the flag -->
  <text x="1010" y="104" text-anchor="middle" fill="#c2410c" font-size="34" font-weight="800"
        letter-spacing="7" font-family="${SANS}">CALL FOR SUBMISSIONS</text>
  <path d="M810 128 H1210" stroke="#c2410c" stroke-width="1.6" opacity="0.45"/>
  <text x="1010" y="156" text-anchor="middle" fill="#7c2d12" font-size="17" font-weight="500"
        font-family="${SANS}">Ten tracks&#160;·&#160;Pathway A (abstract) &amp; Pathway B (full paper)</text>

  <!-- headline -->
  <text x="90" y="226" fill="#1e3a8a" font-size="72" font-weight="800" font-family="${SERIF}" letter-spacing="1">GLOGIFT 27</text>
  <text x="93" y="258" fill="#7c2d12" font-size="17" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="93" y="316" fill="#b45309" font-size="14" letter-spacing="5" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="90" y="360" fill="#0f172a" font-size="30" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="90" y="396" fill="#475569" font-size="21" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <!-- dates -->
  <rect x="90" y="446" width="5" height="104" fill="url(#accent)"/>
  <text x="115" y="484" fill="#1e3a8a" font-size="27" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="115" y="518" fill="#7c2d12" font-size="18" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India · In-Person | Hybrid</text>
  <text x="115" y="548" fill="#475569" font-size="17" font-family="${SANS}">glogift2027.in</text>

  <!-- footer: deadlines, then the track list -->
  <path d="M90 ${FOOT} H${W - 90}" stroke="#c2410c" stroke-width="1" opacity="0.28"/>
  <text x="${W / 2}" y="${FOOT + 32}" text-anchor="middle" font-family="${SANS}" font-size="21">
    <tspan fill="#7c2d12" font-weight="700">Abstract submission closes 23 November 2026</tspan><tspan fill="#7c2d12" opacity="0.45" dx="16">|</tspan><tspan fill="#7c2d12" font-weight="700" dx="16">Early bird registration closes 20 December 2026</tspan><tspan fill="#7c2d12" opacity="0.45" dx="16">|</tspan><tspan fill="#7c2d12" font-weight="700" dx="16">Regular registration closes 24 January 2027</tspan>
  </text>
  <text x="${W / 2}" y="${FOOT + 62}" text-anchor="middle" font-family="${SANS}" font-size="14" fill="#475569">
    ${TRACKS.map((t, i) =>
      i === 0
        ? `<tspan>${t.replace(/&/g, "&amp;")}</tspan>`
        : `<tspan fill="#c2410c" opacity="0.5" dx="6">|</tspan>` +
          `<tspan fill="#475569" dx="6">${t.replace(/&/g, "&amp;")}</tspan>`
    ).join("")}
  </text>
</svg>`;

fs.writeFileSync(path.join(OUT, "glogift-27-banner-1920x673-campus.svg"), svg, "utf8");
sharp(Buffer.from(svg))
  .png({ quality: 100 })
  .toFile(path.join(OUT, "glogift-27-banner-1920x673-campus.png"))
  .then((i) => console.log("PNG:", i.width + "x" + i.height, i.size + " bytes"))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
