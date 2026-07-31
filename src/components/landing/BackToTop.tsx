"use client";

import { useEffect, useState } from "react";

/** How far down the page the button appears, in pixels. */
const REVEAL_AT = 480;

/**
 * A floating "back to top" control. It stays out of the way until the visitor
 * has scrolled past the hero, since there is nothing to go back to before
 * that.
 *
 * Visibility is driven by an IntersectionObserver watching a marker pinned
 * near the top of the document, rather than by a scroll handler: the browser
 * reports the crossing itself, so nothing runs on every scroll frame.
 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const marker = document.createElement("div");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = `position:absolute;top:${REVEAL_AT}px;left:0;width:1px;height:1px;pointer-events:none;`;
    document.body.prepend(marker);

    const io = new IntersectionObserver(([entry]) =>
      setShow(!entry.isIntersecting),
    );
    io.observe(marker);
    return () => {
      io.disconnect();
      marker.remove();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          // Respect a reduced-motion preference rather than animating regardless.
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      aria-label="Back to top"
      title="Back to top"
      className={`fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full
                  bg-blue-700 text-white shadow-lg transition-all duration-300
                  hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300
                  ${
                    show
                      ? "opacity-100 translate-y-0"
                      : "pointer-events-none opacity-0 translate-y-3"
                  }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
