# GLOGIFT 27 banner artwork

Source artwork for the conference download banner (1920x673).

- `reference-adminblock.jpg` — the official photo of the IIM Sambalpur
  Koutilya administration building, used as the drawing reference.
- `building-A.svg` — perspective sketch of the building (SELECTED variant).
  A bare `<g>` fragment drawn in the banner's 1920x673 coordinate space,
  ground line y=600, building spanning x≈940–1910.
- `building-B.svg` / `building-C.svg` — alternative elevation and ink-style
  fragments, kept for reference.
- `preview-*.png` — each fragment rendered on the banner's paper background.
- `make-banner2.js` — generator for the composed banner (run from the repo
  root so `sharp` resolves).
- `glogift-27-banner-1920x673*.{svg,png}` — composed banner outputs.
