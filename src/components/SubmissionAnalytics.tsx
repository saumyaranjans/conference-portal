import { DataTable } from "@/components/ui/Primitives";

export type AnalyticsRow = {
  stage: string;
  status: string;
  submission_type: string;
  participation_mode?: string;
  tracks?: { name: string; code: string } | null;
};

type Counts = {
  submitted: number;
  accepted: number;
  rejected: number;
  action: number;
};

const isLive = (r: AnalyticsRow) =>
  r.status !== "withdrawn" && r.status !== "draft";

/** An abstract has cleared its gate if it moved to the full-paper stage, or
 * it is an abstract-only entry that was finally accepted. */
const abstractAccepted = (r: AnalyticsRow) =>
  r.stage === "full_paper" ||
  (r.submission_type === "abstract_presentation" && r.status === "accepted");

/** A full-paper entry that has cleared the abstract stage. */
const enteredFull = (r: AnalyticsRow) =>
  r.submission_type === "full_paper_presentation" && r.stage === "full_paper";

function tally(rows: AnalyticsRow[]): { abstract: Counts; full: Counts } {
  const live = rows.filter(isLive);

  const abstract: Counts = {
    submitted: live.length,
    accepted: live.filter(abstractAccepted).length,
    rejected: live.filter((r) => r.stage === "abstract" && r.status === "rejected")
      .length,
    action: live.filter(
      (r) =>
        r.stage === "abstract" &&
        ["submitted", "under_review", "revisions_requested"].includes(r.status)
    ).length,
  };

  const full: Counts = {
    submitted: live.filter((r) => enteredFull(r) && r.status !== "abstract_accepted")
      .length,
    accepted: live.filter((r) => enteredFull(r) && r.status === "accepted").length,
    rejected: live.filter((r) => enteredFull(r) && r.status === "rejected").length,
    action: live.filter(
      (r) =>
        enteredFull(r) &&
        ["abstract_accepted", "submitted", "under_review", "revisions_requested"].includes(
          r.status
        )
    ).length,
  };

  return { abstract, full };
}

/** Participation mode (online / on-site) × submission type (abstract-only /
 * abstract+full-paper). This is what the organisers plan logistics around. */
type Mix = { abstract: number; full: number };
function participationMatrix(rows: AnalyticsRow[]): {
  online: Mix;
  onsite: Mix;
} {
  const live = rows.filter(isLive);
  const cell = (mode: string, type: string) =>
    live.filter(
      (r) => r.participation_mode === mode && r.submission_type === type
    ).length;
  return {
    online: {
      abstract: cell("virtual", "abstract_presentation"),
      full: cell("virtual", "full_paper_presentation"),
    },
    onsite: {
      abstract: cell("onsite", "abstract_presentation"),
      full: cell("onsite", "full_paper_presentation"),
    },
  };
}

const mixTotal = (m: Mix) => m.abstract + m.full;

/** One stacked horizontal bar for a participation mode: Abstract-only (blue) +
 * Abstract+Full-paper (amber). Length is scaled to the busiest mode; every
 * segment is directly labelled so identity never rests on colour alone. */
