"use client";

import { useEffect, useRef, useState } from "react";

export type FaqItem = { q: string; a: string };
type Msg = { role: "bot" | "user"; text: string };

/** Toshi — a cute Indian girl (wheatish skin, black hair, small bindi). */
function ToshiAvatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {/* hair */}
      <circle cx="24" cy="23" r="15" fill="#1f1714" />
      {/* face (wheatish) */}
      <circle cx="24" cy="27" r="12" fill="#E4B78B" />
      {/* fringe */}
      <path
        d="M11 25 C13 15 18 12 24 12 C30 12 35 15 37 25 C32 19 28 18 24 18 C20 18 16 19 11 25 Z"
        fill="#1f1714"
      />
      {/* bindi */}
      <circle cx="24" cy="20.5" r="1" fill="#c0392b" />
      {/* cheeks */}
      <circle cx="16.8" cy="30" r="1.7" fill="#e88f7a" opacity="0.5" />
      <circle cx="31.2" cy="30" r="1.7" fill="#e88f7a" opacity="0.5" />
      {/* eyes */}
      <circle cx="20" cy="27.5" r="1.6" fill="#20140f" />
      <circle cx="28" cy="27.5" r="1.6" fill="#20140f" />
      {/* smile */}
      <path
        d="M20.5 32.5 Q24 35.6 27.5 32.5"
        fill="none"
        stroke="#8a5433"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const STOP = new Set([
  "the", "a", "an", "is", "are", "do", "i", "to", "of", "for", "and", "on",
  "in", "at", "my", "me", "you", "your", "how", "what", "when", "where", "who",
  "can", "will", "there", "with", "be", "it", "this", "that", "have", "has",
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Best-matching FAQ answer for a free-text query (keyword overlap). */
function answerFor(query: string, items: FaqItem[]): string {
  const qt = new Set(tokens(query));
  if (qt.size === 0) return "";
  let best: FaqItem | null = null;
  let bestScore = 0;
  for (const it of items) {
    const words = new Set([...tokens(it.q), ...tokens(it.a)]);
    let score = 0;
    for (const w of qt) if (words.has(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  if (best && bestScore >= 1) return best.a;
  return "I couldn't find that in the FAQ. Please write to the Conference Coordinator at glogift27.coordinator@iimsambalpur.ac.in and the team will help you.";
}

/**
 * A floating GLOGIFT 27 assistant. Answers strictly from the conference FAQ
 * (no external calls) — tap a suggested question or type your own.
 */
export function FaqBot({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi, I'm Toshi — your GLOGIFT 27 assistant. Ask me about dates, submission, fees, publication or registration, or tap a question below.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // Appear only after the reader scrolls to the About section; hide at the top.
  useEffect(() => {
    const onScroll = () => {
      const about = document.getElementById("about");
      const trigger = about ? about.offsetTop - 240 : 420;
      setScrolled(window.scrollY > trigger);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const visible = scrolled || open;

  function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setMsgs((m) => [
      ...m,
      { role: "user", text: query },
      { role: "bot", text: answerFor(query, items) },
    ]);
    setInput("");
  }

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-[9999] flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#1e3a8a] to-[#0e7490] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/15">
                <ToshiAvatar className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Toshi · GLOGIFT 27 Assistant</p>
                <p className="text-[10px] text-blue-100">Answers from the conference FAQ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Suggested questions */}
            <div className="pt-1">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Suggested questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((it) => (
                  <button
                    key={it.q}
                    type="button"
                    onClick={() => ask(it.q)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-left text-[11px] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {it.q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 p-2 dark:border-slate-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating launcher — top-right, revealed once you scroll to About */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Ask Toshi — FAQ assistant"}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0e7490] py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <span
          className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white/20 ${
            open ? "" : "animate-bounce"
          }`}
        >
          {open ? (
            <span className="text-lg">✕</span>
          ) : (
            <ToshiAvatar className="h-8 w-8" />
          )}
        </span>
        <span>{open ? "Close" : "Ask Toshi"}</span>
      </button>
    </>
  );
}
