/* GLOGIFT 27 — Instagram creatives, derived from the 1920x673 campus banner.

   Not a crop of it. The banner sets its track list at 14px across 1920px; the
   same artwork letterboxed into a feed would be about 8px on a phone, which is
   decoration pretending to be information. So the elements are re-laid for a
   tall frame: the sketch becomes a band rather than a right-hand column, the
   deadlines stack instead of running on one piped line, and the track list is
   dropped from the hero and given a slide of its own.

   Three outputs:
     1080x1350  portrait feed post — the one to publish; portrait takes the
                most vertical space in the feed and so the most attention
     1080x1080  square, for anywhere that crops to 1:1
     1080x1920  story
     1080x1350  tracks slide, as carousel slide 2 behind the hero

   Palette, type and the accent gradient are lifted unchanged from
   design/banner/make-banner-673.js so the set reads as one campaign.
*/
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = process.argv[2] || path.join(REPO, "design/social");
const SKETCH = path.join(REPO, "design/banner/campus-sketch.jpg");

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MAROON = "#7c2d12";
const NAVY = "#1e3a8a";
const PAPER = "#fdf8f2";

const TRACKS = [
  "Analytics, Big Data & Intelligent Systems",
  "Digital Transformation & Intelligent Business",
  "Governance, Ethics & Responsible AI",
  "AI in Finance, Accounting, FinTech & Digital Assets",
  "Human Capital & Leadership",
  "Inclusive Growth & Global Transformation",
  "AI in Marketing: Consumer Insights, Branding & Customer Engagement",
  "AI for Operations, Supply Chain & Industry 5.0",
  "Strategy, Innovation & Emerging Business Models",
  "Sustainable Finance & Decarbonization",
];
const CODES = ["ANA", "DIG", "ETH", "FIN", "HCM", "INC", "MAR", "OPS", "STR", "SUS"];

const DEADLINES = [
  ["Abstract submission closes", "23 November 2026"],
  ["Early bird registration closes", "20 December 2026"],
  ["Regular registration closes", "24 January 2027"],
];

const esc = (t) => t.replace(/&/g, "&amp;");
const b64 = (p, mime) =>
  `data:${mime};base64,` + fs.readFileSync(p).toString("base64");
const IIM = b64(path.join(REPO, "public/iim-crest.png"), "image/png");
const GIFT = b64(path.join(REPO, "public/glogift-logo.png"), "image/png");

/** Resample the drawing to the pixels it will occupy, as the banner does.
 *
 *  `contain` rather than `cover`, padded out to the paper colour: a cover crop
 *  trimmed the top of the frame, which is exactly where the flag and its finial
 *  sit, so the tricolour arrived clipped. Letterboxing is invisible here
 *  because the drawing's own ground is the same paper. */
async function sketchDataUri(w, h) {
  const buf = await sharp(SKETCH)
    .resize(Math.round(w), Math.round(h), {
      kernel: "lanczos3",
      fit: "contain",
      background: PAPER,
    })
    .sharpen({ sigma: 0.7 })
    .flatten({ background: PAPER })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
  return "data:image/jpeg;base64," + buf.toString("base64");
}

const defs = (bandY, bandH) => `
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <linearGradient id="bandFade" gradientUnits="userSpaceOnUse" x1="0" y1="${bandY}" x2="0" y2="${bandY + bandH}">
      <!-- A short ramp only. At 22% the fade reached into the picture itself
           and washed out the top of the flag; the drawing's own margins are
           already paper, so the edges need no more than a hint of dissolve. -->
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="6%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="94%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="bandMask">
      <rect x="0" y="${bandY}" width="1080" height="${bandH}" fill="url(#bandFade)"/>
    </mask>
  </defs>`;

/** The call to action. "Visit" is set quieter than the address so the domain
 *  still carries, and the gap is a dx advance because librsvg collapses plain
 *  whitespace across tspan boundaries. */
const cta = (cx, y, size) => `
  <text x="${cx}" y="${y}" text-anchor="middle" font-family="${SANS}">
    <tspan fill="#475569" font-size="${Math.round(size * 0.78)}" font-weight="500">Visit</tspan><tspan dx="${Math.round(size * 0.42)}" fill="${NAVY}" font-size="${size}" font-weight="800" letter-spacing="0.5">www.glogift2027.in</tspan>
  </text>`;

/** Logos and their captions, centred as a pair about x. */
const organisers = (cx, y, logoW = 190, logoH = 56) => `
  <image xlink:href="${IIM}" x="${cx - logoW - 26}" y="${y}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
  <image xlink:href="${GIFT}" x="${cx + 26}" y="${y}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${cx - logoW / 2 - 26}" y="${y + logoH + 26}" text-anchor="middle" fill="${MAROON}" font-size="15" letter-spacing="3.5" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="${cx + logoW / 2 + 26}" y="${y + logoH + 26}" text-anchor="middle" fill="${MAROON}" font-size="15" letter-spacing="3.5" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>`;

