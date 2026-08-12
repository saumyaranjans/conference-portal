const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = "C:/Users/saumy/OneDrive/Documents/Glogift2026";
const campus = path.join(ROOT, "design/banner/campus-sketch.jpg");
const projectLogo = path.join(ROOT, "design/banner/iim-building-logo.png");
const output = path.join(ROOT, "design/banner/campus-sketch-emblem.png");

(async () => {
  // Convert the white background to transparency while retaining the exact
  // supplied logo geometry. Render all surviving strokes in pencil black.
  // Match the original sign footprint on the sketch (roughly 52 × 68 px)
  // while preserving the supplied logo's 210:240 aspect ratio.
  const logoHeight = 68;
  const logoWidth = Math.round(logoHeight * 210 / 240);
  const prepared = await sharp(projectLogo)
    .resize({ width: logoWidth, height: logoHeight, fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(logoWidth * logoHeight * 4);
  for (let i = 0; i < logoWidth * logoHeight; i++) {
    const r = prepared.data[i * 3];
    const g = prepared.data[i * 3 + 1];
    const b = prepared.data[i * 3 + 2];
    const darkness = 255 - Math.round((r + g + b) / 3);
    // Warm graphite rather than digital black. Slight deterministic variation
    // lets the underlying brick grain break through like a painted sign.
    const grain = ((i * 17) % 23) - 11;
    rgba[i * 4] = 56;
    rgba[i * 4 + 1] = 45;
    rgba[i * 4 + 2] = 38;
    rgba[i * 4 + 3] = darkness < 24
      ? 0
      : Math.max(35, Math.min(150, Math.round(darkness * 1.12) + grain));
  }

  // Preserve the supplied logo's original proportions. This facade panel is
  // effectively front-facing in the source drawing, so no artificial taper
  // is applied; the surrounding architecture supplies the perspective.
  const sign = await sharp({
    create: { width: logoWidth, height: logoHeight, channels: 4, background: "#00000000" },
  })
    .composite(await Promise.all(Array.from({ length: logoWidth }, async (_, x) => {
      const h = logoHeight;
      const top = 0;
      const strip = await sharp(rgba, { raw: { width: logoWidth, height: logoHeight, channels: 4 } })
        .extract({ left: x, top: 0, width: 1, height: logoHeight })
        .resize({ width: 1, height: h, fit: "fill" })
        .png()
        .toBuffer();
      return { input: strip, left: x, top };
    })))
    .blur(0.3)
    .png()
    .toBuffer();

  // A restrained offset shadow gives the mark the depth of thin metal
  // lettering mounted proud of the brick instead of a flat digital overlay.
  const signShadow = await sharp(sign)
    .tint("#211b18")
    .modulate({ brightness: 0.55 })
    .blur(0.7)
    .png()
    .toBuffer();

  // Clone clean brick from the same red facade to remove the old sign. The
  // transparent black-pencil logo is then drawn directly onto that brick.
  const brickPatch = await sharp(campus)
    .extract({ left: 300, top: 286, width: 72, height: 88 })
    .png()
    .toBuffer();

  await sharp(campus)
    .composite([
      { input: brickPatch, left: 420, top: 300 },
      { input: signShadow, left: 427, top: 310, blend: "over" },
      { input: sign, left: 425, top: 308 },
    ])
    .png()
    .toFile(output);
})();
