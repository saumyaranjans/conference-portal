import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GeoVisitMap } from "@/components/GeoVisitMap";
import { PageHeader, Section, StatCard } from "@/components/ui/Primitives";

/**
 * Website-visit analytics for the Convener.
 *
 * Four questions, in the order they get asked: how many people, when, what did
 * they read, and where did they come from. Geography answers the last one
 * partly; the trend and referrer tables answer the rest, which matters when a
 * spike needs attributing to an announcement.
 *
 * Rows are page views and distinct session ids are visitors — see
 * migration 0074. Rows predating that migration have no session id and each
 * stands for one visitor who recorded one page.
 */

/** Dates are bucketed in IST: the audience and the organisers are both there. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDate(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function dayLabel(d: string): string {
  const [, m, day] = d.split("-");
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  return `${day} ${months[Number(m) - 1]}`;
}

/** Public paths carry no query string, so the raw value is already the page. */
function pageLabel(path: string | null): string {
  if (!path || path === "/") return "Home (/)";
  return path;
}

/** A referrer is only useful as its source, not its full URL. */
function referrerHost(ref: string): string {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref.slice(0, 40);
  }
}

type Row = {
  country: string | null;
  region: string | null;
  path: string | null;
  session_id: string | null;
  referrer: string | null;
  visited_at: string;
};

