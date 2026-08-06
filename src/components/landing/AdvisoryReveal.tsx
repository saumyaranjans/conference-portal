"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals the rest of the conference committee beneath the four leaders.
 *
 * Collapsed, the list is fully closed rather than peeking: a half-shown row of
 * faded portraits reads as a rendering fault, not an invitation.
 *
 * The control fades out once the section leaves the viewport: an offer to
 * expand something no longer on screen is clutter, and a reader who has scrolled
 * on has answered the question.
 */
export function AdvisoryReveal({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [inView, setInView] = useState(true);
  const [fullHeight, setFullHeight] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animating to a measured height rather than an arbitrary max-height keeps
  // the transition the same speed however long the list grows.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setFullHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "-80px 0px -35% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="relative mt-4">
      <div
        className="relative overflow-hidden transition-[height] duration-500 ease-out"
        style={{ height: expanded ? fullHeight || undefined : 0 }}
      >
        <div ref={contentRef}>{children}</div>

      </div>

      <div
        className={`mt-5 flex justify-center transition-opacity duration-300 ${
          inView ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="group inline-flex items-center gap-2 rounded-full border border-blue-200
                     bg-white/90 px-5 py-2 text-sm font-semibold shadow-sm backdrop-blur
                     transition hover:border-blue-400 hover:shadow-md
                     dark:border-blue-500/40 dark:bg-slate-900/90"
        >
          <span className="text-gradient">
            {expanded ? "Show fewer" : "Show all committee members"}
          </span>
          <span
            className={`grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white
                        transition-transform duration-300 group-hover:scale-110 ${
                          expanded ? "rotate-180" : ""
                        }`}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
