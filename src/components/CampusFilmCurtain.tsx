"use client";

import { useState } from "react";

/**
 * The campus film behind a theatre curtain.
 *
 * The curtain takes the PAGE's weight, not the teal panel's: pale in the light
 * theme, dark in the dark one. A saturated green block sat on the landing page
 * like a hole punched in it — the film is the thing meant to draw the eye, and
 * before it plays this should be quiet. A trace of teal keeps it related to the
 * panel beside it without competing with it.
 *
 * It is also a facade: YouTube is not embedded until someone asks for it.
 * The old markup mounted the iframe on every landing-page load, which pulled
 * player JS and set cookies for visitors who never watched — most of them.
 *
 * Anyone who prefers reduced motion gets the curtain out of the way at once
 * rather than a 1.1s sweep.
 */

const VIDEO_ID = "FOFb0ebu2Vw";

/**
 * Pleats — soft light/shade bands that read as folded fabric.
 *
 * Applied to a child layer, never to the curtain itself: `background-image`
 * set inline would replace the Tailwind gradient rather than sit over it, and
 * the curtain rendered black. It also has to stay a class-driven gradient so
 * it can differ between light and dark themes, which an inline style cannot.
 *
 * Gentle on purpose. At the old strength a pale fabric read as corrugated
 * metal rather than cloth.
 */
const PLEATS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.02) 7px, " +
  "rgba(255,255,255,0.30) 15px, rgba(0,0,0,0.02) 23px, rgba(0,0,0,0.10) 30px)";

export function CampusFilmCurtain() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative aspect-video min-h-[220px] w-full min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950 lg:aspect-auto lg:h-full lg:min-h-0">
      {/* Mounted only once asked for, so the curtain never parts on nothing. */}
      {open && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0&autoplay=1`}
          title="The IIM Sambalpur Story: A beacon of academic excellence, innovation and inclusivity"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      )}

      {/* Two panels that sweep apart. Kept mounted after opening so the sweep
          can finish; pointer-events go away immediately so a mid-animation
          click lands on the player, not the curtain. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${
          open ? "opacity-0 delay-[1100ms]" : "opacity-100"
        }`}
      >
        {(["left", "right"] as const).map((side) => (
          <div
            key={side}
            className={`absolute inset-y-0 w-1/2 bg-gradient-to-br
                        from-slate-100 via-teal-50 to-slate-200
                        shadow-[inset_0_0_50px_rgba(15,60,55,0.10)] transition-transform
                        duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]
                        motion-reduce:duration-0
                        dark:from-slate-900 dark:via-teal-950 dark:to-slate-900
                        dark:shadow-[inset_0_0_50px_rgba(0,0,0,0.45)]
                        ${side === "left" ? "left-0" : "right-0"}
                        ${open ? (side === "left" ? "-translate-x-full" : "translate-x-full") : "translate-x-0"}`}
          >
            <div
              className="absolute inset-0 opacity-50 dark:opacity-40"
              style={{ backgroundImage: PLEATS }}
            />
          </div>
        ))}

        {/* A thread where the two halves meet, so the seam is a deliberate
            line rather than a rendering artefact. */}
        <div
          className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-teal-700/25
                      transition-opacity duration-300 dark:bg-amber-200/25
                      ${open ? "opacity-0" : "opacity-100"}`}
        />
      </div>

      {/* The control. Sits above the curtain and leaves with it. Ink on a pale
          curtain, light on a dark one — the same reason the curtain flips. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
                     text-teal-900 transition focus:outline-none focus-visible:ring-2
                     focus-visible:ring-teal-600 focus-visible:ring-offset-2
                     focus-visible:ring-offset-slate-100 dark:text-slate-100
                     dark:focus-visible:ring-amber-200 dark:focus-visible:ring-offset-slate-950"
          aria-label="Play the IIM Sambalpur Story film"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full border
                       border-teal-800/25 bg-white/60 shadow-sm backdrop-blur-sm transition
                       group-hover:scale-105 group-hover:bg-white/80
                       dark:border-white/25 dark:bg-white/10 dark:group-hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-900/70 dark:text-slate-300/80">
            Play film
          </span>
        </button>
      )}
    </div>
  );
}
