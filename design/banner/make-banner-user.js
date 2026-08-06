/* GLOGIFT 27 banner built on the supplied campus sketch.

   The drawing is used whole — nothing cropped. The canvas is extended upward in
   the sketch's own paper colour so the added band is invisible, and the text is
   set into the resulting sky: the drawing's own sky is empty except the flag,
   so the type has a clear field without covering any of the building. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const OUT = process.argv[2] || ".";
const SKETCH = process.argv[3] || path.join(REPO, "design/banner/campus-sketch.jpg");

const W = 1920;              // sketch 1280x658 scaled x1.5
const SKETCH_H = 987;
const BAND = 253;            // sky added above the drawing
const H = BAND + SKETCH_H;   // 1240
const PAPER = { r: 253, g: 248, b: 242 };

const dataUri = (p) =>
  "data:image/png;base64," + fs.readFileSync(path.join(REPO, "public", p)).toString("base64");
const IIM = dataUri("iim-crest.png");
const GIFT = dataUri("glogift-logo.png");

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/* Type sits x 90..1150, above y=640 — clear of the flag (x>1200) and of the
   central portal roof, whose peak reaches y≈598 at x≈645. */
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>

  <rect y="0" width="${W}" height="10" fill="url(#accent)"/>
  <rect y="${H - 10}" width="${W}" height="10" fill="url(#accent)"/>

  <!-- organisers -->
  <image xlink:href="${IIM}" x="88" y="52" width="250" height="74" preserveAspectRatio="xMidYMid meet"/>
  <image xlink:href="${GIFT}" x="378" y="52" width="250" height="74" preserveAspectRatio="xMidYMid meet"/>
  <text x="213" y="154" text-anchor="middle" fill="#7c2d12" font-size="19" letter-spacing="5" font-weight="600" font-family="${SANS}">IIM SAMBALPUR</text>
  <text x="503" y="154" text-anchor="middle" fill="#7c2d12" font-size="19" letter-spacing="5" font-weight="600" font-family="${SANS}">GIFT SOCIETY</text>

  <!-- headline -->
  <text x="90" y="292" fill="#1e3a8a" font-size="92" font-weight="800" font-family="${SERIF}" letter-spacing="1">GLOGIFT 27</text>
  <text x="94" y="334" fill="#7c2d12" font-size="24" font-weight="500" font-family="${SERIF}">Twenty Seventh Global Conference on Flexible Systems Management</text>

  <text x="94" y="400" fill="#b45309" font-size="19" letter-spacing="6" font-weight="700" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="90" y="452" fill="#0f172a" font-size="38" font-weight="700" font-family="${SANS}">AI-Driven Solutions in Management</text>
  <text x="90" y="496" fill="#475569" font-size="27" font-family="${SANS}">Flexibility, Digitalisation &amp; Decarbonization</text>

  <!-- dates -->
  <rect x="90" y="546" width="6" height="96" fill="url(#accent)"/>
  <text x="118" y="588" fill="#1e3a8a" font-size="32" font-weight="800" font-family="${SANS}">25 – 27 February 2027</text>
  <text x="118" y="626" fill="#7c2d12" font-size="23" font-weight="500" font-family="${SANS}">IIM Sambalpur, Odisha, India  ·  In-Person | Hybrid</text>
</svg>`;

(async () => {
  const drawing = await sharp(SKETCH)
    .resize(W, SKETCH_H, { kernel: "lanczos3" })
    .toBuffer();

  // Build the added sky by stretching the drawing's own top rows upward: any
  // flat fill would leave a hairline seam where the two papers meet, however
  // closely the colour is matched.
  const band = await sharp(drawing)
    .extract({ left: 0, top: 0, width: W, height: 3 })
    .resize(W, BAND, { kernel: "nearest" })
    .toBuffer();

  const base = await sharp({
    create: { width: W, height: H, channels: 3, background: PAPER },
  })
    .composite([
      { input: band, top: 0, left: 0 },
      { input: drawing, top: BAND, left: 0 },
    ])
    .png()
    .toBuffer();

  const full = path.join(OUT, "glogift-27-banner-campus.png");
  await sharp(base)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png({ quality: 100 })
    .toFile(full);
  const m = await sharp(full).metadata();
  console.log("PNG:", m.width + "x" + m.height);

  // Wide strip for website headers, cropped from the finished compose.
  await sharp(full)
    .extract({ left: 0, top: 0, width: W, height: 860 })
    .png({ quality: 100 })
    .toFile(path.join(OUT, "glogift-27-banner-campus-wide.png"));
  console.log("wide strip: 1920x860");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