/** The three dated deadlines, stacked — label left, date right, rule between. */
const deadlineBlock = (y, gap = 46, size = 21) =>
  DEADLINES.map(([label, date], i) => {
    const yy = y + i * gap;
    return `
  <text x="92" y="${yy}" fill="#475569" font-size="${size}" font-family="${SANS}">${esc(label)}</text>
  <text x="988" y="${yy}" text-anchor="end" fill="${MAROON}" font-size="${size}" font-weight="700" font-family="${SANS}">${date}</text>
  ${i < DEADLINES.length - 1 ? `<path d="M92 ${yy + 15} H988" stroke="#c2410c" stroke-width="1" opacity="0.18"/>` : ""}`;
  }).join("");

/* ------------------------------------------------------------------ hero */
function hero(SK, { H, bandY, bandH, headY, scale = 1, showPathways = false, orgY = 62 }) {
  const s = (n) => Math.round(n * scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${H}" viewBox="0 0 1080 ${H}">
  ${defs(bandY, bandH)}
  <rect width="1080" height="${H}" fill="${PAPER}"/>
  <rect y="0" width="1080" height="10" fill="url(#accent)"/>
  <rect y="${H - 10}" width="1080" height="10" fill="url(#accent)"/>

  ${organisers(540, orgY)}

  <!-- Offsets scale with the headline: at fixed offsets the rule slid into the
       cap-height of GLOGIFT 27 as soon as the type grew for the story. -->
  <text x="540" y="${headY - s(112)}" text-anchor="middle" fill="#c2410c" font-size="${s(30)}" font-weight="800" letter-spacing="${s(6)}" font-family="${SANS}">CALL FOR SUBMISSIONS</text>
  <path d="M300 ${headY - s(92)} H780" stroke="#c2410c" stroke-width="1.6" opacity="0.4"/>

  <text x="540" y="${headY}" text-anchor="middle" fill="${NAVY}" font-size="${s(104)}" font-weight="800" font-family="${SERIF}" letter-spacing="1">GLOGIFT 27</text>
  <text x="540" y="${headY + s(40)}" text-anchor="middle" fill="${MAROON}" font-size="${s(20)}" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <image xlink:href="${SK}" x="0" y="${bandY}" width="1080" height="${bandH}" preserveAspectRatio="xMidYMid meet" mask="url(#bandMask)"/>

  <text x="540" y="${bandY + bandH + s(52)}" text-anchor="middle" fill="#b45309" font-size="${s(14)}" letter-spacing="${s(5)}" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="540" y="${bandY + bandH + s(100)}" text-anchor="middle" fill="#0f172a" font-size="${s(42)}" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="540" y="${bandY + bandH + s(140)}" text-anchor="middle" fill="#475569" font-size="${s(27)}" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <text x="540" y="${bandY + bandH + s(210)}" text-anchor="middle" fill="${NAVY}" font-size="${s(40)}" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="540" y="${bandY + bandH + s(248)}" text-anchor="middle" fill="${MAROON}" font-size="${s(22)}" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India&#160;&#160;·&#160;&#160;Hybrid (Virtual / On-Site)</text>

  ${showPathways ? `<text x="540" y="${H - s(96)}" text-anchor="middle" fill="#475569" font-size="${s(19)}" font-family="${SANS}">10 Tracks&#160;&#160;·&#160;&#160;Pathway A (abstract)&#160;&#160;·&#160;&#160;Pathway B (full paper)</text>` : ""}
  ${cta(540, H - s(50), s(30))}
</svg>`;
}

/* -------------------------------------------------------------- deadlines */
function deadlineSlide() {
  const H = 1350;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${H}" viewBox="0 0 1080 ${H}">
  ${defs(0, 1)}
  <rect width="1080" height="${H}" fill="${PAPER}"/>
  <rect y="0" width="1080" height="10" fill="url(#accent)"/>
  <rect y="${H - 10}" width="1080" height="10" fill="url(#accent)"/>

  <text x="540" y="150" text-anchor="middle" fill="${NAVY}" font-size="62" font-weight="800" font-family="${SERIF}">Dates to keep</text>
  <path d="M380 186 H700" stroke="#c2410c" stroke-width="2" opacity="0.45"/>

  ${deadlineBlock(300, 96, 30)}

  <rect x="92" y="600" width="896" height="2" fill="url(#accent)"/>

  <text x="540" y="700" text-anchor="middle" fill="#0f172a" font-size="38" font-weight="700" font-family="${SANS}">Two ways to take part</text>
  <text x="540" y="762" text-anchor="middle" fill="#475569" font-size="26" font-family="${SANS}">Pathway A&#160;&#160;—&#160;&#160;abstract and presentation</text>
  <text x="540" y="806" text-anchor="middle" fill="#475569" font-size="26" font-family="${SANS}">Pathway B&#160;&#160;—&#160;&#160;abstract, full paper and presentation</text>

  <text x="540" y="900" text-anchor="middle" fill="#475569" font-size="24" font-family="${SANS}">Full papers close 8 December 2026</text>

  <rect x="92" y="960" width="896" height="2" fill="url(#accent)"/>

  <text x="540" y="1052" text-anchor="middle" fill="#0f172a" font-size="32" font-weight="700" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="540" y="1098" text-anchor="middle" fill="${MAROON}" font-size="25" font-family="${SANS}">IIM Sambalpur, Odisha&#160;&#160;·&#160;&#160;In-Person | Hybrid</text>

  ${organisers(540, 1160, 170, 50)}

  ${cta(540, H - 44, 30)}
</svg>`;
}

/* ----------------------------------------------------------------- tracks */
/** Greedy wrap at a character budget, so a break lands between phrases rather
 *  than at the arithmetic midpoint — "AI in Finance, Accounting, FinTech" reads;
 *  "AI in Finance," / "Accounting, FinTech" does not. */
function wrap(text, budget) {
  const words = text.split(" ");
  const lines = [""];
  for (const w of words) {
    const line = lines[lines.length - 1];
    if (!line) lines[lines.length - 1] = w;
    else if ((line + " " + w).length <= budget) lines[lines.length - 1] = line + " " + w;
    else lines.push(w);
  }
  return lines;
}

function tracksSlide() {
  const H = 1350;
  // Rows advance by their own height, so a two-line title does not crowd the
  // row beneath it.
  // 52 characters is what fits the 196→988 measure at 26px without crowding
  // the margin. Tighter than that and titles wrap for no reason, stranding a
  // single word — "Business", "5.0", "Models" — on a line of its own.
  const LINE = 32, SINGLE = 90, EXTRA = 32;
  let y = 262;
  const rows = TRACKS.map((t, i) => {
    const lines = wrap(t, 52);
    const size = 26;
    const block = lines
      .map((l, k) => `
  <text x="196" y="${y + k * LINE}" fill="#0f172a" font-size="${size}" font-family="${SANS}">${esc(l)}</text>`)
      .join("");
    const height = SINGLE + (lines.length - 1) * EXTRA;
    const ruleY = y + (lines.length - 1) * LINE + 28;
    const out = `
  <text x="92" y="${y}" fill="#c2410c" font-size="27" font-weight="800" letter-spacing="1.5" font-family="${SANS}">${CODES[i]}</text>${block}
  ${i < TRACKS.length - 1 ? `<path d="M92 ${ruleY} H988" stroke="#c2410c" stroke-width="1" opacity="0.14"/>` : ""}`;
    y += height;
    return out;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${H}" viewBox="0 0 1080 ${H}">
  ${defs(0, 1)}
  <rect width="1080" height="${H}" fill="${PAPER}"/>
  <rect y="0" width="1080" height="10" fill="url(#accent)"/>
  <rect y="${H - 10}" width="1080" height="10" fill="url(#accent)"/>

  <text x="540" y="150" text-anchor="middle" fill="${NAVY}" font-size="62" font-weight="800" font-family="${SERIF}">Ten tracks</text>
  <text x="540" y="196" text-anchor="middle" fill="${MAROON}" font-size="24" font-family="${SANS}">One of them is yours</text>
  ${rows}
  <text x="540" y="${H - 96}" text-anchor="middle" fill="#475569" font-size="23" font-family="${SANS}">Abstracts close 23 November 2026</text>
  ${cta(540, H - 48, 30)}
</svg>`;
}

(async () => {
  const jobs = [];

  // Portrait feed post — the primary creative. 555 is the drawing's own height
  // at 1080 wide, so the band holds it whole with nothing trimmed.
  jobs.push([
    "glogift-27-instagram-portrait-1080x1350",
    hero(await sketchDataUri(1080, 555), { H: 1350, bandY: 400, bandH: 555, headY: 300 }),
  ]);

  // Square, for surfaces that crop to 1:1. The band has to stay tall enough to
  // hold the whole flag — a shorter one slices it below the saffron and leaves
  // what looks like a plain green flag. Paying for that height means dropping
  // the pathway line, which the carousel's later slides cover anyway.
  jobs.push([
    "glogift-27-instagram-square-1080x1080",
    hero(await sketchDataUri(1080, 430), {
      H: 1080, bandY: 336, bandH: 430, headY: 272, scale: 0.8,
      orgY: 42,
    }),
  ]);

  // Story.
  jobs.push([
    "glogift-27-instagram-story-1080x1920",
    hero(await sketchDataUri(1080, 555), { H: 1920, bandY: 660, bandH: 555, headY: 420, scale: 1.12 }),
  ]);

  jobs.push(["glogift-27-instagram-slide2-tracks-1080x1350", tracksSlide()]);
  jobs.push(["glogift-27-instagram-slide3-dates-1080x1350", deadlineSlide()]);

  for (const [name, svg] of jobs) {
    fs.writeFileSync(path.join(OUT, `${name}.svg`), svg, "utf8");
    const info = await sharp(Buffer.from(svg), { density: 72 })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(OUT, `${name}.png`));
    console.log(`${name}.png  ${info.width}x${info.height}  ${Math.round(info.size / 1024)}KB`);
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