/** Horizontal bar list — enough for ranked counts, and no charting dependency. */
function BarList({
  rows,
  empty,
}: {
  rows: { label: string; value: number; hint?: string }[];
  empty: string;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-slate-400">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
              {r.label}
            </span>
            <span className="shrink-0 tabular-nums font-medium text-slate-900 dark:text-white">
              {r.value}
              {r.hint && (
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {r.hint}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Daily page views for the last 30 days, including days with no traffic. */
function TrendChart({ byDay }: { byDay: Map<string, number> }) {
  const days: { date: string; n: number }[] = [];
  const today = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(new Date(`${today}T00:00:00Z`).getTime() - i * 86400000)
      .toISOString()
      .slice(0, 10);
    days.push({ date: d, n: byDay.get(d) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1"
            style={{ height: "100%" }}
          >
            <div className="flex h-full items-end">
              <div
                className={`w-full rounded-t transition-colors ${
                  d.n > 0
                    ? "bg-blue-500 group-hover:bg-blue-600"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
                style={{ height: `${d.n === 0 ? 2 : (d.n / max) * 100}%` }}
              />
            </div>
            <span
              className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2
                         whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px]
                         text-white group-hover:block"
            >
              {dayLabel(d.date)}: {d.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{dayLabel(days[0].date)}</span>
        <span>{dayLabel(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default async function VisitAnalyticsPage() {
  await requireRole("chief", "admin");
  const supabase = await createClient();

  // Read in pages. PostgREST caps a response at 1000 rows whatever .limit()
  // asks for, so this page silently analysed a 1000-row slice of the table and
  // reported it as the whole: totals stuck at exactly 1000, and days outside
  // the slice — including today — showed nothing at all.
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("site_visits")
      .select("country, region, path, session_id, referrer, visited_at")
      .order("visited_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[visit-analytics] page %d failed: %s", from / PAGE, error.message);
      break;
    }
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    // A short page is the last one. The guard stops a pathological table from
    // looping for ever.
    if (batch.length < PAGE || rows.length >= 100000) break;
  }

  const worldValues: Record<string, number> = {};
  const indiaValues: Record<string, number> = {};
  const byDay = new Map<string, number>();
  const byPage = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  const sessions = new Set<string>();
  const pageSessions = new Map<string, Set<string>>();
  let unknownGeo = 0;
  let legacyRows = 0;
  // India views whose state could not be resolved. Counted so the state map
  // can say why it totals less than "India page views" beside it.
  let indiaNoRegion = 0;

  const cutoff7 = Date.now() - 7 * 86400000;
  const cutoff30 = Date.now() - 30 * 86400000;
  let views7 = 0;
  let views30 = 0;
  const sessions7 = new Set<string>();

  rows.forEach((r, i) => {
    // A row with no session id is its own visitor (see the header comment); the
    // index keeps those synthetic keys from colliding with each other.
    const sid = r.session_id ?? `legacy-${i}`;
    if (!r.session_id) legacyRows++;
    sessions.add(sid);

    const t = new Date(r.visited_at).getTime();
    if (t >= cutoff30) views30++;
    if (t >= cutoff7) {
      views7++;
      sessions7.add(sid);
    }

    const day = istDate(r.visited_at);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const page = pageLabel(r.path);
    byPage.set(page, (byPage.get(page) ?? 0) + 1);
    if (!pageSessions.has(page)) pageSessions.set(page, new Set());
    pageSessions.get(page)!.add(sid);

    if (r.referrer) {
      const host = referrerHost(r.referrer);
      byReferrer.set(host, (byReferrer.get(host) ?? 0) + 1);
    }

    const c = (r.country ?? "").trim().toLowerCase();
    if (!c) {
      unknownGeo++;
    } else {
      worldValues[c] = (worldValues[c] ?? 0) + 1;
      if (c === "in") {
        const s = (r.region ?? "").trim().toLowerCase();
        if (s) indiaValues[s] = (indiaValues[s] ?? 0) + 1;
        else indiaNoRegion++;
      }
    }
  });

  const rank = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  const countries = Object.keys(worldValues).length;
  const states = Object.keys(indiaValues).length;
  const indiaTotal = worldValues["in"] ?? 0;

  return (
    <>
      <PageHeader
        title="Visit Analytics"
        subtitle="Traffic to glogift2027.in — how many visitors, when they came, what they read, and where they came from."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Visitors" value={sessions.size} />
        <StatCard label="Page views" value={rows.length} />
        <StatCard label="Visitors (7 days)" value={sessions7.size} />
        <StatCard label="Page views (7 days)" value={views7} />
      </div>

      <Section title="Daily page views — last 30 days">
        <TrendChart byDay={byDay} />
        <p className="mt-3 text-xs text-slate-500">
          {views30} page view{views30 === 1 ? "" : "s"} in the last 30 days ·{" "}
          {views7} in the last 7. Days are bucketed in IST.
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most-read pages">
          <BarList
            rows={rank(byPage, 12).map(([label, value]) => ({
              label,
              value,
              hint: `views · ${pageSessions.get(label)?.size ?? 0} visitors`,
            }))}
            empty="No page views recorded yet."
          />
        </Section>

        <Section title="Where visitors came from">
          <BarList
            rows={rank(byReferrer, 12).map(([label, value]) => ({
              label,
              value,
            }))}
            empty="No external referrers recorded yet. Visitors typing the address directly, or arriving from apps that strip the referrer (WhatsApp, email clients), appear here as nothing."
          />
        </Section>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        <StatCard label="Countries" value={countries} />
        <StatCard label="India page views" value={indiaTotal} />
        <StatCard label="Indian states" value={states} />
        <StatCard
          label="Outside India"
          value={rows.length - indiaTotal - unknownGeo}
        />
      </div>

      <Section title="By country — World (all time)">
        <GeoVisitMap kind="world" values={worldValues} regionLabel="Country" />
      </Section>

      <Section title="By state — India (all time)">
        <GeoVisitMap kind="india" values={indiaValues} regionLabel="State" />
      </Section>

      <div className="mt-3 space-y-1">
        {indiaNoRegion > 0 && (
          <p className="text-xs text-slate-400">
            {indiaNoRegion} Indian page view{indiaNoRegion === 1 ? "" : "s"} could
            not be resolved to a state, so the state map totals{" "}
            {indiaTotal - indiaNoRegion} rather than the {indiaTotal} shown
            above.
          </p>
        )}
        {unknownGeo > 0 && (
          <p className="text-xs text-slate-400">
            {unknownGeo} page view{unknownGeo === 1 ? "" : "s"} without a
            resolved location (e.g. local or unrecognised networks) are not shown
            on the maps.
          </p>
        )}
        {legacyRows > 0 && (
          <p className="text-xs text-slate-400">
            {legacyRows} page view{legacyRows === 1 ? "" : "s"} recorded before{" "}
            per-page tracking was added are counted as one visitor each, and
            most carry no page. Per-page and referrer figures are complete only
            from 7 August 2026 onward.
          </p>
        )}
      </div>
    </>
  );
}
