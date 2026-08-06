/* GLOGIFT 27 banner — 1920x673, text column left, campus sketch right.

   The supplied drawing is placed whole against the right edge and its left side
   is dissolved into the paper with a gradient mask, so the two halves read as
   one sheet rather than a picture pasted beside a caption. The footer carries
   the three deadlines and the full track list over two lines. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = process.argv[2] || ".";
const SKETCH = path.join(REPO, "design/banner/campus-sketch.jpg");

const W = 1920, H = 673;

// Sketch 1280x658 -> 1000 wide, lifted clear of the footer band.
const IW = 1000, IH = 514, IX = W - IW, IY = 14;
const FOOT = 536;

/* The ten tracks, verbatim from src/components/landing/tracks.ts, split across
   two lines — the full titles run to ~434 characters and cannot fit on one. */
const TRACKS = [
  "AI in Finance, Accounting, FinTech & Digital Assets",
  "AI for Operations, Supply Chain & Industry 5.0",
  "Digital Transformation & Intelligent Business",
  "Sustainable Finance & Decarbonization",
  "AI in Marketing: Consumer Insights, Branding & Customer Engagement",
  "Governance, Ethics & Responsible AI",
  "Analytics, Big Data & Intelligent Systems",
  "Human Capital & Leadership",
  "Strategy, Innovation & Emerging Business Models",
  "Inclusive Growth & Global Transformation",
];

/* Deadlines, verbatim from the DEADLINES array on the landing page. */
const DEADLINES = [
  "Abstract submission closes 23 November 2026",
  "Early bird registration closes 20 December 2026",
  "Regular registration closes 24 January 2027",
];

const b64 = (p, mime) =>
  `data:${mime};base64,` + fs.readFileSync(p).toString("base64");
const IIM = b64(path.join(REPO, "public/iim-crest.png"), "image/png");
const GIFT = b64(path.join(REPO, "public/glogift-logo.png"), "image/png");

/* Resample the drawing to the pixels it will actually occupy at this scale.
   Left to librsvg it would be scaled with a cheap filter at raster time; doing
   it here with lanczos plus a light sharpen keeps the pen lines from going
   soft when the banner is rendered at 2x or 3x. */
async function sketchDataUri(scale) {
  const buf = await sharp(SKETCH)
    .resize(Math.round(IW * scale), Math.round(IH * scale), { kernel: "lanczos3" })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
  return "data:image/jpeg;base64," + buf.toString("base64");
}

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MAROON = "#7c2d12";

const esc = (t) => t.replace(/&/g, "&amp;");

/* librsvg collapses whitespace across <tspan> boundaries, so separator gaps
   have to be real advances: dx shifts the next glyph run. */
function pipeJoin(items, { fill, weight, gap, pipeFill = MAROON }) {
  return items
    .map(
      (t, i) =>
        (i === 0
          ? ""
          : `<tspan fill="${pipeFill}" opacity="0.45" dx="${gap}">|</tspan>`) +
        `<tspan fill="${fill}"${weight ? ` font-weight="${weight}"` : ""}` +
        `${i === 0 ? "" : ` dx="${gap}"`}>${esc(t)}</tspan>`
    )
    .join("");
}

const buildSvg = (SK) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="${IX}" y1="0" x2="${IX + 260}" y2="0">
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
  <image xlink:href="${IIM}" x="88" y="36" width="212" height="62" preserveAspectRatio="xMidYMid meet"/>
  <image xlink:href="${GIFT}" x="336" y="36" width="212" height="62" preserveAspectRatio="xMidYMid meet"/>
  <text x="194" y="126" text-anchor="middle" fill="${MAROON}" font-size="17" letter-spacing="4" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="442" y="126" text-anchor="middle" fill="${MAROON}" font-size="17" letter-spacing="4" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <!-- call to action, in the clear sky left of the flag -->
  <text x="1010" y="102" text-anchor="middle" fill="#c2410c" font-size="38" font-weight="800"
        letter-spacing="7" font-family="${SANS}">CALL FOR SUBMISSIONS</text>
  <path d="M790 128 H1230" stroke="#c2410c" stroke-width="1.6" opacity="0.45"/>
  <text x="1010" y="158" text-anchor="middle" fill="${MAROON}" font-size="19" font-weight="500"
        font-family="${SANS}">Ten tracks&#160;·&#160;Pathway A (abstract) &amp; Pathway B (full paper)</text>

  <!-- headline -->
  <text x="90" y="240" fill="#1e3a8a" font-size="80" font-weight="800" font-family="${SERIF}" letter-spacing="1">GLOGIFT 27</text>
  <text x="94" y="276" fill="${MAROON}" font-size="19" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="94" y="334" fill="#b45309" font-size="15" letter-spacing="5" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="90" y="380" fill="#0f172a" font-size="33" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="90" y="416" fill="#475569" font-size="23" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <!-- dates -->
  <rect x="90" y="452" width="5" height="78" fill="url(#accent)"/>
  <text x="115" y="492" fill="#1e3a8a" font-size="30" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="115" y="524" fill="${MAROON}" font-size="20" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India · In-Person | Hybrid · glogift2027.in</text>

  <!-- footer: deadlines, then the ten tracks over two lines -->
  <path d="M70 ${FOOT} H${W - 70}" stroke="#c2410c" stroke-width="1" opacity="0.28"/>
  <text x="${W / 2}" y="${FOOT + 34}" text-anchor="middle" font-family="${SANS}" font-size="23">
    ${pipeJoin(DEADLINES, { fill: MAROON, weight: 700, gap: 16 })}
  </text>
  <text x="${W / 2}" y="${FOOT + 68}" text-anchor="middle" font-family="${SANS}" font-size="14">
    ${pipeJoin(TRACKS.slice(0, 5), { fill: "#475569", gap: 7, pipeFill: "#c2410c" })}
  </text>
  <text x="${W / 2}" y="${FOOT + 92}" text-anchor="middle" font-family="${SANS}" font-size="14">
    ${pipeJoin(TRACKS.slice(5), { fill: "#475569", gap: 7, pipeFill: "#c2410c" })}
  </text>
</svg>`;

(async () => {
  // The editable SVG keeps the drawing at its native size — small file, and
  // any downstream editor can re-scale it freely.
  fs.writeFileSync(
    path.join(OUT, "glogift-27-banner-1920x673-campus.svg"),
    buildSvg(b64(SKETCH, "image/jpeg")),
    "utf8"
  );

  for (const [scale, name] of [
    [1, "glogift-27-banner-1920x673-campus"],
    [2, "glogift-27-banner-campus-2x-3840x1346"],
    [3, "glogift-27-banner-campus-3x-5760x2019"],
  ]) {
    const svg = buildSvg(await sketchDataUri(scale));
    const info = await sharp(Buffer.from(svg), { density: 72 * scale })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(OUT, `${name}.png`));
    console.log(`${name}.png:`, info.width + "x" + info.height,
                Math.round(info.size / 1024) + "KB");
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
