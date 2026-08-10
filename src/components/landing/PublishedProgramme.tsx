import { createClient } from "@/lib/supabase/server";

/**
 * The paper-presentation programme, as published by the Convener.
 *
 * Reads the frozen snapshot taken at publish time rather than the live tables,
 * so a session being rearranged never appears half-edited to delegates: the
 * public keeps seeing the last published version until the Convener publishes
 * again.
 *
 * Renders nothing at all when no session has been published, leaving the
 * static day outline above it as the whole schedule — which is correct before
 * allocation happens.
 *
 * Joining links are absent by design; the view strips them (0076) and they
 * reach registered participants by email.
 */

type Author = {
  name?: string;
  affiliation?: string;
  corresponding?: boolean;
};
type Paper = {
  sequence?: number;
  paperId?: string;
  title?: string;
  authors?: Author[];
};
type Chair = {
  name?: string;
  designation?: string;
  affiliation?: string;
};
type Snapshot = {
  title?: string;
  mode?: "onsite" | "online";
  sessionDate?: string | null;
  timeSlot?: string | null;
  trackCode?: string | null;
  trackName?: string | null;
  academicBlock?: string | null;
  classroom?: string | null;
  papers?: Paper[];
  chairs?: Chair[];
};
type Row = {
  id: string;
  session_date: string | null;
  time_slot: string | null;
  sort_order: number | null;
  snapshot: Snapshot | null;
};

const DAY_LABELS: Record<string, string> = {
  "2027-02-25": "Day 1 · Thursday, 25 February 2027",
  "2027-02-26": "Day 2 · Friday, 26 February 2027",
  "2027-02-27": "Day 3 · Saturday, 27 February 2027",
};

function dayLabel(d: string): string {
  if (DAY_LABELS[d]) return DAY_LABELS[d];
  const parsed = new Date(`${d}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}

/** "10:00 – 11:30" sorts correctly as a string; anything odd sinks to the end. */
function slotKey(s: string | null): string {
  return s ?? "~";
}

function authorLine(authors: Author[] | undefined): string {
  if (!authors || authors.length === 0) return "";
  return authors
    .map((a) => {
      const name = a.name ?? "";
      // The asterisk convention for the corresponding author is what delegates
      // expect on a printed programme.
      return a.corresponding ? `${name}*` : name;
    })
    .filter(Boolean)
    .join(", ");
}

function SessionCard({ s }: { s: Snapshot }) {
  const online = s.mode === "online";
  const venue = online
    ? "Online"
    : [s.academicBlock, s.classroom].filter(Boolean).join(" · ") || "Venue to be announced";

  return (
    <article className="card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            {s.title}
          </h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span
              className={`badge ${
                online
                  ? "bg-violet-100 text-violet-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {online ? "Online" : "On-site"}
            </span>
            {s.trackName && <span>{s.trackName}</span>}
            <span>· {venue}</span>
          </p>
        </div>
      </div>

      {s.chairs && s.chairs.length > 0 && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold uppercase tracking-wide text-slate-400">
            {s.chairs.length > 1 ? "Session Chairs" : "Session Chair"}
          </span>
          <br />
          {s.chairs
            .map((c) =>
              [c.name, c.designation, c.affiliation].filter(Boolean).join(", ")
            )
            .join(" · ")}
        </p>
      )}

      {s.papers && s.papers.length > 0 && (
        <ol className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {s.papers.map((p, i) => (
            <li key={p.paperId ?? i} className="flex gap-2 text-sm">
              <span className="shrink-0 tabular-nums text-slate-400">
                {p.sequence ?? i + 1}.
              </span>
              <span className="min-w-0">
                <span className="text-slate-800 dark:text-slate-100">
                  {p.title}
                </span>
                {authorLine(p.authors) && (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {authorLine(p.authors)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export async function PublishedProgramme() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("published_programme")
    .select("id, session_date, time_slot, sort_order, snapshot")
    .order("session_date")
    .order("time_slot")
    .order("sort_order");

  const rows = ((data ?? []) as Row[]).filter((r) => r.snapshot);
  if (rows.length === 0) return null;

  // Day → time slot → sessions running in parallel.
  const days = new Map<string, Map<string, Row[]>>();
  for (const r of rows) {
    const d = r.session_date ?? "";
    const slot = r.time_slot ?? "";
    if (!days.has(d)) days.set(d, new Map());
    const slots = days.get(d)!;
    if (!slots.has(slot)) slots.set(slot, []);
    slots.get(slot)!.push(r);
  }

  const anyCorresponding = rows.some((r) =>
    r.snapshot?.papers?.some((p) => p.authors?.some((a) => a.corresponding))
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-12" id="programme">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        Paper Presentation Programme
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
        Track sessions with their running order. Presenting authors should
        report to their room ten minutes before the session begins. Joining
        links for online sessions are emailed to registered participants.
      </p>

      {[...days.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, slots]) => (
          <div key={day} className="mt-10">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
              {dayLabel(day)}
            </h3>

            {[...slots.entries()]
              .sort((a, b) => slotKey(a[0]).localeCompare(slotKey(b[0])))
              .map(([slot, list]) => (
                <div key={slot} className="mt-5">
                  <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {slot || "Time to be announced"}
                    {list.length > 1 && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {list.length} parallel sessions
                      </span>
                    )}
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {list.map((r) => (
                      <SessionCard key={r.id} s={r.snapshot!} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}

      {anyCorresponding && (
        <p className="mt-8 text-xs text-slate-400">
          * Corresponding author.
        </p>
      )}
    </section>
  );
}
