"use client";

import { useEffect, useRef, useState } from "react";

export type FaqItem = { q: string; a: string };
type Msg = { role: "bot" | "user"; text: string; chips?: string[] };

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

/* ------------------------------------------------------------------ */
/*  Matching engine — no external calls; answers strictly from the FAQ */
/* ------------------------------------------------------------------ */

const STOP = new Set([
  "the", "a", "an", "is", "are", "do", "does", "did", "i", "to", "of", "for",
  "and", "on", "in", "at", "my", "me", "you", "your", "how", "what", "when",
  "where", "who", "which", "can", "could", "will", "would", "shall", "should",
  "there", "with", "be", "it", "this", "that", "have", "has", "had", "am",
  "was", "were", "please", "tell", "about", "any", "want", "know", "need",
  "get", "give", "us", "we", "our", "or", "if", "so", "also", "much", "many",
]);

/** Light stemmer: plurals and common verb endings collapse together. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/**
 * Phrasing variants → one canonical token, so "how much does it cost",
 * "what are the charges" and "registration fees" all land on the same FAQ.
 */
const SYNONYMS: [canon: string, variants: string[]][] = [
  ["date", ["when", "day", "timing", "held", "happen", "happening", "start", "begin"]],
  ["venue", ["place", "location", "city", "campus", "held", "hosted", "sambalpur", "odisha", "india"]],
  ["fee", ["cost", "price", "charge", "payment", "pay", "amount", "expensive", "rupee", "inr", "usd", "dollar"]],
  ["deadline", ["due", "last", "closing", "cutoff", "extend", "extension"]],
  ["submit", ["submission", "upload", "send", "apply", "application"]],
  ["abstract", ["synopsis", "summary", "500"]],
  ["paper", ["manuscript", "article", "research", "study", "work"]],
  ["register", ["registration", "enrol", "enroll", "signup", "join", "attend", "attending", "participate", "participation", "seat"]],
  ["online", ["virtual", "virtually", "remote", "remotely", "hybrid", "zoom", "team", "video", "distance"]],
  ["publication", ["publish", "journal", "scopus", "springer", "proceeding", "indexed", "index", "book"]],
  ["discount", ["concession", "waiver", "cheaper", "member", "membership", "gift"]],
  ["travel", ["reach", "airport", "train", "flight", "direction", "transport", "come", "get"]],
  ["accommodation", ["stay", "hotel", "hostel", "lodging", "guesthouse", "room"]],
  ["certificate", ["certification", "certify"]],
  ["track", ["theme", "topic", "area", "domain", "field", "subject"]],
  ["review", ["reviewer", "referee", "refereed", "blind", "anonymous", "evaluation", "evaluate"]],
  ["pathway", ["path", "option", "mode", "route"]],
  ["student", ["phd", "scholar", "mba", "doctoral", "postgraduate", "ug", "pg"]],
  ["word", ["length", "limit", "count", "page"]],
  ["eligible", ["eligibility", "qualify", "who"]],
];

const CANON = new Map<string, string>();
for (const [canon, variants] of SYNONYMS) {
  for (const v of variants) CANON.set(stem(v), stem(canon));
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => {
      const st = stem(w);
      return CANON.get(st) ?? st;
    });
}

type Scored = { item: FaqItem; score: number };

/**
 * Rank FAQ entries for a free-text query: rare words count more, matches in
 * the question text count double, and an exact phrase from the query appearing
 * in a question earns a bonus. Scores are comparable across query lengths.
 */
