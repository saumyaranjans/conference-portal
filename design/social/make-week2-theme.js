const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const ROOT = path.join(REPO, "design/social/week-2-theme");
const OUT = path.join(ROOT, "instagram-1080x1350");
const ART = path.join(ROOT, "theme-triptych-source.png");
const PAPER = "#fdf8f2";
const NAVY = "#1e3a8a";
const MAROON = "#7c2d12";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const IIM = `data:image/png;base64,${fs.readFileSync(path.join(REPO, "public/iim-crest.png")).toString("base64")}`;
const IIM_WORDMARK = `data:image/png;base64,${fs.readFileSync(path.join(REPO, "public/iim-sambalpur-wordmark.png")).toString("base64")}`;
const GIFT = `data:image/png;base64,${fs.readFileSync(path.join(REPO, "public/glogift-logo.png")).toString("base64")}`;
const CAMPUS = `data:image/png;base64,${fs.readFileSync(path.join(REPO, "design/banner/campus-sketch-no-logo.png")).toString("base64")}`;
const QR = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, "conference-website-qr.png")).toString("base64")}`;

const b64 = (p) => `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
const esc = (s) => s.replace(/&/g, "&amp;");

function frame(body, iimLogo = IIM_WORDMARK) {
  const iimMark = `<image xlink:href="${iimLogo}" x="42" y="18" width="600" height="66" preserveAspectRatio="xMinYMid meet"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs><linearGradient id="accent"><stop stop-color="#7c2d12"/><stop offset=".55" stop-color="#d97706"/><stop offset="1" stop-color="#eab308"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="${PAPER}"/><rect width="1080" height="10" fill="url(#accent)"/><rect y="1340" width="1080" height="10" fill="url(#accent)"/>
  ${body}
  <rect x="0" y="10" width="1080" height="190" fill="${PAPER}"/>
  ${iimMark}
  <image xlink:href="${GIFT}" x="870" y="20" width="152" height="90" preserveAspectRatio="xMidYMid meet"/>
  <text x="540" y="140" text-anchor="middle" fill="${NAVY}" font-size="50" font-weight="800" font-family="${SERIF}">GLOGIFT 27</text>
  <text x="540" y="190" text-anchor="middle" fill="#c2410c" font-size="48" font-weight="900" letter-spacing="1.5" font-family="${SANS}">CALL FOR SUBMISSION</text>
  <path d="M58 202 H1022" stroke="#c2410c" stroke-width="2" opacity=".3"/>
  <text x="58" y="1273" fill="${MAROON}" font-size="18" font-weight="800" letter-spacing="1.2" font-family="${SANS}">INTERNATIONAL CONFERENCE ON</text>
  <text x="58" y="1304" fill="${NAVY}" font-size="20" font-weight="800" font-family="${SANS}">AI-DRIVEN SOLUTIONS IN MANAGEMENT</text>
  <text x="730" y="1300" text-anchor="end" fill="${NAVY}" font-size="19" font-weight="800" font-family="${SANS}">glogift2027.in</text>
  <text x="781" y="1230" text-anchor="end" fill="${MAROON}" font-size="45" font-weight="900" font-family="${SANS}">SCAN TO</text>
  <text x="781" y="1275" text-anchor="end" fill="${MAROON}" font-size="45" font-weight="900" font-family="${SANS}">KNOW MORE</text>
  <image xlink:href="${QR}" x="786" y="1064" width="276" height="276" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
}

function cover(art) {
  return frame(`
  <text x="72" y="225" fill="#c2410c" font-size="20" font-weight="800" letter-spacing="5" font-family="${SANS}">THE 2027 THEME · EXPLAINED</text>
  <text x="72" y="305" fill="${NAVY}" font-size="68" font-weight="800" font-family="${SERIF}">Three words.</text>
  <text x="72" y="375" fill="#0f172a" font-size="58" font-weight="700" font-family="${SANS}">Three management questions.</text>
  <image xlink:href="${art}" x="0" y="425" width="1080" height="545" preserveAspectRatio="xMidYMid slice"/>
  <text x="540" y="1045" text-anchor="middle" fill="${MAROON}" font-size="36" font-weight="700" font-family="${SANS}">Flexibility · Digitalisation · Decarbonization</text>
  <text x="540" y="1110" text-anchor="middle" fill="${NAVY}" font-size="19" font-weight="800" font-family="${SANS}">25–27 February 2027 · IIM Sambalpur, Odisha · Hybrid</text>`);
}

function concept(art, n, title, kicker, lines, iimLogo = IIM_WORDMARK) {
  const text = lines.map((line, i) => `<text x="72" y="${1010 + i * 43}" fill="#334155" font-size="30" font-family="${SANS}">${esc(line)}</text>`).join("");
  return frame(`
  <text x="72" y="245" fill="#c2410c" font-size="22" font-weight="800" letter-spacing="5" font-family="${SANS}">0${n} · ${title.toUpperCase()}</text>
  <text x="72" y="320" fill="${NAVY}" font-size="56" font-weight="800" font-family="${SERIF}">${esc(kicker)}</text>
  <image xlink:href="${art}" x="0" y="380" width="1080" height="500" preserveAspectRatio="xMidYMid slice"/>
  ${text}`, iimLogo);
}

function closingSlide() {
  return frame(`
  <text x="540" y="235" text-anchor="middle" fill="#c2410c" font-size="22" font-weight="800" letter-spacing="5" font-family="${SANS}">BRING YOUR RESEARCH TO GLOGIFT 27</text>
  <text x="540" y="330" text-anchor="middle" fill="${NAVY}" font-size="62" font-weight="800" font-family="${SERIF}">Submit your abstract</text>
  <image xlink:href="${CAMPUS}" x="0" y="390" width="1080" height="515" preserveAspectRatio="xMidYMid meet"/>
  <text x="540" y="930" text-anchor="middle" fill="${NAVY}" font-size="29" font-weight="800" font-family="${SANS}">25–27 February 2027</text>
  <text x="540" y="970" text-anchor="middle" fill="#475569" font-size="24" font-weight="600" font-family="${SANS}">IIM Sambalpur, Odisha · Hybrid</text>
  <text x="540" y="1020" text-anchor="middle" fill="#475569" font-size="25" font-weight="700" letter-spacing="3" font-family="${SANS}">LAST DATE TO SUBMIT</text>
  <text x="540" y="1080" text-anchor="middle" fill="${MAROON}" font-size="48" font-weight="800" font-family="${SANS}">23 November 2026</text>
  `);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const full = b64(ART);
  const crops = [];
  const meta = await sharp(ART).metadata();
  const third = Math.floor(meta.width / 3);
  for (let i = 0; i < 3; i++) {
    const buf = await sharp(ART).extract({ left: i * third, top: 0, width: i === 2 ? meta.width - i * third : third, height: meta.height }).png().toBuffer();
    crops.push(`data:image/png;base64,${buf.toString("base64")}`);
  }
  const slides = [
    cover(full),
    concept(crops[0], 1, "Flexibility", "Adaptability is not automation.", ["A faster rigid process is still rigid.", "What lets an organisation change its mind?", "AI can widen that capacity — or narrow it."], IIM_WORDMARK),
    concept(crops[1], 2, "Digitalisation", "Accuracy is only the beginning.", ["What happens when an AI recommendation meets", "a human being who must defend the decision?", "Governance is the binding constraint."]),
    concept(crops[2], 3, "Decarbonization", "Count both halves of the ledger.", ["AI can help decarbonise operations and supply chains.", "It also consumes meaningful energy.", "Responsible management must account for both."]),
    closingSlide(),
  ];
  for (let i = 0; i < slides.length; i++) {
    const stem = `glogift-27-instagram-theme-${i + 1}`;
    await sharp(Buffer.from(slides[i])).png().toFile(path.join(OUT, `${stem}.png`));
  }
})();
