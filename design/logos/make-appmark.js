/* App mark for the Google and Microsoft consent screens.

   Google rejected the GIFT smiley as not uniquely identifying the brand: it is
   a generic face and it does not say GLOGIFT 27 anywhere. A wordmark fixes
   both objections. At 120px nine letters across the square are unreadable, so
   the year carries the size and the name sits above it letterspaced. */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname);

function svg(S) {
  const s = (n) => Math.round((n * S) / 120);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="#fdf8f2"/>
  <rect x="0" y="0" width="${S}" height="${s(7)}" fill="url(#a)"/>
  <rect x="0" y="${S - s(7)}" width="${S}" height="${s(7)}" fill="url(#a)"/>
  <text x="${S / 2}" y="${s(44)}" text-anchor="middle" fill="#7c2d12"
        font-family="Segoe UI, Arial, sans-serif" font-size="${s(15)}"
        font-weight="700" letter-spacing="${s(2.4)}">GLOGIFT</text>
  <text x="${S / 2}" y="${s(96)}" text-anchor="middle" fill="#1e3a8a"
        font-family="Georgia, Times New Roman, serif" font-size="${s(56)}"
        font-weight="800">27</text>
</svg>`;
}

/* The favicon cannot be the wordmark: at 32px "GLOGIFT" is a grey smudge.
   Dropping to the year alone keeps something recognisable at tab size, and it
   still reads as the same family thanks to the colours and accent bars. */
function faviconSvg(S) {
  const s = (n) => Math.round((n * S) / 64);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c2d12"/>
      <stop offset="42%" stop-color="#c2410c"/>
      <stop offset="76%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" rx="${s(12)}" fill="#fdf8f2"/>
  <rect x="0" y="0" width="${S}" height="${s(6)}" fill="url(#a)"/>
  <rect x="0" y="${S - s(6)}" width="${S}" height="${s(6)}" fill="url(#a)"/>
  <text x="${S / 2}" y="${s(48)}" text-anchor="middle" fill="#1e3a8a"
        font-family="Georgia, Times New Roman, serif" font-size="${s(42)}"
        font-weight="800">27</text>
</svg>`;
}

const PUBLIC = path.join(__dirname, "..", "..", "public");

(async () => {
  for (const S of [120, 215, 512]) {
    const out = path.join(OUT, `glogift-27-appmark-${S}.png`);
    await sharp(Buffer.from(svg(S)), { density: 300 })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(
      `glogift-27-appmark-${S}.png`.padEnd(34),
      `${S}x${S}`,
      (fs.statSync(out).size / 1024).toFixed(1) + "KB"
    );
  }

  // Browser tab and home-screen icons, written straight into public/.
  const icons = [
    [32, "favicon-32.png"],
    [48, "favicon-48.png"],
    [180, "apple-touch-icon.png"],
    [192, "icon-192.png"],
    [512, "icon-512.png"],
  ];
  for (const [S, name] of icons) {
    const out = path.join(PUBLIC, name);
    await sharp(Buffer.from(faviconSvg(S)), { density: 400 })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(
      `public/${name}`.padEnd(34),
      `${S}x${S}`,
      (fs.statSync(out).size / 1024).toFixed(1) + "KB"
    );
  }
})();
