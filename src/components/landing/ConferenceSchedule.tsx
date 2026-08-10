import Link from "next/link";

import { IkatStrip } from "@/components/landing/IkatStrip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SchedulePdfButton } from "@/components/landing/SchedulePdfButton";

/**
 * The GLOGIFT 27 conference schedule — a 3-day timetable (Gantt-style grid)
 * over 25–27 February 2027, working 10:00–18:00 each day.
 *
 * Rules encoded here:
 *  • Every session block is 90 minutes.
 *  • Day 1 opens with the Conference Inaugural; Day 3 closes with the
 *    Conference Valedictory.
 *  • Short breaks: Morning High Tea & Evening High Tea. Long break: Lunch.
 *  • On-site plenary/special events run in the Main Hall.
 *  • On-site Track Sessions usually alternate with the on-site special events,
 *    so a delegate can attend both. Where a slot lists several on-site blocks
 *    they genuinely run in parallel and a delegate must choose.
 *  • Online Track Sessions run in PARALLEL to the on-site events (online
 *    delegates are not on campus for the on-site programme).
 *  • Gala Dinner: Day 1, 20:00–23:00.
 *
 * Rooms (on-site) and meeting links (online) for the track sessions are managed
 * from Event Management in the Convener / Editorial Office dashboards.
 */

type Block = { title: string; note?: string; kind: Kind; icon?: string };
type Kind =
  | "inaugural"
  | "valedictory"
  | "plenary"
  | "editor-talk"
  | "onsite-track"
  | "online-track"
  | "registration";

type Row =
  | {
      type: "break";
      label: string;
      time: string;
      long?: boolean;
      icon?: string;
      venue?: string;
    }
  | {
      type: "slot";
      time: string;
      full?: Block;
      /** One block, or several running in parallel in that column. */
      onsite?: Block | Block[];
      online?: Block | Block[];
    };

type Day = {
  date: string;
  weekday: string;
  rows: Row[];
  gala?: { time: string; title: string; note: string };
};

const REGISTRATION: Row = {
  type: "slot",
  time: "All day",
  full: {
    title: "Registration Desk",
    note: "Konark auditorium lobby area · runs in parallel, all day",
    kind: "registration",
  },
};
const BREAKFAST: Row = {
  type: "slot",
  time: "08:30 – 09:50",
  full: {
    title: "Morning Breakfast",
    note: "Community Centre",
    kind: "registration",
    icon: "🍽",
  },
};
const MORNING_TEA: Row = {
  type: "slot",
  time: "11:30 – 12:00",
  full: {
    title: "Morning High Tea",
    note: "Academic block lobby area",
    kind: "registration",
    icon: "☕",
  },
};
const LUNCH: Row = {
  type: "slot",
  time: "13:30 – 14:30",
  full: {
    title: "Lunch",
    note: "Community",
    kind: "registration",
    icon: "🍽",
  },
};
const EVENING_TEA: Row = {
  type: "slot",
  time: "16:00 – 16:30",
  full: {
    title: "Evening High Tea",
    note: "Academic block lobby area",
    kind: "registration",
    icon: "☕",
  },
};

/** A column may hold one block or several; normalise to a list. */
const toBlocks = (b?: Block | Block[]): Block[] =>
  b ? (Array.isArray(b) ? b : [b]) : [];

const ONLINE: Block = {
  title: "Track Sessions",
  note: "Virtual rooms · paper presentations",
  kind: "online-track",
};
const ONSITE_TRACK: Block = {
  title: "Track Sessions",
  note: "Classroom rooms · paper presentations",
  kind: "onsite-track",
};

