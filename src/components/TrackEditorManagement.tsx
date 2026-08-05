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
import { generateTrackEditorCertificate } from "@/lib/trackEditorCertificateActions";
import { MAX_TRACKS_PER_CHAIR } from "@/lib/types";

export type TEChairedTrack = {
  code: string;
  name: string;
  status: "invited" | "accepted";
};
export type TEReviewerLite = {
  name: string;
  number: number | null;
  status: string;
  recommendation: string | null;
};
export type TEActivity = { label: string; at: string | null };
export type TEPaper = {
  paperId: string;
  trackCode: string;
  trackName: string;
  title: string;
  accepted: boolean;
  decided: boolean;
  decision: string | null;
  corresponding: string | null;
  coAuthors: string[];
  reviewers: TEReviewerLite[];
  activity: TEActivity[];
};

const REVIEWER_STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  accepted: "In progress",
  declined: "Declined",
  submitted: "Completed",
};
export type TrackEditorRow = {
  name: string;
  mobile: string | null;
  email: string;
  affiliation: string | null;
  /** Whether a track-editor certificate has already been generated. */
  certGenerated: boolean;
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

/** A single track editor's own Accept/Reject rate across their decided papers. */
function editorRates(r: TrackEditorRow) {
  let accept = 0;
  let reject = 0;
  let revision = 0;
  for (const p of r.papers) {
    if (!p.decided || !p.decision) continue;
    if (p.decision === "accept") accept += 1;
    else if (p.decision === "reject") reject += 1;
    else if (p.decision.includes("revision")) revision += 1;
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
  // Per-editor confirmation gate for the certificate actions (keyed by email).
  const [certUnlocked, setCertUnlocked] = useState<Record<string, boolean>>({});
  // Which paper's detail popup is open (keyed by email + track + index).
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

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
                {[
                  "Track Editor",
                  "Papers assigned",
                  "Workload",
                  "Certificate",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
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
                    {/* Track allotment against the max-tracks-per-editor cap. */}
                    {(() => {
                      const remaining = Math.max(
                        0,
                        MAX_TRACKS_PER_CHAIR - r.counts.tracksAccepted
                      );
                      return (
                        <div className="mt-2 flex flex-col items-start gap-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-300">
                            Tracks assigned: <b>{r.counts.tracksAccepted}</b>{" "}
                            <span className="text-slate-400">
                              of {MAX_TRACKS_PER_CHAIR} max
                            </span>
                          </span>
                          {r.counts.tracksInvited > 0 && (
                            <span className="badge bg-amber-100 text-amber-800">
                              {r.counts.tracksInvited} invited (pending)
                            </span>
                          )}
                          <span
                            className={`badge ${
                              remaining > 0
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                            title={`Each Track Editor may chair up to ${MAX_TRACKS_PER_CHAIR} tracks; invited-but-not-accepted tracks don't count until accepted.`}
                          >
                            {remaining > 0
                              ? `Can take ${remaining} more track${
                                  remaining === 1 ? "" : "s"
                                }`
                              : "At capacity"}
                          </span>
                        </div>
                      );
                    })()}
                    {/* Tracks chaired — beneath the allotment badge. */}
                    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Tracks chaired
                      </p>
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
                    </div>
                  </td>
                  <td className="td">
                    {r.papers.length === 0 ? (
                      <span className="text-xs text-slate-400">None</span>
                    ) : (
                      (() => {
                        // Group papers by track, tracks A→Z, papers in sequence.
                        const byTrack = new Map<string, TEPaper[]>();
                        for (const p of r.papers) {
                          const arr = byTrack.get(p.trackCode) ?? [];
                          arr.push(p);
                          byTrack.set(p.trackCode, arr);
                        }
                        const codes = [...byTrack.keys()].sort();
                        return (
                          <div className="space-y-2">
                            {codes.map((code) => {
                              const list = byTrack
                                .get(code)!
                                .slice()
                                .sort((a, b) =>
                                  a.paperId.localeCompare(b.paperId)
                                );
                              return (
                                <div key={code}>
                                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {code}
                                  </p>
                                  <ul className="space-y-0.5">
                                    {list.map((p, i) => {
                                      const key = `${r.email}-${code}-${i}`;
                                      const open = openPaper === key;
                                      return (
                                        <li
                                          key={key}
                                          className="relative text-xs"
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOpenPaper(open ? null : key)
                                            }
                                            className="font-mono text-blue-700 hover:underline dark:text-blue-300"
                                            title="Click for paper details"
                                          >
                                            {p.paperId}
                                          </button>
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
                                          {open && (
                                            <PaperDetail
                                              p={p}
                                              fmtDate={fmtDate}
                                              onClose={() => setOpenPaper(null)}
                                            />
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
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
                  <td className="td align-top">
                    {(() => {
                      const rt = editorRates(r);
                      const unlocked = !!certUnlocked[r.email];
                      return (
                        <div className="space-y-1.5">
                          {/* This editor's own decision rates */}
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
                                of {rt.total} decided paper{rt.total === 1 ? "" : "s"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400">
                              No decisions yet
                            </p>
                          )}

                          {/* Certificate actions */}
                          {r.certGenerated ? (
                            <span className="block rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              ✓ Certificate generated
                            </span>
                          ) : r.counts.decisionsTaken > 0 ? (
                            <div className="space-y-1">
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
                                  I&apos;ve verified this editor — enable preview
                                  &amp; generate
                                </span>
                              </label>
                              <a
                                href={
                                  unlocked
                                    ? `/api/track-editor-certificate/preview?email=${encodeURIComponent(
                                        r.email
                                      )}`
                                    : undefined
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-disabled={!unlocked}
                                tabIndex={unlocked ? 0 : -1}
                                className={`btn-secondary block w-full justify-center text-center text-[11px] py-0.5 px-2 ${
                                  unlocked ? "" : "pointer-events-none opacity-40"
                                }`}
                                title={
                                  unlocked
                                    ? "Open the certificate as it will look — nothing is saved or emailed"
                                    : "Tick the checkbox above to enable"
                                }
                              >
                                Preview certificate
                              </a>
                              <ActionForm action={generateTrackEditorCertificate}>
                                <input type="hidden" name="email" value={r.email} />
                                <SubmitButton
                                  variant="primary"
                                  disabled={!unlocked}
                                  className={`w-full justify-center text-[11px] py-0.5 px-2 ${
                                    unlocked ? "" : "cursor-not-allowed opacity-40"
                                  }`}
                                >
                                  Generate certificate
                                </SubmitButton>
                              </ActionForm>
                            </div>
                          ) : (
                            <span className="block text-center text-[10px] text-slate-400">
                              No decision taken yet
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

/** Popup with a paper's details: title, authors, track, reviewers, and the
 *  decision + activity history. Shown when a Paper ID is clicked. */
function PaperDetail({
  p,
  fmtDate,
  onClose,
}: {
  p: TEPaper;
  fmtDate: (d: string | null) => string;
  onClose: () => void;
}) {
  return (
    <div className="absolute z-30 mt-1 w-80 rounded-lg border border-slate-200 bg-white p-3 text-left font-sans shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{p.paperId}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-sm leading-none text-slate-400 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
        {p.title || "Untitled"}
      </p>
      <dl className="mt-2 space-y-1 text-xs">
        <div>
          <dt className="inline text-slate-400">Track: </dt>
          <dd className="inline text-slate-700 dark:text-slate-200">
            {p.trackName}
          </dd>
        </div>
        <div>
          <dt className="inline text-slate-400">Corresponding: </dt>
          <dd className="inline text-slate-700 dark:text-slate-200">
            {p.corresponding ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="inline text-slate-400">Co-authors: </dt>
          <dd className="inline text-slate-700 dark:text-slate-200">
            {p.coAuthors.length ? p.coAuthors.join(", ") : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Reviewers
        </p>
        {p.reviewers.length === 0 ? (
          <p className="text-xs text-slate-400">None assigned</p>
        ) : (
          <ul className="mt-0.5 space-y-0.5 text-xs">
            {p.reviewers.map((rv, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-200">
                {rv.number != null ? `Reviewer ${rv.number}: ` : ""}
                {rv.name}
                <span className="text-slate-400">
                  {" — "}
                  {rv.recommendation
                    ? decLabel(rv.recommendation)
                    : REVIEWER_STATUS_LABEL[rv.status] ?? rv.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Decision &amp; activity history
        </p>
        {p.activity.length === 0 ? (
          <p className="text-xs text-slate-400">No activity yet</p>
        ) : (
          <ol className="mt-0.5 space-y-0.5 text-xs">
            {p.activity.map((a, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-200">
                <span className="text-slate-400">{fmtDate(a.at)}</span> —{" "}
                {a.label}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