function ModeBar({ label, mix, max }: { label: string; mix: Mix; max: number }) {
  const total = mixTotal(mix);
  const pct = (n: number) => (max > 0 ? `${(n / max) * 100}%` : "0%");
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-sm text-slate-600">{label}</div>
      <div className="flex-1 flex items-center gap-0.5 h-7 min-w-0">
        {mix.abstract > 0 && (
          <div
            className="h-full rounded-md bg-blue-600 dark:bg-blue-400 flex items-center justify-end px-1.5 text-[11px] font-semibold text-white"
            style={{ width: pct(mix.abstract) }}
            title={`Abstract only: ${mix.abstract}`}
          >
            {mix.abstract}
          </div>
        )}
        {mix.full > 0 && (
          <div
            className="h-full rounded-md bg-amber-600 dark:bg-amber-500 flex items-center justify-end px-1.5 text-[11px] font-semibold text-white"
            style={{ width: pct(mix.full) }}
            title={`Abstract + Full paper: ${mix.full}`}
          >
            {mix.full}
          </div>
        )}
        {total === 0 && (
          <span className="text-xs text-slate-400">No submissions</span>
        )}
      </div>
      <div className="w-8 shrink-0 text-right text-sm font-semibold text-slate-800">
        {total}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`inline-block w-3 h-3 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function StageCards({ title, c }: { title: string; c: Counts }) {
  const tiles: [string, number, string][] = [
    ["Submitted", c.submitted, "text-slate-900"],
    ["Accepted", c.accepted, "text-emerald-700"],
    ["Rejected", c.rejected, "text-red-600"],
    ["Requires action", c.action, "text-amber-600"],
  ];
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value, color]) => (
          <div key={label} className="card card-pad">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubmissionAnalytics({
  rows,
  perTrack = true,
}: {
  rows: AnalyticsRow[];
  perTrack?: boolean;
  /** Deprecated: the participation section is always shown now. Kept so
   *  existing callers passing showChoices still type-check. */
  showChoices?: boolean;
}) {
  const overall = tally(rows);
  const matrix = participationMatrix(rows);
  const maxMode = Math.max(mixTotal(matrix.online), mixTotal(matrix.onsite), 1);

  const colAbstract = matrix.online.abstract + matrix.onsite.abstract;
  const colFull = matrix.online.full + matrix.onsite.full;
  const grand = colAbstract + colFull;

  // group by track for the breakdowns
  const groups = new Map<string, AnalyticsRow[]>();
  for (const r of rows) {
    const key = r.tracks ? `${r.tracks.code} · ${r.tracks.name}` : "No track";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  const trackRows = [...groups.entries()]
    .map(([name, rs]) => ({ name, ...tally(rs), mix: participationMatrix(rs) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      {/* -------- Headline counts -------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card card-pad">
          <p className="text-xs text-slate-500">Abstracts submitted</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">
            {overall.abstract.submitted}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs text-slate-500">Full papers submitted</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">
            {overall.full.submitted}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs text-slate-500">Online participants</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">
            {mixTotal(matrix.online)}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-xs text-slate-500">On-site participants</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">
            {mixTotal(matrix.onsite)}
          </p>
        </div>
      </div>

      {/* -------- Participation: mode × submission type -------- */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Participation preference
        </p>
        <p className="text-xs text-slate-500 mb-3">
          How many online vs on-site participants chose abstract-only vs
          abstract&nbsp;+&nbsp;full-paper submission.
        </p>

        <div className="card card-pad space-y-4">
          <div className="flex flex-wrap gap-4">
            <LegendDot
              className="bg-blue-600 dark:bg-blue-400"
              label="Abstract only"
            />
            <LegendDot
              className="bg-amber-600 dark:bg-amber-500"
              label="Abstract + Full paper"
            />
          </div>
          <div className="space-y-2">
            <ModeBar label="Online" mix={matrix.online} max={maxMode} />
            <ModeBar label="On-site" mix={matrix.onsite} max={maxMode} />
          </div>

          {/* Exact cross-tab with totals */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-t border-slate-100 mt-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Mode</th>
                  <th className="py-2 px-4 font-semibold">Abstract only</th>
                  <th className="py-2 px-4 font-semibold">Abstract + Full paper</th>
                  <th className="py-2 pl-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Online</td>
                  <td className="py-2 px-4">{matrix.online.abstract}</td>
                  <td className="py-2 px-4">{matrix.online.full}</td>
                  <td className="py-2 pl-4 text-right font-semibold">
                    {mixTotal(matrix.online)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">On-site</td>
                  <td className="py-2 px-4">{matrix.onsite.abstract}</td>
                  <td className="py-2 px-4">{matrix.onsite.full}</td>
                  <td className="py-2 pl-4 text-right font-semibold">
                    {mixTotal(matrix.onsite)}
                  </td>
                </tr>
                <tr className="font-semibold text-slate-900">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 px-4">{colAbstract}</td>
                  <td className="py-2 px-4">{colFull}</td>
                  <td className="py-2 pl-4 text-right">{grand}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* -------- Stage outcomes -------- */}
      <div className="space-y-6">
        <StageCards title="Abstract submissions" c={overall.abstract} />
        <StageCards title="Full paper submissions" c={overall.full} />
      </div>

      {/* -------- Per-track participation split -------- */}
      {perTrack && trackRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Participation by track
          </p>
          <DataTable
            headers={[
              "Track",
              "Online · Abs",
              "Online · Full",
              "On-site · Abs",
              "On-site · Full",
              "Total",
            ]}
          >
            {trackRows.map((t) => {
              const total = mixTotal(t.mix.online) + mixTotal(t.mix.onsite);
              return (
                <tr key={t.name} className="hover:bg-slate-50">
                  <td className="td font-medium text-slate-900">{t.name}</td>
                  <td className="td text-blue-700">{t.mix.online.abstract}</td>
                  <td className="td text-amber-700">{t.mix.online.full}</td>
                  <td className="td text-blue-700">{t.mix.onsite.abstract}</td>
                  <td className="td text-amber-700">{t.mix.onsite.full}</td>
                  <td className="td font-semibold">{total}</td>
                </tr>
              );
            })}
          </DataTable>
        </div>
      )}

      {/* -------- Per-track decision outcomes -------- */}
      {perTrack && trackRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Decisions by track
          </p>
          <DataTable
            headers={[
              "Track",
              "Abs. submitted",
              "Abs. accepted",
              "Abs. rejected",
              "Abs. action",
              "FP submitted",
              "FP accepted",
              "FP rejected",
              "FP action",
            ]}
          >
            {trackRows.map((t) => (
              <tr key={t.name} className="hover:bg-slate-50">
                <td className="td font-medium text-slate-900">{t.name}</td>
                <td className="td">{t.abstract.submitted}</td>
                <td className="td text-emerald-700">{t.abstract.accepted}</td>
                <td className="td text-red-600">{t.abstract.rejected}</td>
                <td className="td text-amber-600">{t.abstract.action}</td>
                <td className="td">{t.full.submitted}</td>
                <td className="td text-emerald-700">{t.full.accepted}</td>
                <td className="td text-red-600">{t.full.rejected}</td>
                <td className="td text-amber-600">{t.full.action}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
