"use client";

import { useMemo, useState } from "react";
import {
  ALPHABET,
  csvCell,
  downloadCsv,
  initialOf,
  stripSalutation,
} from "@/lib/nameIndex";

export type TEChairedTrack = {
  code: string;
  name: string;
  status: "invited" | "accepted";
};
export type TEPaper = {
  paperId: string;
  trackCode: string;
  accepted: boolean;
  decided: boolean;
  decision: string | null;
};
export type TrackEditorRow = {
  name: string;
  mobile: string | null;
  email: string;
  affiliation: string | null;
  tracks: TEChairedTrack[];
  papers: TEPaper[];
  trackCodes: string[];
  counts: {
    tracksAccepted: number;
    tracksInvited: number;
    papersAssigned: number;
    awaitingAcceptance: number;
    decisionsTaken: number;
    pendingDecisions: number;
  };
};

function decLabel(d: string | null): string {
  if (!d) return "";
  return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TrackEditorManagement({
  rows,
  tracks,
}: {
  rows: TrackEditorRow[];
  tracks: { code: string; name: string }[];
}) {
  const [track, setTrack] = useState("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "invited" | "accepted">("all");
  const [letter, setLetter] = useState("all");
  const [anaTrack, setAnaTrack] = useState("all");

  const inTrack = (r: TrackEditorRow, code: string) =>
    code === "all" || r.trackCodes.includes(code);

  const analytics = useMemo(() => {
    const base = rows.filter((r) => inTrack(r, anaTrack));
    let accepted = 0;
    let papers = 0;
    let decisions = 0;
    let pending = 0;
    for (const r of base) {
      if (r.counts.tracksAccepted > 0) accepted += 1;
      papers += r.counts.papersAssigned;
      decisions += r.counts.decisionsTaken;
      pending += r.counts.pendingDecisions;
    }
    return { editors: base.length, accepted, papers, decisions, pending };
  }, [rows, anaTrack]);

  const { list: filtered, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (!inTrack(r, track)) return false;
      if (status === "accepted" && r.counts.tracksAccepted <= 0) return false;
      if (status === "invited" && r.counts.tracksInvited <= 0) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.papers.some((p) => p.paperId.toLowerCase().includes(needle)) ||
        r.trackCodes.some((c) => c.toLowerCase().includes(needle))
      );
    });
    const avail = new Set(base.map((r) => initialOf(r.name)));
    const list = (letter === "all"
      ? base
      : base.filter((r) => initialOf(r.name) === letter)
    )
      .slice()
      .sort((a, b) => stripSalutation(a.name).localeCompare(stripSalutation(b.name)));
    return { list, available: avail };
  }, [rows, track, q, status, letter]);

  function exportExcel() {
    const filters = [
      `Track: ${track === "all" ? "All tracks" : track}`,
      `Search: ${q.trim() || "—"}`,
      `Status: ${status === "all" ? "All" : status === "accepted" ? "Accepted" : "Invited (pending)"}`,
      `Name starts with: ${letter === "all" ? "All" : letter}`,
    ].join("   |   ");
    const headers = [
      "Track Editor", "Mobile", "Email", "Affiliation", "Tracks chaired",
      "Tracks accepted", "Tracks invited", "Papers assigned",
      "Awaiting acceptance", "Decisions taken", "Pending decisions",
      "Papers (Paper ID)",
    ];
    const data = filtered.map((r) =>
      [
        r.name, r.mobile ?? "", r.email, r.affiliation ?? "",
        r.tracks.map((t) => `${t.code} (${t.status})`).join("; "),
        r.counts.tracksAccepted, r.counts.tracksInvited, r.counts.papersAssigned,
        r.counts.awaitingAcceptance, r.counts.decisionsTaken,
        r.counts.pendingDecisions,
        r.papers.map((p) => p.paperId).join("; "),
      ]
        .map(csvCell)
        .join(",")
    );
    downloadCsv("track-editor-management.csv", [
      csvCell(`Filters — ${filters}`),
      headers.map(csvCell).join(","),
      ...data,
    ]);
  }

  const tiles: [string, number, string][] = [
    ["Track Editors", analytics.editors, "border-slate-200 bg-slate-50 text-slate-700"],
    ["Accepted", analytics.accepted, "border-emerald-200 bg-emerald-50 text-emerald-800"],
    ["Papers assigned", analytics.papers, "border-blue-200 bg-blue-50 text-blue-800"],
    ["Decisions taken", analytics.decisions, "border-violet-200 bg-violet-50 text-violet-800"],
    ["Pending decisions", analytics.pending, "border-amber-200 bg-amber-50 text-amber-800"],
  ];

  return (
    <div className="space-y-4 [&_.badge]:rounded-md">
      {/* Analytics */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Track editor analytics
          </h3>
          <select
            value={anaTrack}
            onChange={(e) => setAnaTrack(e.target.value)}
            className="input max-w-xs text-sm"
          >
            <option value="all">All tracks</option>
            {tracks.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([label, value, cls]) => (
            <div key={label} className={`rounded-xl border p-3 ${cls}`}>
              <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                {label}
              </p>
              <p className="mt-0.5 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="input w-36 shrink-0 text-sm sm:w-44"
        >
          <option value="all">All tracks</option>
          {tracks.map((t) => (
            <option key={t.code} value={t.code}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search editor, email, track, paper…"
          className="input min-w-[9rem] flex-1 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="input w-44 shrink-0 text-sm"
          aria-label="Status filter"
        >
          <option value="all">All (appointment)</option>
          <option value="accepted">Accepted</option>
          <option value="invited">Invited (pending)</option>
        </select>
        <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
          {filtered.length} of {rows.length}
        </span>
        <button
          type="button"
          onClick={exportExcel}
          className="btn-secondary shrink-0 whitespace-nowrap text-sm"
          title="Download the filtered list (opens in Excel); active filters are in the first row"
        >
          ⬇ Download Excel
        </button>
      </div>

      {/* A–Z index */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Track Editor&apos;s Name
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setLetter("all")}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              letter === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            All
          </button>
          {ALPHABET.map((L) => {
            const has = available.has(L);
            const active = letter === L;
            return (
              <button
                key={L}
                type="button"
                disabled={!has}
                onClick={() => setLetter(active ? "all" : L)}
                className={`w-7 rounded-md py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : has
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      : "cursor-not-allowed bg-transparent text-slate-300 dark:text-slate-700"
                }`}
              >
                {L}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                {["Track Editor", "Tracks chaired", "Papers assigned", "Workload"].map(
                  (h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="td py-8 text-center text-slate-400">
                    No track editors match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.email} className="align-top hover:bg-slate-50">
                  <td className="td whitespace-nowrap">
                    <span className="font-medium text-slate-900">{r.name}</span>
                    {r.mobile && (
                      <span className="block text-xs text-slate-500">{r.mobile}</span>
                    )}
                    <span className="block text-xs text-slate-500">{r.email}</span>
                    {r.affiliation && (
                      <span className="block text-[11px] text-slate-400">
                        {r.affiliation}
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {r.tracks.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {r.tracks.map((t, i) => (
                          <li key={`${r.email}-t-${i}`} className="text-xs">
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {t.code}
                            </span>
                            <span
                              className={`badge ml-2 ${
                                t.status === "accepted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {t.status === "accepted" ? "Accepted" : "Invited"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="td">
                    {r.papers.length === 0 ? (
                      <span className="text-xs text-slate-400">None</span>
                    ) : (
                      <ul className="space-y-1">
                        {r.papers.map((p, i) => (
                          <li key={`${r.email}-p-${i}`} className="text-xs">
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {p.paperId}
                            </span>
                            <span className="text-slate-400"> · {p.trackCode}</span>
                            {!p.accepted ? (
                              <span className="badge ml-2 bg-amber-100 text-amber-800">
                                Awaiting acceptance
                              </span>
                            ) : p.decided ? (
                              <span className="badge ml-2 bg-emerald-100 text-emerald-800">
                                {decLabel(p.decision) || "Decided"}
                              </span>
                            ) : (
                              <span className="badge ml-2 bg-blue-100 text-blue-800">
                                Pending decision
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex flex-col items-start gap-1 text-[11px]">
                      <span className="badge bg-emerald-100 text-emerald-800">
                        {r.counts.tracksAccepted} track
                        {r.counts.tracksAccepted === 1 ? "" : "s"} accepted
                      </span>
                      {r.counts.tracksInvited > 0 && (
                        <span className="badge bg-amber-100 text-amber-800">
                          {r.counts.tracksInvited} invited
                        </span>
                      )}
                      <span className="text-slate-600">
                        Papers: <b>{r.counts.papersAssigned}</b>
                      </span>
                      {r.counts.awaitingAcceptance > 0 && (
                        <span className="badge bg-amber-100 text-amber-800">
                          {r.counts.awaitingAcceptance} to accept
                        </span>
                      )}
                      {r.counts.decisionsTaken > 0 && (
                        <span className="badge bg-violet-100 text-violet-800">
                          {r.counts.decisionsTaken} decided
                        </span>
                      )}
                      {r.counts.pendingDecisions > 0 && (
                        <span className="badge bg-blue-100 text-blue-800">
                          {r.counts.pendingDecisions} pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
