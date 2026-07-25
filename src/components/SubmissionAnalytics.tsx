import { DataTable } from "@/components/ui/Primitives";

export type AnalyticsRow = {
  stage: string;
  status: string;
  submission_type: string;
  tracks?: { name: string; code: string } | null;
};

type Counts = {
  submitted: number;
  accepted: number;
  rejected: number;
  action: number;
};

/** An abstract has cleared its gate if it moved to the full-paper stage, or
 * it is an abstract-only entry that was finally accepted. */
const abstractAccepted = (r: AnalyticsRow) =>
  r.stage === "full_paper" ||
  (r.submission_type === "abstract_presentation" && r.status === "accepted");

/** A full-paper entry that has cleared the abstract stage. */
const enteredFull = (r: AnalyticsRow) =>
  r.submission_type === "full_paper_presentation" && r.stage === "full_paper";

function tally(rows: AnalyticsRow[]): { abstract: Counts; full: Counts } {
  const live = rows.filter(
    (r) => r.status !== "withdrawn" && r.status !== "draft"
  );

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
}) {
  const overall = tally(rows);

  // group by track for the breakdown table
  const groups = new Map<string, AnalyticsRow[]>();
  for (const r of rows) {
    const key = r.tracks ? `${r.tracks.code} · ${r.tracks.name}` : "No track";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  const trackRows = [...groups.entries()]
    .map(([name, rs]) => ({ name, ...tally(rs) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <StageCards title="Abstract submissions" c={overall.abstract} />
      <StageCards title="Full paper submissions" c={overall.full} />

      {perTrack && trackRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            By track
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
