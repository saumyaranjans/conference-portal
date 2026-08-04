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
  pathway: "A" | "B";
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
    pathwayA: number;
    pathwayB: number;
  };
};

const PATHWAY_CLASS: Record<"A" | "B", string> = {
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  B: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
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
  const [pathway, setPathway] = useState<"all" | "A" | "B">("all");
  const [letter, setLetter] = useState("all");
  const [anaTrack, setAnaTrack] = useState("all");
  const [anaPathway, setAnaPathway] = useState<"all" | "A" | "B">("all");

  const inTrack = (r: ReviewerRow, code: string) =>
    code === "all" || r.trackCodes.includes(code);

  // Computed per-assignment so the pathway/track filter scopes the counts.
  const analytics = useMemo(() => {
    const reviewers = new Set<string>();
    const active = new Set<string>();
    let completed = 0;
    let inProgress = 0;
    let invites = 0;
    // Decision breakdown by pathway (from submitted reviews). Scoped by track
    // only, so both pathways always show — they are the split.
    const rec = {
      A: { accept: 0, revision: 0, reject: 0 },
      B: { accept: 0, revision: 0, reject: 0 },
    };
    for (const r of rows) {
      let matched = false;
      for (const a of r.assignments) {
        if (anaTrack !== "all" && a.trackCode !== anaTrack) continue;
        if (a.status === "submitted" && a.recommendation) {
          const bucket = rec[a.pathway];
          if (a.recommendation === "accept") bucket.accept += 1;
          else if (a.recommendation === "reject") bucket.reject += 1;
          else if (a.recommendation.includes("revision")) bucket.revision += 1;
        }
        if (anaPathway !== "all" && a.pathway !== anaPathway) continue;
        matched = true;
        if (a.status === "submitted") {
          completed += 1;
          active.add(r.email);
        } else if (a.status === "accepted") {
          inProgress += 1;
          active.add(r.email);
        } else if (a.status === "invited") {
          invites += 1;
        }
      }
      if (matched) reviewers.add(r.email);
    }
    return {
      reviewers: reviewers.size,
      active: active.size,
      completed,
      inProgress,
      invites,
      rec,
    };
  }, [rows, anaTrack, anaPathway]);

  const { list: filtered, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = rows.filter((r) => {
      if (!inTrack(r, track)) return false;
      if (status !== "all") {
        const key =
          status === "completed" ? "completed" : status === "accepted" ? "accepted" : status;
        if ((r.counts as any)[key] <= 0) return false;
      }
      if (pathway === "A" && r.counts.pathwayA <= 0) return false;
      if (pathway === "B" && r.counts.pathwayB <= 0) return false;
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
  }, [rows, track, q, status, pathway, letter]);

  function exportExcel() {
    const filters = [
      `Track: ${track === "all" ? "All tracks" : track}`,
      `Search: ${q.trim() || "—"}`,
      `Status: ${status === "all" ? "All" : STATUS_LABEL[
        (status === "completed" ? "submitted" : status) as ReviewerAssignment["status"]
      ] ?? status}`,
      `Pathway: ${pathway === "all" ? "All" : `Pathway ${pathway}`}`,
      `Name starts with: ${letter === "all" ? "All" : letter}`,
    ].join("   |   ");
    const headers = [
      "Reviewer", "Mobile", "Email", "Affiliation", "Tracks", "Assigned",
      "Pathway A", "Pathway B", "Invited (pending)", "In progress", "Completed",
      "Declined", "Overdue", "Papers (pathway, status)",
    ];
    const data = filtered.map((r) =>
      [
        r.name, r.mobile ?? "", r.email, r.affiliation ?? "",
        r.trackCodes.join("; "),
        r.counts.assigned, r.counts.pathwayA, r.counts.pathwayB,
        r.counts.invited, r.counts.accepted,
        r.counts.completed, r.counts.declined, r.counts.overdue,
        r.assignments
          .map((a) => `${a.paperId} (Pathway ${a.pathway}, ${STATUS_LABEL[a.status]})`)
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
          <div className="flex flex-nowrap items-center gap-2">
            <select
              value={anaTrack}
              onChange={(e) => setAnaTrack(e.target.value)}
              className="input w-40 shrink-0 text-sm sm:w-48"
            >
              <option value="all">All tracks</option>
              {tracks.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
            <select
              value={anaPathway}
              onChange={(e) => setAnaPathway(e.target.value as typeof anaPathway)}
              className="input w-36 shrink-0 text-sm"
              aria-label="Pathway filter (analytics)"
            >
              <option value="all">All pathways</option>
              <option value="A">Pathway A</option>
              <option value="B">Pathway B</option>
            </select>
          </div>
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
        {/* Decision breakdown by pathway (from submitted reviews). */}
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["A", analytics.rec.A, "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"],
              ["B", analytics.rec.B, "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"],
            ] as const
          ).map(([p, c, cls]) => (
            <span
              key={p}
              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium ${cls}`}
            >
              <b>Pathway {p}</b>
              <span>Accept <b className="text-sm">{c.accept}</b></span>
              <span className="opacity-60">·</span>
              <span>Revision <b className="text-sm">{c.revision}</b></span>
              <span className="opacity-60">·</span>
              <span>Reject <b className="text-sm">{c.reject}</b></span>
            </span>
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
        <select
          value={pathway}
          onChange={(e) => setPathway(e.target.value as typeof pathway)}
          className="input w-36 shrink-0 text-sm"
          aria-label="Pathway filter"
        >
          <option value="all">All (pathway)</option>
          <option value="A">Pathway A</option>
          <option value="B">Pathway B</option>
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
                {["Reviewer & workload", "Assignments (Paper · Track · Pathway · Status)"].map(
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
                  <td colSpan={2} className="td py-8 text-center text-slate-400">
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
                    {/* Workload summary */}
                    <div className="mt-2 flex flex-col items-start gap-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                      <span className="text-slate-600">
                        Assigned: <b>{r.counts.assigned}</b>
                      </span>
                      <span className="flex flex-wrap gap-1">
                        <span className={`badge ${PATHWAY_CLASS.A}`}>
                          Pathway A: {r.counts.pathwayA}
                        </span>
                        <span className={`badge ${PATHWAY_CLASS.B}`}>
                          Pathway B: {r.counts.pathwayB}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1">
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
                      </span>
                    </div>
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
                            <span className={`badge ml-2 ${PATHWAY_CLASS[a.pathway]}`}>
                              Pathway {a.pathway}
                            </span>
                            <span className={`badge ml-1 ${STATUS_CLASS[a.status]}`}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