const DAYS: Day[] = [
  {
    date: "25 February 2027",
    weekday: "Day 1",
    rows: [
      {
        type: "slot",
        time: "10:00 – 11:30",
        full: {
          title: "Conference Inaugural",
          note: "Konark auditorium",
          kind: "inaugural",
        },
      },
      MORNING_TEA,
      {
        type: "slot",
        time: "12:00 – 13:30",
        onsite: {
          title: "AI Leadership Forum",
          note: "Konark seminar hall · special session",
          kind: "plenary",
        },
        online: ONLINE,
      },
      LUNCH,
      {
        type: "slot",
        time: "14:30 – 16:00",
        onsite: ONSITE_TRACK,
        online: ONLINE,
      },
      EVENING_TEA,
      {
        type: "slot",
        time: "16:30 – 18:00",
        // Three things run at once here: the colloquium, the on-site track
        // sessions and the online track sessions.
        onsite: [
          {
            title: "Doctoral Colloquium for Emerging Researchers",
            note: "Konark seminar hall · special session",
            kind: "plenary",
          },
          ONSITE_TRACK,
        ],
        online: ONLINE,
      },
    ],
    gala: {
      time: "20:00 – 23:00",
      title: "Gala Dinner",
      note: "Director's residence · networking dinner for all delegates",
    },
  },
  {
    date: "26 February 2027",
    weekday: "Day 2",
    rows: [
      {
        type: "slot",
        time: "10:00 – 11:30",
        onsite: {
          title: "Directors' Panel on Leadership in an AI-Driven Economy",
          note: "Konark auditorium · special session",
          kind: "plenary",
        },
        online: ONLINE,
      },
      MORNING_TEA,
      {
        type: "slot",
        time: "12:00 – 13:30",
        onsite: ONSITE_TRACK,
        online: ONLINE,
      },
      LUNCH,
      {
        type: "slot",
        time: "14:30 – 16:00",
        onsite: ONSITE_TRACK,
        online: ONLINE,
      },
      EVENING_TEA,
      {
        type: "slot",
        time: "16:30 – 18:00",
        onsite: ONSITE_TRACK,
        online: ONLINE,
      },
    ],
  },
  {
    date: "27 February 2027",
    weekday: "Day 3",
    rows: [
      {
        type: "slot",
        time: "10:00 – 11:30",
        onsite: {
          title: "Talk with Editors of Top-Tier Journals",
          note: "Konark seminar hall · special session",
          kind: "editor-talk",
        },
        online: ONLINE,
      },
      MORNING_TEA,
      {
        type: "slot",
        time: "12:00 – 13:30",
        onsite: ONSITE_TRACK,
        online: ONLINE,
      },
      LUNCH,
      {
        type: "slot",
        time: "14:30 – 16:00",
        full: {
          title: "Conference Valedictory",
          note: "Konark auditorium",
          kind: "valedictory",
        },
      },
    ],
  },
];

const KIND_CLASS: Record<Kind, string> = {
  inaugural:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100",
  valedictory:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100",
  plenary:
    "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100",
  "editor-talk":
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
  "onsite-track":
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
  "online-track":
    "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-100",
  registration:
    "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100",
};

/** Meals and the registration desk are neither on-site nor online in a way a
 *  delegate must choose between, so they carry no badge. */
const MODE_OF: Partial<Record<Kind, "On-site" | "Online">> = {
  inaugural: "On-site",
  valedictory: "On-site",
  plenary: "On-site",
  "editor-talk": "On-site",
  "onsite-track": "On-site",
  "online-track": "Online",
};

function BlockCard({ block }: { block: Block }) {
  const mode = MODE_OF[block.kind];
  return (
    <div className={`flex h-full min-h-[4.5rem] flex-col justify-center rounded-lg border px-3 py-2 ${KIND_CLASS[block.kind]}`}>
      {mode && (
        <span className="mb-1 w-fit rounded-full border border-current/25 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide opacity-80">
          {mode}
        </span>
      )}
      <p className="text-sm font-semibold leading-snug">
        {block.icon && <span aria-hidden className="mr-1">{block.icon}</span>}
        {block.title}
      </p>
      {block.note && <p className="mt-0.5 text-[11px] opacity-80">{block.note}</p>}
    </div>
  );
}

function BreakRow({
  label,
  time,
  long,
  icon,
  venue,
}: {
  label: string;
  time: string;
  long?: boolean;
  icon?: string;
  venue?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
      <span aria-hidden>{icon ?? (long ? "🍽" : "☕")}</span>
      <span>{label}</span>
      <span className="opacity-70">· {time}</span>
      {venue && <span className="opacity-70">· {venue}</span>}
    </div>
  );
}

