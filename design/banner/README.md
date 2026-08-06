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

## Sketch-background banner

`make-banner-sketchbg.js` composes the full banner (1920x860): sketch A is
scaled into a taller canvas with a sketched paved forecourt, given a turbulence
"hand wobble" so no line is machine-straight, and the brick fills are deepened
element-by-element (the drawing was authored as a pale wash). The conference
text sits in the clear sky at the left, where the drawing is masked to fade out.

Output: `glogift-27-banner-sketch.{svg,png}`.

## Campus-sketch banner (supplied artwork)

`campus-sketch.jpg` is the hand-drawn campus illustration supplied by the
organiser. `make-banner-user.js` composes the banner on it:

- the drawing is used WHOLE (nothing cropped), upscaled 1280x658 -> 1920x987;
- the canvas is extended 253px upward and that band is built by stretching the
  drawing's own top rows, so the join is seamless — a flat fill leaves a
  hairline seam no matter how closely the colour is matched;
- the text sits in the resulting sky, left of the flag and clear of the
  building's tallest point.

Outputs: `glogift-27-banner-campus.png` (1920x1240, full drawing) and
`glogift-27-banner-campus-wide.png` (1920x860 strip for web headers).
