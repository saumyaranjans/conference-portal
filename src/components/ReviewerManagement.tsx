"use client";

import { useMemo, useState } from "react";
import {
  ALPHABET,
  csvCell,
  downloadCsv,
  initialOf,
  stripSalutation,
} from "@/lib/nameIndex";

export type ReviewerAssignment = {
  paperId: string;
  trackCode: string;
  trackName: string;
  status: "invited" | "accepted" | "declined" | "submitted";
  recommendation: string | null;
  round: number | null;
  overdue: boolean;
};

export type ReviewerRow = {
  name: string;
  mobile: string | null;
  email: string;
  affiliation: string | null;
  assignments: ReviewerAssignment[];
  trackCodes: string[];
  counts: {
    assigned: number;
    invited: number;
    accepted: number;
    completed: number;
    declined: number;
    overdue: number;
  };
};

const STATUS_LABEL: Record<ReviewerAssignment["status"], string> = {
  invited: "Invited",
  accepted: "In progress",
  declined: "Declined",
  submitted: "Completed",
};
const STATUS_CLASS: Record<ReviewerAssignment["status"], string> = {
  invited: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  declined: "bg-rose-100 text-rose-800",
  submitted: "bg-emerald-100 text-emerald-800",
};

function recLabel(r: string | null): string {
  if (!r) return "";
  return r
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReviewerManagement({
  rows,
  tracks,
}: {
  rows: ReviewerRow[];
  tracks: { code: string; name: string }[];
}) {
  const [track, setTrack] = useState("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "all" | "invited" | "accepted" | "completed" | "declined"
  >("all");
  const [letter, setLetter] = useState("all");
  const [anaTrack, setAnaTrack] = useState("all");

  const inTrack = (r: ReviewerRow, code: string) =>
    code === "all" || r.trackCodes.includes(code);

  const analytics = useMemo(() => {
    const base = rows.filter((r) => inTrack(r, anaTrack));
    let completed = 0;
    let inProgress = 0;
    let invites = 0;
    let active = 0;
    for (const r of base) {
      completed += r.counts.completed;
      inProgress += r.counts.accepted;
      invites += r.counts.invited;
      if (r.counts.accepted > 0 || r.counts.completed > 0) active += 1;
    }
    return { reviewers: base.length, active, completed, inProgress, invites };
  }, [rows, anaTrack]);

  const { list: filtered, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (!inTrack(r, track)) return false;
      if (status !== "all") {
        const key =
          status === "completed" ? "completed" : status === "accepted" ? "accepted" : status;
        if ((r.counts as any)[key] <= 0) return false;
      }
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.assignments.some((a) => a.paperId.toLowerCase().includes(needle))
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
      `Status: ${status === "all" ? "All" : STATUS_LABEL[
        (status === "completed" ? "submitted" : status) as ReviewerAssignment["status"]
      ] ?? status}`,
      `Name starts with: ${letter === "all" ? "All" : letter}`,
    ].join("   |   ");
    const headers = [
      "Reviewer", "Mobile", "Email", "Affiliation", "Tracks", "Assigned",
      "Invited (pending)", "In progress", "Completed", "Declined", "Overdue",
      "Papers (status)",
    ];
    const data = filtered.map((r) =>
      [
        r.name, r.mobile ?? "", r.email, r.affiliation ?? "",
        r.trackCodes.join("; "),
        r.counts.assigned, r.counts.invited, r.counts.accepted,
        r.counts.completed, r.counts.declined, r.counts.overdue,
        r.assignments
          .map((a) => `${a.paperId} (${STATUS_LABEL[a.status]})`)
          .join("; "),
      ]
        .map(csvCell)
        .join(",")
    );
    downloadCsv("reviewer-management.csv", [
      csvCell(`Filters — ${filters}`),
      headers.map(csvCell).join(","),
      ...data,
    ]);
  }

  const tiles: [string, number, string][] = [
    ["Reviewers", analytics.reviewers, "border-slate-200 bg-slate-50 text-slate-700"],
    ["Active reviewers", analytics.active, "border-emerald-200 bg-emerald-50 text-emerald-800"],
    ["Reviews completed", analytics.completed, "border-blue-200 bg-blue-50 text-blue-800"],
    ["In progress", analytics.inProgress, "border-amber-200 bg-amber-50 text-amber-800"],
    ["Invites pending", analytics.invites, "border-violet-200 bg-violet-50 text-violet-800"],
  ];

  return (
    <div className="space-y-4 [&_.badge]:rounded-md">
      {/* Analytics */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Review analytics
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
          placeholder="Search reviewer, email, paper…"
          className="input min-w-[9rem] flex-1 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="input w-40 shrink-0 text-sm"
          aria-label="Status filter"
        >
          <option value="all">All (status)</option>
          <option value="invited">Has pending invite</option>
          <option value="accepted">In progress</option>
          <option value="completed">Completed</option>
          <option value="declined">Declined</option>
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
          Reviewer&apos;s Name
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
                {["Reviewer", "Assignments (Paper · Track · Status)", "Workload"].map(
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
                  <td colSpan={3} className="td py-8 text-center text-slate-400">
                    No reviewers match your filters.
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
                    {r.assignments.length === 0 ? (
                      <span className="text-xs text-slate-400">No assignments</span>
                    ) : (
                      <ul className="space-y-1">
                        {r.assignments.map((a, i) => (
                          <li key={`${r.email}-${i}`} className="text-xs">
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {a.paperId}
                            </span>
                            <span className="text-slate-400"> · {a.trackCode}</span>
                            <span className={`badge ml-2 ${STATUS_CLASS[a.status]}`}>
                              {STATUS_LABEL[a.status]}
                            </span>
                            {a.overdue && a.status === "accepted" && (
                              <span className="badge ml-1 bg-rose-100 text-rose-700">
                                Overdue
                              </span>
                            )}
                            {a.recommendation && (
                              <span className="ml-1 text-[10px] text-slate-500">
                                → {recLabel(a.recommendation)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex flex-col items-start gap-1 text-[11px]">
                      <span className="text-slate-600">
                        Assigned: <b>{r.counts.assigned}</b>
                      </span>
                      {r.counts.invited > 0 && (
                        <span className="badge bg-amber-100 text-amber-800">
                          {r.counts.invited} invited
                        </span>
                      )}
                      {r.counts.accepted > 0 && (
                        <span className="badge bg-blue-100 text-blue-800">
                          {r.counts.accepted} in progress
                        </span>
                      )}
                      {r.counts.completed > 0 && (
                        <span className="badge bg-emerald-100 text-emerald-800">
                          {r.counts.completed} completed
                        </span>
                      )}
                      {r.counts.declined > 0 && (
                        <span className="badge bg-rose-100 text-rose-800">
                          {r.counts.declined} declined
                        </span>
                      )}
                      {r.counts.overdue > 0 && (
                        <span className="badge bg-rose-100 text-rose-700">
                          {r.counts.overdue} overdue
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
