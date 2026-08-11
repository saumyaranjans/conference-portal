"use client";

import { useState } from "react";

/**
 * The campus film behind a theatre curtain in the panel's own green.
 *
 * Closed, the curtain continues the teal of the block beside it, so the
 * section reads as one surface rather than a coloured card bolted to a
 * YouTube embed. Pressing play parts it and the film runs behind.
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
 */
const PLEATS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0.10) 7px, " +
  "rgba(255,255,255,0.10) 15px, rgba(0,0,0,0.10) 23px, rgba(0,0,0,0.30) 30px)";

export function CampusFilmCurtain() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative aspect-video min-h-[220px] w-full min-w-0 overflow-hidden bg-black lg:aspect-auto lg:h-full lg:min-h-0">
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
            className={`absolute inset-y-0 w-1/2 bg-gradient-to-br from-teal-800 via-teal-900 to-emerald-900
                        shadow-[inset_0_0_60px_rgba(0,0,0,0.55)] transition-transform
                        duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]
                        motion-reduce:duration-0 dark:from-teal-950 dark:via-emerald-950 dark:to-slate-900
                        ${side === "left" ? "left-0" : "right-0"}
                        ${open ? (side === "left" ? "-translate-x-full" : "translate-x-full") : "translate-x-0"}`}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{ backgroundImage: PLEATS }}
            />
          </div>
        ))}

        {/* A thread of gold where the two halves meet, so the seam is a
            deliberate line rather than a rendering artefact. */}
        <div
          className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-amber-300/40
                      transition-opacity duration-300 ${open ? "opacity-0" : "opacity-100"}`}
        />
      </div>

      {/* The control. Sits above the curtain and leaves with it. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
                     text-white transition focus:outline-none focus-visible:ring-2
                     focus-visible:ring-amber-300 focus-visible:ring-offset-2
                     focus-visible:ring-offset-teal-900"
          aria-label="Play the IIM Sambalpur Story film"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40
                       bg-white/10 backdrop-blur-sm transition group-hover:scale-105
                       group-hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Play film
          </span>
        </button>
      )}
    </div>
  );
}
