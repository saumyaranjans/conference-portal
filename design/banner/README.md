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

## Pencil edition

`make-banner-pencil.js` re-renders the same sketch A as graphite on sketchbook
paper: the ink palette is remapped to pencil greys, contours are stacked in
three near-coincident passes (the way a hand searches for a line), shaded
planes get hatch patterns rather than flat washes, and a turbulence filter adds
paper tooth and grain. Two variants:

- `glogift-27-banner-pencil.{svg,png}` — pure graphite.
- `glogift-27-banner-pencil-tinted.{svg,png}` — graphite with the tricolour
  hand-tinted, so the flag is the single point of colour.
