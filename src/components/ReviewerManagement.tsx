"use client";

import { useMemo, useState } from "react";
import {
  ALPHABET,
  csvCell,
  downloadCsv,
  initialOf,
  stripSalutation,
} from "@/lib/nameIndex";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { generateReviewerCertificate } from "@/lib/reviewerCertificateActions";
import { remindTrackEditorOverdue } from "@/lib/reviewerReminderActions";
import { MAX_REVIEWS_PER_REVIEWER } from "@/lib/types";

export type ReviewerAssignment = {
  /** assignments.id — used to send an overdue reminder to the handling editor. */
  assignmentId: string;
  /** How many overdue reminders have already gone to the handling editor. */
  editorReminderCount: number;
  paperId: string;
  reviewerNumber: number | null;
  title: string;
  trackCode: string;
  trackName: string;
  submittedAt: string | null;
  corresponding: string | null;
  coAuthors: string[];
  pathway: "A" | "B";
  status: "invited" | "accepted" | "declined" | "submitted";
  recommendation: string | null;
  handlingEditor: string | null;
  round: number | null;
  overdue: boolean;
};

/** Map a reviewer recommendation to a coloured Decision. */
function decisionOf(rec: string | null): { label: string; cls: string } | null {
  if (!rec) return null;
  if (rec === "accept")
    return { label: "Accept", cls: "bg-emerald-100 text-emerald-800" };
  if (rec === "reject")
    return { label: "Reject", cls: "bg-rose-100 text-rose-800" };
  if (rec.includes("revision"))
    return { label: "Revision", cls: "bg-blue-100 text-blue-800" };
  return { label: recLabel(rec), cls: "bg-slate-100 text-slate-700" };
}

/** A reviewer assignment's decision bucket for the Decision filter. */
function assignmentDecisionStatus(
  a: ReviewerAssignment
): "pending" | "accept" | "revision" | "reject" {
  const r = a.recommendation;
  if (!r) return "pending";
  if (r === "accept") return "accept";
  if (r === "reject") return "reject";
  if (r.includes("revision")) return "revision";
  return "pending";
}

