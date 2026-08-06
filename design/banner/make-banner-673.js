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

// Sketch 1280x658 -> 1180 wide keeps it whole and flush to the right/bottom.
const IW = 1180, IH = 606, IX = W - IW, IY = H - IH;

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
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="${IX}" y1="0" x2="${IX + 300}" y2="0">
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
</svg>`;

fs.writeFileSync(path.join(OUT, "glogift-27-banner-1920x673-campus.svg"), svg, "utf8");
sharp(Buffer.from(svg))
  .png({ quality: 100 })
  .toFile(path.join(OUT, "glogift-27-banner-1920x673-campus.png"))
  .then((i) => console.log("PNG:", i.width + "x" + i.height, i.size + " bytes"))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
