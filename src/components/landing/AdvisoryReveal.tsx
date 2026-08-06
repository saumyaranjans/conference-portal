"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals the rest of the conference committee beneath the four leaders.
 *
 * The full list is long enough to bury the sections below it, so it stays
 * folded until asked for. The control disappears once the reader has scrolled
 * past the section: an offer to expand something no longer on screen is just
 * clutter, and a reader who has moved on has answered the question.
 */
export function AdvisoryReveal({
  count,
  children,
}: {
  /** How many further members are folded away, so the button can say. */
  count: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [inView, setInView] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Watch the section rather than the window: the control belongs to this
    // block, so its own position is what should decide.
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "-80px 0px -40% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <div
        // Collapsed height plus opacity, so the reveal reads as the list
        // unfolding rather than snapping into place.
        className={`grid transition-all duration-500 ease-out ${
          expanded
            ? "grid-rows-[1fr] opacity-100 mt-4"
            : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">{children}</div>
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center justify-center gap-3 transition-opacity duration-300 ${
          inView ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-2 rounded-full border-2 border-blue-600
                     bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-blue-50
                     dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className="text-gradient">
            {expanded ? "Show fewer members" : `Show all ${count} committee members`}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-blue-700 transition-transform duration-300 dark:text-blue-300 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
