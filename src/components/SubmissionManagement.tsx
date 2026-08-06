"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { csvCell, downloadCsv } from "@/lib/nameIndex";
import {
  AI_FLAG_PERCENT,
  SIMILARITY_FLAG_PERCENT,
  STATUS_LABELS,
  RECOMMENDATION_LABELS,
  type SubmissionStatus,
} from "@/lib/types";

export type SubmissionAuthorLite = {
  name: string;
  email: string | null;
  affiliation: string | null;
  corresponding: boolean;
  registered: boolean;
};

export type SubmissionReviewerLite = {
  name: string;
  number: number | null;
  status: string;
  round: number | null;
  dueDate: string | null;
  recommendation: string | null;
};

export type SubmissionRow = {
  id: string;
  paperId: string;
  title: string;
  status: string;
  stage: string;
  pathway: "A" | "B";
  participationMode: string | null;
  version: number;
  trackCode: string;
  trackName: string;
  corresponding: string;
  correspondingEmail: string | null;
  affiliation: string | null;
  authors: SubmissionAuthorLite[];
  editor: string | null;
  reviewers: SubmissionReviewerLite[];
  decisions: { decision: string; at: string; by: string | null }[];
  similarity: number | null;
  aiPercent: number | null;
  integrityProvider: string;
  integrityCheckedAt: string | null;
  hasAbstractFile: boolean;
  hasCameraReady: boolean;
  submittedAt: string;
  updatedAt: string;
};

const PATHWAY_CLASS: Record<"A" | "B", string> = {
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  B: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700",
  under_review: "bg-blue-100 text-blue-800",
  revisions_requested: "bg-amber-100 text-amber-800",
  abstract_accepted: "bg-teal-100 text-teal-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  withdrawn: "bg-slate-200 text-slate-600",
};

const REVIEWER_STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  accepted: "In progress",
  declined: "Declined",
  submitted: "Completed",
  expired: "Expired",
};