export function ConferenceSchedule() {
  return (
    <main className="min-h-screen">
      <IkatStrip />

      <nav className="no-print max-w-6xl mx-auto px-4 pt-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 11l9-8 9 8M6 10v10h12V10" />
          </svg>
          Home
        </Link>
        {/* px-3 below sm keeps the whole row within a 320px viewport;
            whitespace-nowrap stops the "Sign up" label wrapping to two lines. */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-secondary min-h-11 whitespace-nowrap px-3 py-1.5 text-sm sm:px-4">
            Login
          </Link>
          <Link href="/signup" className="btn-primary min-h-11 whitespace-nowrap px-3 py-1.5 text-sm sm:px-4">
            Sign up
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-8">
        <section className="card card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
                GLOGIFT 27 · IIM SAMBALPUR
              </p>
              <h1 className="text-3xl font-bold text-gradient mb-3">
                Conference Schedule
              </h1>
            </div>
            <SchedulePdfButton />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(
              [
                ["inaugural", "Inaugural / Valedictory"],
                ["plenary", "On-site special session"],
                ["editor-talk", "Talk with Editors"],
                ["onsite-track", "Track Sessions — on-site"],
                ["online-track", "Track Sessions — online"],
              ] as [Kind, string][]
            ).map(([k, label]) => (
              <span
                key={k}
                className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium ${KIND_CLASS[k]}`}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {DAYS.map((day) => (
          <section key={day.date} className="card card-pad">
            <div className="mb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {day.weekday}
                <span className="ml-2 text-sm font-medium text-slate-500">
                  {day.date}
                </span>
              </h2>
            </div>

            <div className="flex h-full flex-col gap-2">
              {[REGISTRATION, BREAKFAST, ...day.rows].map((row, i) => {
                // Everything happening simultaneously in this slot.
                const parallel =
                  row.type === "slot"
                    ? [...toBlocks(row.onsite), ...toBlocks(row.online)]
                    : [];
                return row.type === "break" ? (
                  <div key={i} className="sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-2">
                    <div className="hidden items-center text-xs text-slate-500 sm:flex">
                      {row.time}
                    </div>
                    <BreakRow
                      label={row.label}
                      time={row.time}
                      long={row.long}
                      icon={row.icon}
                      venue={row.venue}
                    />
                  </div>
                ) : (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[7.5rem_1fr_1fr]"
                  >
                    <div className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                      {row.time}
                    </div>
                    {row.full ? (
                      <div className="sm:col-span-2">
                        <BlockCard block={row.full} />
                      </div>
                    ) : parallel.length > 2 ? (
                      /* More than two things at once: give every block the same
                         width across the whole content area, rather than
                         cramming the extras into one half. */
                      <div
                        className="grid gap-2 sm:col-span-2"
                        style={{
                          gridTemplateColumns: `repeat(${parallel.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {parallel.map((b, j) => (
                          <BlockCard key={j} block={b} />
                        ))}
                      </div>
                    ) : (
                      <>
                        {toBlocks(row.onsite).length ? (
                          <BlockCard block={toBlocks(row.onsite)[0]} />
                        ) : (
                          <div className="hidden rounded-lg border border-dashed border-slate-200 sm:block dark:border-slate-700" />
                        )}
                        {toBlocks(row.online).length ? (
                          <BlockCard block={toBlocks(row.online)[0]} />
                        ) : (
                          <div className="hidden rounded-lg border border-dashed border-slate-200 sm:block dark:border-slate-700" />
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {day.gala && (
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-[7.5rem_1fr]">
                  <div className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    {day.gala.time}
                  </div>
                  <div className="rounded-lg border border-rose-300 bg-gradient-to-r from-rose-50 to-amber-50 px-3 py-2 dark:border-rose-500/40 dark:from-rose-500/10 dark:to-amber-500/10">
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                      🎉 {day.gala.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-rose-800/80 dark:text-rose-200/80">
                      {day.gala.note}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}

        <p className="pb-6 text-center text-xs text-slate-400">
          Session rooms and joining links are published closer to the conference.
          Programme subject to change.
        </p>
      </div>
    </main>
  );
}