function rank(query: string, items: FaqItem[]): Scored[] {
  const qTokens = [...new Set(tokens(query))];
  if (qTokens.length === 0) return [];

  // Document frequency per token across the FAQ (question + answer).
  const docs = items.map((it) => ({
    it,
    q: new Set(tokens(it.q)),
    a: new Set(tokens(it.a)),
  }));
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set([...d.q, ...d.a])) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const lowerQuery = query.toLowerCase();
  const rawWords = lowerQuery.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

  const scored: Scored[] = docs.map((d) => {
    let score = 0;
    for (const t of qTokens) {
      const rarity = df.get(t) ?? 0;
      const weight = rarity === 0 ? 0 : rarity === 1 ? 2 : rarity <= 3 ? 1.5 : 1;
      if (d.q.has(t)) score += weight * 2;
      else if (d.a.has(t)) score += weight;
    }
    // Phrase bonus: any consecutive word pair from the query found verbatim
    // in the FAQ question ("full paper", "early bird", "word limit"…).
    const qLower = d.it.q.toLowerCase();
    for (let i = 0; i < rawWords.length - 1; i++) {
      if (qLower.includes(`${rawWords[i]} ${rawWords[i + 1]}`)) score += 2;
    }
    // Longer queries need proportionally more evidence.
    return { item: d.it, score: score / Math.sqrt(qTokens.length) };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

const COORDINATOR =
  "Sorry, I don't have that one yet! 🙈 Try rephrasing, tap a question below, or write to the Conference Coordinator at glogift27.coordinator@iimsambalpur.ac.in and the team will help you.";

/** Greeting words incl. common informal spellings and typos (hye, hlo, gm…). */
const GREETINGS = new Set([
  "hi", "hii", "hiii", "hiiii", "hey", "heyy", "heya", "hye", "hei", "helo",
  "hello", "helloo", "hallo", "hlo", "hola", "yo", "sup", "wassup", "whatsup",
  "namaste", "namaskar", "greetings", "gm", "morning", "afternoon", "evening",
  "hai", "haii",
]);

/** Small talk first — a bot that can't say hello never feels real. */
function smallTalk(query: string): string | null {
  const q = query.toLowerCase().trim();
  const words = q.replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
  // A short message containing any greeting-ish word (in any casing or
  // spelling — "HYE", "hlo", "good morning") is a greeting.
  if (words.length <= 4 && words.some((w) => GREETINGS.has(w)))
    return "Hello! 😊 I'm Toshi — how can I help? Please choose a question from the suggestions above, or just type your own in any words: dates, submissions, fees, publication, travel or registration.";
  // "Greetings of the day", "very good morning to you" and similar openings.
  if (/(greetings of the day|greetings for the day|compliments of the day)/.test(q))
    return "Greetings of the day to you too! 🙏 I'm Toshi, your GLOGIFT 27 assistant — how can I help? Please choose a question from the suggestions above, or type your own.";
  if (/(how are you|how r u|how do you do|hows it going|how is it going|how have you been|kaise ho)/.test(q))
    return "I'm doing very well, thank you for asking! 😊 How can I help you with GLOGIFT 27 today? You can pick a question from the suggestions above or ask in your own words.";
  if (/(thank|thanks|thx|tysm|dhanyavad|shukriya|grateful|appreciate)/.test(q))
    return "You're most welcome! 😊 Happy to help — and we look forward to seeing you at IIM Sambalpur, 25–27 February 2027. 🎉 Anything else you'd like to know?";
  if (/(enjoy your day|have a (nice|good|great|lovely) (day|one|evening)|good day to you|take care|stay safe)/.test(q))
    return "Thank you — you too, have a wonderful day! ☀️ I'm here whenever you need anything about GLOGIFT 27.";
  if (/^(good night|gn|sweet dreams)\b/.test(q))
    return "Good night! 🌙 Do come back any time — I'll be right here.";
  if (/^(bye+|goodbye|see you|see ya|cya|tata|ok bye|alvida)\b/.test(q))
    return "Goodbye! 👋 Do come back if anything else comes to mind — and all the best with your submission.";
  if (/(nice to meet|pleasure to meet|glad to meet)/.test(q))
    return "Lovely to meet you too! 😊 Ask me anything about GLOGIFT 27, or tap one of the suggested questions above.";
  if (/(who are you|your name|about you|what are you|are you (a )?(bot|robot|human|real|ai))/.test(q))
    return "I'm Toshi, the GLOGIFT 27 assistant — a friendly helper here on the conference website. 🙂 I answer from the official conference information: dates, venue, submission pathways, fees, publication opportunities, travel and more.";
  if (/(help|what can you|what do you do|how does this work)/.test(q) && q.length < 45)
    return "I can answer questions about GLOGIFT 27 — dates, the venue, how to submit, fees, deadlines, publication, travel to IIM Sambalpur and more. Please choose a question from the suggestions above, or just ask in your own words!";
  if (/(sorry|my mistake|oops|nevermind|never mind)/.test(q) && q.length < 30)
    return "No problem at all! 😊 What would you like to know about GLOGIFT 27?";
  if (/(good|great|awesome|nice|perfect|excellent|super|ok thanks|okay thanks)$/.test(q) && q.length < 25)
    return "Glad that helped! 😊 Anything else about GLOGIFT 27 — submissions, fees, schedule or travel?";
  if (/(see you (at|in) (the )?(conference|sambalpur|glogift)|looking forward)/.test(q))
    return "We look forward to welcoming you at IIM Sambalpur, 25–27 February 2027! 🎉 Let me know if you need anything before then.";
  return null;
}

/** Build Toshi's reply — answer, answer+related, did-you-mean, or fallback. */
function reply(query: string, items: FaqItem[]): Msg {
  const st = smallTalk(query);
  if (st) return { role: "bot", text: st };

  const ranked = rank(query, items);
  const best = ranked[0];
  const CONFIDENT = 2.2;

  if (best && best.score >= CONFIDENT) {
    // A clearly-separated runner-up is worth offering as a follow-up.
    const second = ranked[1];
    const chips =
      second && second.score >= CONFIDENT * 0.8 && second.score >= best.score * 0.6
        ? [second.item.q]
        : undefined;
    return { role: "bot", text: best.item.a, chips };
  }

  // Medium confidence: answer anyway (Toshi should answer most questions),
  // flag it softly, and offer the nearest alternatives as one-tap chips.
  if (best && best.score >= 0.9) {
    return {
      role: "bot",
      text: `Here's the closest answer I have: ${best.item.a}`,
      chips: ranked
        .slice(1, 3)
        .filter((s) => s.score > 0.5)
        .map((s) => s.item.q),
    };
  }

  if (best) {
    return {
      role: "bot",
      text: "I'm not fully sure what you mean — did you want one of these?",
      chips: ranked.slice(0, 3).map((s) => s.item.q),
    };
  }

  return {
    role: "bot",
    text: COORDINATOR,
    chips: items.slice(0, 3).map((it) => it.q),
  };
}

/**
 * A floating GLOGIFT 27 assistant. Answers strictly from the conference FAQ
 * (no external calls) — tap a suggested question or type your own, phrased
 * however you like.
 */
export function FaqBot({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi, I'm Toshi — your GLOGIFT 27 assistant. Ask me about dates, submission, fees, publication or registration — in your own words — or tap a question above.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, open]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

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
    if (!query || typing) return;
    setMsgs((m) => [...m, { role: "user", text: query }]);
    setInput("");
    // A short, length-scaled "typing…" pause makes the exchange feel human.
    setTyping(true);
    const answer = reply(query, items);
    typingTimer.current = setTimeout(() => {
      setMsgs((m) => [...m, answer]);
      setTyping(false);
    }, 450 + Math.min(answer.text.length * 4, 700));
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
            {/* Suggested questions — above the conversation */}
            <div className="pb-1">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Suggested questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {/* Show a curated handful — Toshi can answer far more than
                    these; the full knowledge base is searched on every ask. */}
                {items.slice(0, 8).map((it) => (
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

            {/* Conversation — questions above, responses below */}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[85%] space-y-1.5">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {m.text}
                  </div>
                  {/* Follow-up / did-you-mean chips under a bot bubble */}
                  {m.role === "bot" && m.chips && m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => ask(c)}
                          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-left text-[11px] text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-slate-800">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
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
              placeholder="Ask in your own words…"
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
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0e7490] py-1 pl-1 pr-3 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <span
          className={`grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/20 ${
            open ? "" : "animate-bounce"
          }`}
        >
          {open ? (
            <span className="text-sm">✕</span>
          ) : (
            <ToshiAvatar className="h-6 w-6" />
          )}
        </span>
        <span>{open ? "Close" : "Ask Toshi"}</span>
      </button>
    </>
  );
}