export type ReviewerRow = {
  name: string;
  mobile: string | null;
  email: string;
  affiliation: string | null;
  /** Reviewer number(s) held (e.g. "1"); joined with " · " if more than one. */
  reviewerNo: string;
  /** Whether a reviewer certificate has already been generated. */
  certGenerated: boolean;
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

/** A single reviewer's own Accept/Reject rate across their decided reviews. */
function reviewerRates(r: ReviewerRow) {
  let accept = 0;
  let reject = 0;
  let revision = 0;
  for (const a of r.assignments) {
    if (a.status !== "submitted" || !a.recommendation) continue;
    if (a.recommendation === "accept") accept += 1;
    else if (a.recommendation === "reject") reject += 1;
    else if (a.recommendation.includes("revision")) revision += 1;
  }
  const total = accept + reject + revision;
  return {
    accept,
    reject,
    revision,
    total,
    acceptPct: total ? Math.round((accept / total) * 100) : 0,
    rejectPct: total ? Math.round((reject / total) * 100) : 0,
  };
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
  const [decision, setDecision] = useState<
    "all" | "pending" | "accept" | "revision" | "reject"
  >("all");
  const [letter, setLetter] = useState("all");
  const [anaTrack, setAnaTrack] = useState("all");
  const [anaPathway, setAnaPathway] = useState<"all" | "A" | "B">("all");
  // Which paper's detail popup is open (keyed by email + assignment index).
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  // Per-reviewer confirmation gate for the certificate actions (keyed by email).
  const [certUnlocked, setCertUnlocked] = useState<Record<string, boolean>>({});
  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

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
      if (
        decision !== "all" &&
        !r.assignments.some((a) => assignmentDecisionStatus(a) === decision)
      )
        return false;
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
  }, [rows, track, q, status, pathway, decision, letter]);

  function exportExcel() {
    const filters = [
      `Track: ${track === "all" ? "All tracks" : track}`,
      `Search: ${q.trim() || "—"}`,
      `Status: ${status === "all" ? "All" : STATUS_LABEL[
        (status === "completed" ? "submitted" : status) as ReviewerAssignment["status"]
      ] ?? status}`,
      `Pathway: ${pathway === "all" ? "All" : `Pathway ${pathway}`}`,
      `Decision: ${
        decision === "all"
          ? "All"
          : decision === "pending"
            ? "Pending / awaited"
            : decision === "accept"
              ? "Accept"
              : decision === "revision"
                ? "Revision"
                : "Reject"
      }`,
      `Name starts with: ${letter === "all" ? "All" : letter}`,
    ].join("   |   ");
    const headers = [
      "Reviewer", "Reviewer no.", "Mobile", "Email", "Affiliation", "Tracks",
      "Assigned", "Pathway A", "Pathway B", "Invited (pending)", "In progress",
      "Completed", "Declined", "Overdue", "Papers (pathway, status)",
    ];
    const data = filtered.map((r) =>
      [
        r.name, r.reviewerNo, r.mobile ?? "", r.email, r.affiliation ?? "",
        r.trackCodes.join("; "),
        r.counts.assigned, r.counts.pathwayA, r.counts.pathwayB,
        r.counts.invited, r.counts.accepted,
        r.counts.completed, r.counts.declined, r.counts.overdue,
        r.assignments
          .map((a) => {
            const d = decisionOf(a.recommendation);
            return `${a.paperId} (Pathway ${a.pathway}, ${STATUS_LABEL[a.status]}${
              d ? ", " + d.label : ""
            }${a.handlingEditor ? ", ed: " + a.handlingEditor : ""})`;
          })
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
              {(() => {
                const total = c.accept + c.revision + c.reject;
                const pct = (n: number) =>
                  total ? `${Math.round((n / total) * 100)}%` : "—";
                return (
                  <>
                    <span className="mx-0.5 inline-block h-3 w-px bg-current opacity-30 align-middle" />
                    <span title="Share of decided reviews recommending Accept">
                      Accept rate <b className="text-sm">{pct(c.accept)}</b>
                    </span>
                    <span className="opacity-60">·</span>
                    <span title="Share of decided reviews recommending Reject">
                      Reject rate <b className="text-sm">{pct(c.reject)}</b>
                    </span>
                  </>
                );
              })()}
            </span>
          ))}
        </div>
      </div>

      {/* Filters — line 1: track, status, pathway, decision */}
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
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          className="input w-40 shrink-0 text-sm"
          aria-label="Decision status filter"
        >
          <option value="all">All (decision)</option>
          <option value="pending">Pending / awaited</option>
          <option value="accept">Accept</option>
          <option value="revision">Revision</option>
          <option value="reject">Reject</option>
        </select>
        <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* Filters — line 2: search + Excel */}
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reviewer, email, paper…"
          className="input min-w-[9rem] flex-1 text-sm"
        />
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
                {["Reviewer & workload", "Assignments", "Certificate"].map(
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
                      <span className="mt-0.5 block whitespace-normal text-xs text-slate-600 dark:text-slate-300">
                        {r.affiliation}
                      </span>
                    )}
                    {/* Workload summary */}
                    {(() => {
                      const held = r.counts.assigned - r.counts.declined;
                      const remaining = Math.max(
                        0,
                        MAX_REVIEWS_PER_REVIEWER - held
                      );
                      return (
                    <div className="mt-2 flex flex-col items-start gap-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                      <span className="text-slate-600">
                        Assigned: <b>{r.counts.assigned}</b>{" "}
                        <span className="text-slate-400">
                          of {MAX_REVIEWS_PER_REVIEWER} max
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1">
                        <span className={`badge ${PATHWAY_CLASS.A}`}>
                          Pathway A: {r.counts.pathwayA}
                        </span>
                        <span className={`badge ${PATHWAY_CLASS.B}`}>
                          Pathway B: {r.counts.pathwayB}
                        </span>
                      </span>
                      <span
                        className={`badge ${
                          remaining > 0
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                        title={`Cap ${MAX_REVIEWS_PER_REVIEWER} papers total; declined don't count. Remaining can go to either pathway.`}
                      >
                        {remaining > 0
                          ? `Can take ${remaining} more (either pathway)`
                          : "At capacity"}
                      </span>
                    </div>
                      );
                    })()}
                  </td>
                  <td className="td">
                    {(() => {
                    // Scope the assignments to the active track / pathway /
                    // status filters so the list reflects what you filtered.
                    const shown = r.assignments.filter(
                      (a) =>
                        (track === "all" || a.trackCode === track) &&
                        (pathway === "all" || a.pathway === pathway) &&
                        (status === "all" ||
                          (status === "completed"
                            ? a.status === "submitted"
                            : a.status === status)) &&
                        (decision === "all" ||
                          assignmentDecisionStatus(a) === decision)
                    );
                    return shown.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        {r.assignments.length === 0
                          ? "No assignments"
                          : "No matching assignments"}
                      </span>
                    ) : (
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                            <th className="pr-3 font-medium">Paper</th>
                            <th className="pr-3 font-medium">Role</th>
                            <th className="pr-3 font-medium">Pathway</th>
                            <th className="pr-3 font-medium">Status</th>
                            <th className="pr-3 font-medium">Decision</th>
                            <th className="font-medium">Handling editor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((a, i) => {
                            const dec = decisionOf(a.recommendation);
                            const key = `${r.email}-${i}`;
                            const open = openPaper === key;
                            return (
                              <tr key={key} className="align-top">
                                <td className="relative whitespace-nowrap pr-3 py-0.5 font-mono">
                                  <button
                                    type="button"
                                    onClick={() => setOpenPaper(open ? null : key)}
                                    className="text-blue-700 hover:underline dark:text-blue-300"
                                    title="Click for paper details"
                                  >
                                    {a.paperId}
                                  </button>
                                  {open && (
                                    <div className="absolute z-30 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left font-sans shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="font-mono text-[11px] text-slate-500">
                                          {a.paperId}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setOpenPaper(null)}
                                          className="text-sm leading-none text-slate-400 hover:text-slate-600"
                                          aria-label="Close"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {a.title || "Untitled"}
                                      </p>
                                      <dl className="mt-2 space-y-1 text-xs">
                                        <div>
                                          <dt className="inline text-slate-400">Corresponding: </dt>
                                          <dd className="inline text-slate-700 dark:text-slate-200">
                                            {a.corresponding ?? "—"}
                                          </dd>
                                        </div>
                                        <div>
                                          <dt className="inline text-slate-400">Co-authors: </dt>
                                          <dd className="inline text-slate-700 dark:text-slate-200">
                                            {a.coAuthors.length ? a.coAuthors.join(", ") : "—"}
                                          </dd>
                                        </div>
                                        <div>
                                          <dt className="inline text-slate-400">Track: </dt>
                                          <dd className="inline text-slate-700 dark:text-slate-200">
                                            {a.trackName}
                                          </dd>
                                        </div>
                                        <div>
                                          <dt className="inline text-slate-400">Submitted: </dt>
                                          <dd className="inline text-slate-700 dark:text-slate-200">
                                            {fmtDate(a.submittedAt)}
                                          </dd>
                                        </div>
                                      </dl>
                                    </div>
                                  )}
                                </td>
                                <td className="pr-3 py-0.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                  {a.reviewerNumber != null
                                    ? `Reviewer ${a.reviewerNumber}`
                                    : "—"}
                                </td>
                                <td className="pr-3 py-0.5">
                                  <span className={`badge ${PATHWAY_CLASS[a.pathway]}`}>
                                    Pathway {a.pathway}
                                  </span>
                                </td>
                                <td className="pr-3 py-0.5">
                                  {a.overdue ? (
                                    <span
                                      className="badge bg-rose-100 text-rose-700"
                                      title="The review deadline has passed"
                                    >
                                      Overdue
                                    </span>
                                  ) : (
                                    <span className={`badge ${STATUS_CLASS[a.status]}`}>
                                      {STATUS_LABEL[a.status]}
                                    </span>
                                  )}
                                </td>
                                <td className="pr-3 py-0.5">
                                  {dec ? (
                                    <span className={`badge ${dec.cls}`}>{dec.label}</span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="py-0.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                  <span className="block">{a.handlingEditor ?? "—"}</span>
                                  {a.overdue && a.handlingEditor && (
                                    <ActionForm
                                      action={remindTrackEditorOverdue}
                                      className="mt-1 inline-block font-sans"
                                    >
                                      <input
                                        type="hidden"
                                        name="assignment_id"
                                        value={a.assignmentId}
                                      />
                                      <SubmitButton
                                        variant="secondary"
                                        className={`!py-0.5 !px-2 !text-[10px] ${
                                          a.editorReminderCount > 0
                                            ? "!bg-amber-100 !text-amber-800 dark:!bg-amber-500/15 dark:!text-amber-300"
                                            : ""
                                        }`}
                                        title={
                                          a.editorReminderCount > 0
                                            ? `Overdue reminder emailed ${a.editorReminderCount} time(s). Click to send another.`
                                            : "Email the handling editor that this review is overdue and should be completed soon"
                                        }
                                      >
                                        {a.editorReminderCount > 0
                                          ? `🔔 Reminded ${a.editorReminderCount}×`
                                          : "🔔 Remind editor"}
                                      </SubmitButton>
                                    </ActionForm>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                    })()}
                  </td>
                  <td className="td align-top">
                    {(() => {
                      const rt = reviewerRates(r);
                      const unlocked = !!certUnlocked[r.email];
                      return (
                        <div className="space-y-1.5">
                          {/* This reviewer's own decision rates */}
                          {rt.total > 0 ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/60">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                  Acceptance rate
                                </span>
                                <b className="text-emerald-700 dark:text-emerald-300">
                                  {rt.acceptPct}%
                                </b>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-medium text-rose-700 dark:text-rose-300">
                                  Rejection rate
                                </span>
                                <b className="text-rose-700 dark:text-rose-300">
                                  {rt.rejectPct}%
                                </b>
                              </div>
                              <p
                                className="mt-0.5 text-[9px] text-slate-400"
                                title={`Accept ${rt.accept} · Revision ${rt.revision} · Reject ${rt.reject}`}
                              >
                                of {rt.total} decided review{rt.total === 1 ? "" : "s"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400">
                              No decisions yet
                            </p>
                          )}

                          {/* Certificate actions */}
                          {r.counts.completed > 0 ? (
                            <div className="space-y-1">
                              {r.certGenerated && (
                                <span className="block rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                  ✓ Certificate generated
                                </span>
                              )}
                              <label className="flex items-start gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[10px] leading-tight text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={unlocked}
                                  onChange={(e) =>
                                    setCertUnlocked((s) => ({
                                      ...s,
                                      [r.email]: e.target.checked,
                                    }))
                                  }
                                  className="mt-0.5 shrink-0"
                                />
                                <span>
                                  I&apos;ve verified this reviewer — enable preview
                                  &amp; {r.certGenerated ? "regenerate" : "generate"}
                                </span>
                              </label>
                              <a
                                href={
                                  unlocked
                                    ? `/api/reviewer-certificate/preview?email=${encodeURIComponent(
                                        r.email
                                      )}`
                                    : undefined
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-disabled={!unlocked}
                                tabIndex={unlocked ? 0 : -1}
                                className={`btn-secondary block w-full justify-center text-center text-[11px] py-0.5 px-2 ${
                                  unlocked
                                    ? ""
                                    : "pointer-events-none opacity-40"
                                }`}
                                title={
                                  unlocked
                                    ? "Open the certificate as it will look — nothing is saved or emailed"
                                    : "Tick the checkbox above to enable"
                                }
                              >
                                Preview certificate
                              </a>
                              <ActionForm action={generateReviewerCertificate}>
                                <input type="hidden" name="email" value={r.email} />
                                {r.certGenerated && (
                                  <input type="hidden" name="regenerate" value="true" />
                                )}
                                <SubmitButton
                                  variant={r.certGenerated ? "secondary" : "primary"}
                                  disabled={!unlocked}
                                  className={`w-full justify-center text-[11px] py-0.5 px-2 ${
                                    r.certGenerated
                                      ? "!bg-amber-500 !text-white hover:!bg-amber-600"
                                      : ""
                                  } ${
                                    unlocked
                                      ? ""
                                      : "cursor-not-allowed opacity-40"
                                  }`}
                                >
                                  {r.certGenerated
                                    ? "Regenerate certificate"
                                    : "Generate certificate"}
                                </SubmitButton>
                              </ActionForm>
                            </div>
                          ) : (
                            <span className="block text-center text-[10px] text-slate-400">
                              No completed review yet
                            </span>
                          )}
                        </div>
                      );
                    })()}
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