function label(d: string | null): string {
  if (!d) return "—";
  return (
    (RECOMMENDATION_LABELS as Record<string, string>)[d] ??
    d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function decisionClass(d: string | null): string {
  if (!d) return "bg-slate-100 text-slate-700";
  if (d === "accept") return "bg-emerald-100 text-emerald-800";
  if (d === "reject") return "bg-rose-100 text-rose-800";
  if (d.includes("revision")) return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

/** A paper is flagged when either integrity score sits at or above threshold. */
function integrityFlagged(r: SubmissionRow): boolean {
  return (
    (r.similarity !== null && r.similarity >= SIMILARITY_FLAG_PERCENT) ||
    (r.aiPercent !== null && r.aiPercent >= AI_FLAG_PERCENT)
  );
}

export function SubmissionManagement({
  rows,
  tracks,
  detailBase,
}: {
  rows: SubmissionRow[];
  tracks: { code: string; name: string }[];
  /** Route prefix for a single paper, e.g. "/chief/submissions". */
  detailBase: string;
}) {
  const [track, setTrack] = useState("all");
  const [pathway, setPathway] = useState<"all" | "A" | "B">("all");
  const [status, setStatus] = useState("all");
  const [integrity, setIntegrity] = useState<"all" | "flagged" | "unchecked" | "clear">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (track !== "all" && r.trackCode !== track) return false;
      if (pathway !== "all" && r.pathway !== pathway) return false;
      if (status !== "all" && r.status !== status) return false;
      if (integrity === "flagged" && !integrityFlagged(r)) return false;
      if (integrity === "unchecked" && r.integrityCheckedAt) return false;
      if (integrity === "clear" && (!r.integrityCheckedAt || integrityFlagged(r)))
        return false;
      if (!needle) return true;
      return (
        r.paperId.toLowerCase().includes(needle) ||
        r.title.toLowerCase().includes(needle) ||
        r.corresponding.toLowerCase().includes(needle) ||
        (r.correspondingEmail ?? "").toLowerCase().includes(needle) ||
        (r.editor ?? "").toLowerCase().includes(needle) ||
        r.authors.some((a) => a.name.toLowerCase().includes(needle)) ||
        r.reviewers.some((v) => v.name.toLowerCase().includes(needle))
      );
    });
  }, [rows, track, pathway, status, integrity, q]);

  const stats = useMemo(() => {
    const s = {
      total: filtered.length,
      pathwayA: 0,
      pathwayB: 0,
      awaitingReview: 0,
      decided: 0,
      accepted: 0,
      rejected: 0,
      flagged: 0,
      unchecked: 0,
    };
    for (const r of filtered) {
      if (r.pathway === "A") s.pathwayA += 1;
      else s.pathwayB += 1;
      if (r.decisions.length) s.decided += 1;
      else s.awaitingReview += 1;
      if (r.status === "accepted" || r.status === "abstract_accepted") s.accepted += 1;
      if (r.status === "rejected") s.rejected += 1;
      if (integrityFlagged(r)) s.flagged += 1;
      if (!r.integrityCheckedAt) s.unchecked += 1;
    }
    return s;
  }, [filtered]);

  function exportExcel() {
    const head = [
      "Paper ID", "Title", "Track", "Pathway", "Status", "Stage",
      "Corresponding author", "Email", "Affiliation", "All authors",
      "Track Editor", "Reviewers", "Recommendations", "Latest decision",
      "Similarity %", "AI %", "Integrity tool", "Checked on",
      "Submitted", "Last updated",
    ];
    const body = filtered.map((r) =>
      [
        r.paperId, r.title, `${r.trackCode} — ${r.trackName}`, `Pathway ${r.pathway}`,
        STATUS_LABELS[r.status as SubmissionStatus] ?? r.status, r.stage,
        r.corresponding, r.correspondingEmail ?? "", r.affiliation ?? "",
        r.authors.map((a) => a.name).join("; "),
        r.editor ?? "",
        r.reviewers.map((v) => `${v.name} (${REVIEWER_STATUS_LABEL[v.status] ?? v.status})`).join("; "),
        r.reviewers.map((v) => label(v.recommendation)).join("; "),
        r.decisions[0] ? `${label(r.decisions[0].decision)} on ${fmt(r.decisions[0].at)}` : "",
        r.similarity ?? "", r.aiPercent ?? "", r.integrityProvider,
        fmt(r.integrityCheckedAt), fmt(r.submittedAt), fmt(r.updatedAt),
      ].map(csvCell).join(",")
    );
    downloadCsv(
      `glogift27-submissions-${new Date().toISOString().slice(0, 10)}.csv`,
      [head.map(csvCell).join(","), ...body]
    );
  }

  const tiles: [string, number, string][] = [
    ["Papers", stats.total, "border-slate-200 bg-slate-50 text-slate-800"],
    ["Pathway A", stats.pathwayA, "border-emerald-200 bg-emerald-50 text-emerald-800"],
    ["Pathway B", stats.pathwayB, "border-violet-200 bg-violet-50 text-violet-800"],
    ["Awaiting decision", stats.awaitingReview, "border-amber-200 bg-amber-50 text-amber-800"],
    ["Accepted", stats.accepted, "border-teal-200 bg-teal-50 text-teal-800"],
    ["Integrity flagged", stats.flagged, "border-rose-200 bg-rose-50 text-rose-800"],
  ];

  return (
    <div className="space-y-4">
      {/* Analytics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([lab, value, cls]) => (
          <div key={lab} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {lab}
            </p>
            <p className="mt-0.5 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters — line 1: the dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="input w-full max-w-xs text-sm sm:w-auto"
          aria-label="Track filter"
        >
          <option value="all">All tracks</option>
          {tracks.map((t) => (
            <option key={t.code} value={t.code}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
        <select
          value={pathway}
          onChange={(e) => setPathway(e.target.value as typeof pathway)}
          className="input w-36 text-sm"
          aria-label="Pathway filter"
        >
          <option value="all">All pathways</option>
          <option value="A">Pathway A</option>
          <option value="B">Pathway B</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-44 text-sm"
          aria-label="Status filter"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS)
            .filter(([k]) => k !== "draft")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </select>
        <select
          value={integrity}
          onChange={(e) => setIntegrity(e.target.value as typeof integrity)}
          className="input w-44 text-sm"
          aria-label="Integrity filter"
        >
          <option value="all">All integrity states</option>
          <option value="flagged">Flagged</option>
          <option value="clear">Checked &amp; clear</option>
          <option value="unchecked">Not yet checked</option>
        </select>
        <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* Filters — line 2: search + export */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search paper ID, title, author, editor, reviewer…"
          className="input min-w-[12rem] flex-1 text-sm"
        />
        <button
          type="button"
          onClick={exportExcel}
          className="btn-secondary shrink-0 whitespace-nowrap text-sm"
          title="Download the filtered list (opens in Excel)"
        >
          ⬇ Download Excel
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 font-semibold">Paper</th>
                <th className="px-3 py-2 font-semibold">Track</th>
                <th className="px-3 py-2 font-semibold">Corresponding author</th>
                <th className="px-3 py-2 font-semibold">Track Editor</th>
                <th className="px-3 py-2 font-semibold">Reviews</th>
                <th className="px-3 py-2 font-semibold">Decision</th>
                <th className="px-3 py-2 font-semibold">Integrity</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => {
                const done = r.reviewers.filter((v) => v.status === "submitted").length;
                const flagged = integrityFlagged(r);
                return (
                  <tr key={r.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpen(open === r.id ? null : r.id)}
                        className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
                      >
                        {r.paperId}
                      </button>
                      <span className={`badge ml-1.5 ${PATHWAY_CLASS[r.pathway]}`}>
                        {r.pathway}
                      </span>
                      <span className="block max-w-[22rem] whitespace-normal text-xs text-slate-600 dark:text-slate-300">
                        {r.title}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{r.trackCode}</span>
                      <span className="block max-w-[12rem] whitespace-normal text-slate-400">
                        {r.trackName}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.corresponding}
                      </span>
                      {r.correspondingEmail && (
                        <span className="block text-slate-500">{r.correspondingEmail}</span>
                      )}
                      {r.authors.length > 1 && (
                        <span className="block text-slate-400">
                          +{r.authors.length - 1} co-author
                          {r.authors.length - 1 === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {r.editor ?? <span className="text-amber-700">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {r.reviewers.length === 0 ? (
                        <span className="text-amber-700">None assigned</span>
                      ) : (
                        <>
                          <span className="font-medium">
                            {done}/{r.reviewers.length} done
                          </span>
                          <span className="block text-slate-400">
                            {r.reviewers
                              .filter((v) => v.recommendation)
                              .map((v) => label(v.recommendation))
                              .join(", ") || "no recommendations yet"}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.decisions[0] ? (
                        <>
                          <span className={`badge ${decisionClass(r.decisions[0].decision)}`}>
                            {label(r.decisions[0].decision)}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {fmt(r.decisions[0].at)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.integrityCheckedAt ? (
                        <span
                          className={`badge ${
                            flagged
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {r.similarity ?? "—"}% sim · {r.aiPercent ?? "—"}% AI
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">Not checked</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`badge ${STATUS_CLASS[r.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {STATUS_LABELS[r.status as SubmissionStatus] ?? r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">
                    No papers match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel for the opened paper */}
      {open && (() => {
        const r = filtered.find((x) => x.id === open);
        if (!r) return null;
        return (
          <section className="card card-pad space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {r.paperId} · {r.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.trackCode} — {r.trackName} · Pathway {r.pathway} · v{r.version}
                  {r.participationMode ? ` · ${r.participationMode}` : ""} · submitted{" "}
                  {fmt(r.submittedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`${detailBase}/${r.id}`} className="btn-secondary py-1.5 text-xs">
                  Open paper
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Authors
                </p>
                <ul className="space-y-1 text-xs">
                  {r.authors.map((a, i) => (
                    <li key={`${a.email ?? a.name}-${i}`} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {a.name}
                      </span>
                      <span className="text-slate-500">
                        {a.corresponding ? "Corresponding" : "Co-author"}
                      </span>
                      <span
                        className={`badge text-[10px] ${
                          a.registered
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {a.registered ? "Registered" : "Not registered"}
                      </span>
                      {a.affiliation && (
                        <span className="block w-full text-slate-400">{a.affiliation}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Reviewers
                </p>
                {r.reviewers.length === 0 ? (
                  <p className="text-xs text-amber-700">No reviewers assigned yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {r.reviewers.map((v, i) => (
                      <li key={`${v.name}-${i}`} className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {v.number ? `R${v.number} · ` : ""}
                          {v.name}
                        </span>
                        <span className="badge bg-slate-100 text-slate-600 text-[10px]">
                          {REVIEWER_STATUS_LABEL[v.status] ?? v.status}
                        </span>
                        {v.recommendation && (
                          <span className={`badge text-[10px] ${decisionClass(v.recommendation)}`}>
                            {label(v.recommendation)}
                          </span>
                        )}
                        {v.dueDate && (
                          <span className="text-slate-400">due {fmt(v.dueDate)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Track Editor: <strong>{r.editor ?? "Unassigned"}</strong>
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Decisions &amp; integrity
                </p>
                {r.decisions.length === 0 ? (
                  <p className="text-xs text-slate-400">No decision recorded yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {r.decisions.map((d, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5">
                        <span className={`badge text-[10px] ${decisionClass(d.decision)}`}>
                          {label(d.decision)}
                        </span>
                        <span className="text-slate-500">{fmt(d.at)}</span>
                        {d.by && <span className="text-slate-400">by {d.by}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Similarity <strong>{r.similarity ?? "—"}%</strong> · AI{" "}
                    <strong>{r.aiPercent ?? "—"}%</strong>
                  </p>
                  <p className="text-slate-400">
                    {r.integrityCheckedAt
                      ? `${r.integrityProvider} · ${fmt(r.integrityCheckedAt)}`
                      : "Not yet checked"}
                  </p>
                  <p className="text-slate-400">
                    Files: {r.hasAbstractFile ? "manuscript ✓" : "manuscript —"}
                    {r.hasCameraReady ? " · camera-ready ✓" : ""}
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
