"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Deadline = {
  label: string;
  /** ISO date (interpreted as end of that day, IST). */
  date: string;
  ctaLabel: string;
  ctaHref: string;
};

function endOfDayIST(iso: string): number {
  return new Date(`${iso}T23:59:59+05:30`).getTime();
}

/**
 * A live countdown to the NEXT upcoming conference deadline, with a call to
 * action. Auto-advances as deadlines pass. Renders nothing on the server /
 * before mount to avoid a hydration mismatch (time is client-only).
 */
export function DeadlineCountdown({ deadlines }: { deadlines: Deadline[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    // Stable placeholder to keep layout height before hydration.
    return <div className="h-[92px]" aria-hidden />;
  }

  const next = deadlines.find((d) => endOfDayIST(d.date) > now);
  if (!next) return null;

  const diff = Math.max(0, endOfDayIST(next.date) - now);
  const days = Math.floor(diff / 86_400_000);
  const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  const dateLabel = new Date(`${next.date}T00:00:00+05:30`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const Unit = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="min-w-[2.2ch] rounded-lg bg-white/15 px-2 py-1 text-2xl font-bold tabular-nums text-white sm:text-3xl">
        {String(v).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-blue-100">
        {l}
      </span>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0e7490] p-5 shadow-lg sm:p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200">
            {next.label} · closes {dateLabel}
          </p>
          <div className="mt-2 flex items-end justify-center gap-2 sm:justify-start">
            <Unit v={days} l="days" />
            <span className="pb-6 text-2xl font-bold text-white/60">:</span>
            <Unit v={hrs} l="hrs" />
            <span className="pb-6 text-2xl font-bold text-white/60">:</span>
            <Unit v={mins} l="min" />
            <span className="pb-6 text-2xl font-bold text-white/60">:</span>
            <Unit v={secs} l="sec" />
          </div>
        </div>
        <Link
          href={next.ctaHref}
          className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-800 shadow transition hover:bg-blue-50"
        >
          {next.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
