"use client";

import { useMemo, useState } from "react";
import {
  formatMoney,
  feeForTier,
  type RegistrationFee,
} from "@/lib/registrationFees";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  saveParticipationStatus,
  resetParticipationStatus,
} from "@/lib/actions";
import { generateParticipationCertificates } from "@/lib/participationCertificateActions";

export type PersonRow = {
  name: string;
  mobile: string | null;
  email: string;
  papers: {
    paperId: string;
    trackCode: string;
    role: "Corresponding" | "Co-author";
    pathway: "A" | "B";
    /** True if this paper was Pathway B and cancelled back to Pathway A. */
    reverted: boolean;
    title: string;
    trackName: string;
    /** Corresponding author of this paper (may be this person). */
    corresponding: string | null;
    /** Co-authors of this paper (everyone not marked corresponding). */
    coAuthors: string[];
  }[];
  trackCodes: string[];
  roles: ("Corresponding" | "Co-author")[];
  signedUp: boolean;
  /** Enrolled for the event (staff-confirmed). Distinct from fee payment. */
  registered: boolean;
  /** Registration fee received (staff-confirmed). */
  paid: boolean;
  /** Which fee tier was actually paid (null when unpaid). */
  paidTier: "early" | "regular" | null;
  /** Staff-confirmed attendance (distinct from the declared intention). */
  attended: boolean;
  /** Papers that can earn a participation certificate, and how many already have one. */
  certEligiblePapers: number;
  certsGenerated: number;
  /** Attendance intention as declared (attending → fee applies). */
  intention: "attending" | "not" | "undeclared";
  /** The delegate's originally reported participation mode (virtual / onsite). */
  mode: string | null;
  /** Staff override when the delegate later switches mode; null if unchanged. */
  modeActual: "onsite" | "virtual" | null;
  category: string | null;
  member: boolean;
  fee: RegistrationFee;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Leading honorifics to ignore when indexing / sorting by name.
const SALUTATIONS = new Set([
  "dr", "prof", "professor", "mr", "mrs", "ms", "miss", "mx", "sri", "smt",
  "shri", "er", "capt", "col", "maj", "rev", "hon", "adv",
]);

/** Drop any leading salutation tokens (e.g. "Dr.", "Prof.") from a name. */
function stripSalutation(name: string): string {
  let n = (name ?? "").trim();
  for (;;) {
    const m = n.match(/^([A-Za-z]+)\.?\s+/);
    if (m && SALUTATIONS.has(m[1].toLowerCase())) {
      n = n.slice(m[0].length).trim();
    } else break;
  }
  return n || (name ?? "").trim();
}

/** The alphabet-index bucket for a name (ignoring salutation): first A–Z
 *  letter, else "#". */
function initialOf(name: string): string {
  const c = (stripSalutation(name)[0] || "").toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

/**
 * Author Management — one row per PERSON (deduped by email): the papers they are
 * on and their role, whether they have signed up / registered, their declared
 * intention to attend, and the registration amount (only when they intend to
 * attend). Filter by track and search; sort alphabetically by author name.
 */
export function AuthorManagement({
  rows,
  tracks,
  usdInr,
}: {
  rows: PersonRow[];
  tracks: { code: string; name: string }[];
  /** USD → INR rate for showing the Indian equivalent of Foreign fees. */
  usdInr: number;
}) {
  const [track, setTrack] = useState("all");
  const [q, setQ] = useState("");
  const [regFilter, setRegFilter] = useState<"all" | "registered" | "not">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "onsite" | "virtual">("all");
  const [pathwayFilter, setPathwayFilter] = useState<"all" | "A" | "B">("all");
  // Active alphabet-index letter ("all" = every author).
  const [letter, setLetter] = useState<string>("all");
  // Track + pathway filters for the Registration analytics panel (independent
  // of the table filters).
  const [anaTrack, setAnaTrack] = useState("all");
  const [anaPathway, setAnaPathway] = useState<"all" | "A" | "B">("all");

  const analytics = useMemo(() => {
    const base = rows.filter(
      (r) =>
        (anaTrack === "all" || r.trackCodes.includes(anaTrack)) &&
        (anaPathway === "all" || r.papers.some((p) => p.pathway === anaPathway))
    );
    const registered = base.filter((r) => r.registered);
    let onsite = 0;
    let virtual = 0;
    let modeUnset = 0;
    for (const r of registered) {
      const m = r.modeActual ?? r.mode;
      if (m === "onsite") onsite += 1;
      else if (m === "virtual") virtual += 1;
      else modeUnset += 1;
    }
    // Paper-level pathway counts (distinct papers in the selected track).
    const paperMap = new Map<string, { pathway: "A" | "B"; reverted: boolean }>();
    for (const r of rows) {
      for (const p of r.papers) {
        if (anaTrack !== "all" && p.trackCode !== anaTrack) continue;
        if (anaPathway !== "all" && p.pathway !== anaPathway) continue;
        if (!paperMap.has(p.paperId))
          paperMap.set(p.paperId, { pathway: p.pathway, reverted: p.reverted });
      }
    }
    const papers = [...paperMap.values()];
    return {
      total: base.length,
      registered: registered.length,
      notRegistered: base.length - registered.length,
      onsite,
      virtual,
      modeUnset,
      pathwayA: papers.filter((p) => p.pathway === "A").length,
      pathwayB: papers.filter((p) => p.pathway === "B").length,
      cancelledBtoA: papers.filter((p) => p.reverted).length,
    };
  }, [rows, anaTrack, anaPathway]);

  // Download the currently-filtered list as a spreadsheet (CSV, opens in
  // Excel). Row 1 records the active filters; row 2 is the column header.
  function downloadExcel() {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const modeLabel = (m: string | null) =>
      m === "onsite" ? "On-site" : m === "virtual" ? "Virtual" : "";
    const filtersSummary = [
      `Track: ${track === "all" ? "All tracks" : track}`,
      `Search: ${q.trim() || "—"}`,
      `Registration: ${
        regFilter === "all"
          ? "All"
          : regFilter === "registered"
            ? "Registered"
            : "Not registered"
      }`,
      `Mode: ${
        modeFilter === "all" ? "All" : modeFilter === "onsite" ? "On-site" : "Virtual"
      }`,
      `Pathway: ${pathwayFilter === "all" ? "All" : `Pathway ${pathwayFilter}`}`,
      `Name starts with: ${letter === "all" ? "All" : letter}`,
    ].join("   |   ");
    const headers = [
      "Author Name", "Mobile", "Email", "Participant Category", "GIFT Society Member",
      "Paper IDs", "Papers (pathway)", "Tracks", "Role(s)", "Signed up",
      "Registered", "Fee paid", "Fee amount", "Attendance intention", "Attended",
      "Reported mode", "Actual mode", "Mode changed", "Certificate generated",
    ];
    const dataRows = filtered.map((r) => {
      const eff = r.modeActual ?? r.mode;
      const feeInfo = r.paidTier
        ? feeForTier(r.category, r.member, r.paidTier)
        : null;
      return [
        r.name, r.mobile ?? "", r.email, r.category ?? "",
        r.member ? "Yes" : "No",
        r.papers.map((p) => p.paperId).join("; "),
        r.papers
          .map((p) => `${p.paperId}: Pathway ${p.pathway}${p.reverted ? " (B→A)" : ""}`)
          .join("; "),
        r.trackCodes.join("; "),
        r.roles.join("; "),
        r.signedUp ? "Yes" : "No",
        r.registered ? "Yes" : "No",
        r.paidTier ? (r.paidTier === "early" ? "Early bird" : "Regular") : "Not paid",
        feeInfo?.known ? formatMoney(feeInfo.currency, feeInfo.amount) : "",
        r.intention === "attending"
          ? "Attending"
          : r.intention === "not"
            ? "Not attending"
            : "Undeclared",
        r.attended ? "Yes" : "No",
        modeLabel(r.mode),
        modeLabel(eff),
        r.modeActual != null && r.mode != null && r.modeActual !== r.mode
          ? "Yes"
          : "No",
        r.certEligiblePapers > 0 && r.certsGenerated >= r.certEligiblePapers
          ? "Yes"
          : "No",
      ]
        .map(esc)
        .join(",");
    });
    const csv = [
      esc(`Filters — ${filtersSummary}`),
      headers.map(esc).join(","),
      ...dataRows,
    ].join("\r\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "author-management.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  // Which paper's title/track popup is open (keyed by email + paper index).
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  // Which person's participation desk is in edit mode (by email).
  const [editEmail, setEditEmail] = useState<string | null>(null);
  // Per-author confirmation gate for the certificate actions (keyed by email).
  const [certUnlocked, setCertUnlocked] = useState<Record<string, boolean>>({});

  const { list: filtered, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Track + search first; the alphabet index reflects this subset.
    const base = rows.filter((row) => {
      if (track !== "all" && !row.trackCodes.includes(track)) return false;
      if (regFilter === "registered" && !row.registered) return false;
      if (regFilter === "not" && row.registered) return false;
      if (modeFilter !== "all" && (row.modeActual ?? row.mode) !== modeFilter)
        return false;
      if (
        pathwayFilter !== "all" &&
        !row.papers.some((p) => p.pathway === pathwayFilter)
      )
        return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.papers.some((p) => p.paperId.toLowerCase().includes(needle))
      );
    });
    const avail = new Set(base.map((row) => initialOf(row.name)));
    let r = letter === "all" ? base : base.filter((row) => initialOf(row.name) === letter);
    r = [...r].sort((a, b) =>
      stripSalutation(a.name).localeCompare(stripSalutation(b.name))
    );
    return { list: r, available: avail };
  }, [rows, track, q, letter, regFilter, modeFilter, pathwayFilter]);

  return (
    <div className="space-y-4 [&_.badge]:rounded-md">
      {/* ---- Registration analytics ---- */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Registration analytics
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
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Registered
            </p>
            <p className="mt-0.5 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              {analytics.registered}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Not registered
            </p>
            <p className="mt-0.5 text-2xl font-bold text-slate-700 dark:text-slate-200">
              {analytics.notRegistered}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Registered · On-site
            </p>
            <p className="mt-0.5 text-2xl font-bold text-blue-800 dark:text-blue-200">
              {analytics.onsite}
            </p>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-500/30 dark:bg-teal-500/10">
            <p className="text-[11px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Registered · Virtual
            </p>
            <p className="mt-0.5 text-2xl font-bold text-teal-800 dark:text-teal-200">
              {analytics.virtual}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {analytics.total} author{analytics.total === 1 ? "" : "s"}
          {anaTrack === "all" ? " across all tracks" : ` in ${anaTrack}`} ·
          Registered split by mode: {analytics.onsite} on-site + {analytics.virtual} virtual
          {analytics.modeUnset > 0 && ` + ${analytics.modeUnset} mode not set`}.
        </p>
        {/* Small boxes: papers by pathway + those cancelled from B back to A. */}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            Pathway A papers <b className="text-sm">{analytics.pathwayA}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
            Pathway B papers <b className="text-sm">{analytics.pathwayB}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Cancelled B → A <b className="text-sm">{analytics.cancelledBtoA}</b>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Line 1 — dropdown filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="input flex-1 text-sm sm:min-w-[10rem]"
          >
            <option value="all">All tracks</option>
            {tracks.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
          <select
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value as typeof pathwayFilter)}
            className="input flex-1 text-sm sm:min-w-[10rem]"
            aria-label="Pathway filter"
          >
            <option value="all">All (pathway)</option>
            <option value="A">Pathway A</option>
            <option value="B">Pathway B</option>
          </select>
          <select
            value={regFilter}
            onChange={(e) => setRegFilter(e.target.value as typeof regFilter)}
            className="input flex-1 text-sm sm:min-w-[10rem]"
            aria-label="Registration filter"
          >
            <option value="all">All (registration)</option>
            <option value="registered">Registered</option>
            <option value="not">Not registered</option>
          </select>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)}
            className="input flex-1 text-sm sm:min-w-[10rem]"
            aria-label="Mode filter"
          >
            <option value="all">All (mode)</option>
            <option value="onsite">On-site</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>
        {/* Line 2 — long search + count + download */}
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search author, email, paper…"
            className="input flex-1 text-sm"
          />
          <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">
            {filtered.length} of {rows.length}
          </span>
          <button
            type="button"
            onClick={downloadExcel}
            className="btn-secondary shrink-0 whitespace-nowrap text-sm"
            title="Download the filtered list (opens in Excel); the active filters are recorded in the first row"
          >
            ⬇ Download Excel
          </button>
        </div>
      </div>

      {/* Author's Name — A–Z index; jump to authors starting with a letter. */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Author&apos;s Name
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
                    : "bg-transparent text-slate-300 cursor-not-allowed dark:text-slate-700"
              }`}
            >
              {L}
            </button>
          );
        })}
        {available.has("#") && (
          <button
            type="button"
            onClick={() => setLetter(letter === "#" ? "all" : "#")}
            className={`w-7 rounded-md py-1 text-xs font-semibold transition ${
              letter === "#"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
            title="Names not starting with A–Z"
          >
            #
          </button>
        )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                {[
                  "Author",
                  "Papers (Paper ID · Role · Pathway) & participation",
                  "Role, Status, and Applicable Participation Fee",
                  "Participation desk",
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
                  <td colSpan={4} className="td text-center text-slate-400 py-8">
                    No authors match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                // Headline fee: timeline-driven by default; once staff record
                // a paid tier it overrides the display to that tier's amount.
                const tierPaid = r.paidTier
                  ? feeForTier(r.category, r.member, r.paidTier)
                  : null;
                const feeView =
                  r.paidTier && tierPaid
                    ? {
                        known: tierPaid.known,
                        tier: r.paidTier,
                        currency: tierPaid.currency,
                        base: tierPaid.base,
                        discount: tierPaid.discount,
                        amount: tierPaid.amount,
                        overridden: true,
                      }
                    : {
                        known: r.fee.known,
                        tier: r.fee.tier,
                        currency: r.fee.currency,
                        base: r.fee.base,
                        discount: r.fee.discount,
                        amount: r.fee.amount,
                        overridden: false,
                      };
                return (
                <tr key={r.email} className="hover:bg-slate-50 align-top">
                  {/* Author */}
                  <td className="td whitespace-nowrap">
                    <span className="font-medium text-slate-900">{r.name}</span>
                    {r.mobile && (
                      <span className="block text-xs text-slate-500">
                        {r.mobile}
                      </span>
                    )}
                    <span className="block text-xs text-slate-500">{r.email}</span>
                    <span
                      className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        r.category
                          ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      {r.category ?? "Category not specified"}
                    </span>
                    <span
                      className={`mt-1.5 block w-fit rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        r.member
                          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      {r.member ? "★ GIFT Society member" : "Not a GIFT Society member"}
                    </span>
                  </td>

                  {/* Papers + per-paper role */}
                  <td className="td">
                    <ul className="space-y-0.5">
                      {r.papers.map((p, i) => {
                        const key = `${r.email}-${i}`;
                        const open = openPaper === key;
                        return (
                          <li key={key} className="text-xs relative">
                            <button
                              type="button"
                              onClick={() => setOpenPaper(open ? null : key)}
                              className="font-mono text-blue-700 hover:underline dark:text-blue-300"
                              title="Click for paper title & track"
                            >
                              {p.paperId}
                            </button>
                            <span className="text-slate-400"> · {p.role}</span>
                            <span
                              className={`ml-2 inline-block rounded-md px-1.5 py-0 text-[10px] font-medium ${
                                p.pathway === "A"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                              }`}
                            >
                              {p.pathway === "A" ? "Pathway A · Abstract" : "Pathway B · Full paper"}
                            </span>
                            {open && (
                              <div className="absolute z-30 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {p.paperId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenPaper(null)}
                                    className="text-slate-400 hover:text-slate-600 text-sm leading-none"
                                    aria-label="Close"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {p.title}
                                </p>
                                <dl className="mt-2 space-y-1 text-xs">
                                  <div>
                                    <dt className="inline text-slate-400">Track: </dt>
                                    <dd className="inline text-slate-700 dark:text-slate-200">
                                      {p.trackName}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="inline text-slate-400">
                                      Corresponding:{" "}
                                    </dt>
                                    <dd className="inline text-slate-700 dark:text-slate-200">
                                      {p.corresponding ?? "—"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="inline text-slate-400">
                                      Co-authors:{" "}
                                    </dt>
                                    <dd className="inline text-slate-700 dark:text-slate-200">
                                      {p.coAuthors.length
                                        ? p.coAuthors.join(", ")
                                        : "—"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {/* Intention to participate + mode, below the papers */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500">
                        Intentions:
                      </span>
                      {r.intention === "attending" ? (
                        <span className="badge bg-emerald-100 text-emerald-800">
                          Attending
                        </span>
                      ) : r.intention === "not" ? (
                        <span className="badge bg-slate-100 text-slate-600">
                          Not attending
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">
                          Intention not declared
                        </span>
                      )}
                      {r.mode && (
                        <span
                          className={`badge ${
                            r.mode === "onsite"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          {r.mode === "onsite"
                            ? "On-site"
                            : r.mode === "virtual"
                              ? "Virtual"
                              : r.mode}
                        </span>
                      )}
                    </div>

                    {/* Actual, as on today: confirmed attendance (from the
                        Participation desk) + the mode they are attending in
                        (the staff override if the delegate switched). */}
                    {(() => {
                      const effMode = r.modeActual ?? r.mode;
                      const modeChanged =
                        r.modeActual != null &&
                        r.mode != null &&
                        r.modeActual !== r.mode;
                      return (
                        <div className="mt-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-medium text-slate-500">
                              Status:
                            </span>
                            {r.attended ? (
                              <span className="badge bg-emerald-100 text-emerald-800">
                                Attended
                              </span>
                            ) : (
                              <span className="badge bg-slate-100 text-slate-500">
                                Not attended
                              </span>
                            )}
                            {effMode && (
                              <span className="inline-flex flex-col items-start">
                                <span
                                  className={`badge ${
                                    effMode === "onsite"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-teal-100 text-teal-800"
                                  }`}
                                >
                                  {effMode === "onsite"
                                    ? "On-site"
                                    : effMode === "virtual"
                                      ? "Virtual"
                                      : effMode}
                                </span>
                                {modeChanged && (
                                  <span className="text-[10px] font-medium text-amber-600">
                                    (changed from{" "}
                                    {r.mode === "onsite" ? "On-site" : "Virtual"})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-400">
                            (as on today)
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Role & status (role + sign-up + registration) */}
                  <td className="td">
                    <div className="flex flex-col gap-1 items-start">
                      {r.roles.includes("Corresponding") && (
                        <span className="badge bg-indigo-100 text-indigo-800">
                          Corresponding
                        </span>
                      )}
                      {r.roles.includes("Co-author") && (
                        <span className="badge bg-slate-100 text-slate-600">
                          Co-author
                        </span>
                      )}
                      {r.signedUp ? (
                        <span className="badge bg-emerald-100 text-emerald-800">
                          Signed up
                        </span>
                      ) : (
                        <span className="badge bg-rose-100 text-rose-800">
                          Not signed up
                        </span>
                      )}
                      {r.registered ? (
                        <span className="badge bg-emerald-100 text-emerald-800">
                          Confirmed participation
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">
                          Not registered
                        </span>
                      )}
                    </div>

                    {/* Applicable participation fee (timeline-driven, or the
                        paid tier once recorded on the Participation desk) */}
                    <div className="mt-2.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Participation fee
                      </p>
                      {r.intention !== "attending" ? (
                        <span className="text-xs text-slate-400">
                          Not applicable
                        </span>
                      ) : feeView.known ? (
                        <div className="mt-0.5">
                          <span
                            className={`badge mr-2 ${
                              feeView.tier === "early"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {feeView.tier === "early" ? "Early bird" : "Regular"}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {formatMoney(feeView.currency, feeView.amount)}
                          </span>
                          {feeView.currency === "USD" && (
                            <span className="mt-1 block w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                              ≈ {formatMoney("INR", Math.round(feeView.amount * usdInr))}
                              <span className="block text-[9px] font-normal text-emerald-600/80">
                                @ ₹{usdInr.toFixed(2)}/$ (today)
                              </span>
                            </span>
                          )}
                          {feeView.discount > 0 && (
                            <span className="block text-[10px] text-slate-400">
                              <span className="line-through">
                                {formatMoney(feeView.currency, feeView.base)}
                              </span>{" "}
                              −15% member ({r.category})
                            </span>
                          )}
                          {feeView.discount === 0 && r.category && (
                            <span className="block text-[10px] text-slate-400">
                              {r.category}
                            </span>
                          )}
                          <span className="block text-[10px] text-slate-400">
                            {feeView.overridden
                              ? "Paid tier (overrides timeline)"
                              : "As per timeline"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Category not set
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Participation desk — attendance / registration / payment
                      + certificate */}
                  <td className="td align-top min-w-[13rem]">
                    {/* Attendance · Registration · Payment — editable desk */}
                    <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                      {editEmail === r.email ? (
                        <>
                        <ActionForm
                          action={saveParticipationStatus}
                          onDone={() => setEditEmail(null)}
                          className="space-y-1.5"
                        >
                          <input type="hidden" name="email" value={r.email} />
                          <p className="text-[10px] leading-tight text-slate-400">
                            Manual validation — each field opens blank. Set only
                            what you verify; blank fields are left unchanged.
                          </p>
                          {(
                            [
                              ["attended", "Attendance", "Attended", "Not attended"],
                              ["registered", "Registration", "Registered", "Not registered"],
                            ] as const
                          ).map(([name, label, yes, no]) => (
                            <label key={name} className="block">
                              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                {label}
                              </span>
                              <select
                                name={name}
                                defaultValue=""
                                className="input text-[11px] py-0.5 h-auto"
                              >
                                <option value="">— Select to validate —</option>
                                <option value="true">{yes}</option>
                                <option value="false">{no}</option>
                              </select>
                            </label>
                          ))}
                          {/* Fees paid: which tier was collected. The amounts
                              here are the per-tier rates for this delegate's
                              category; the headline fee above stays timeline-based. */}
                          <label className="block">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Fees paid
                            </span>
                            <select
                              name="paid_tier"
                              defaultValue=""
                              className="input text-[11px] py-0.5 h-auto"
                            >
                              <option value="">— Select to validate —</option>
                              <option value="none">Not paid</option>
                              <option value="early">
                                Early Bird Fee
                                {feeForTier(r.category, r.member, "early").known
                                  ? ` — ${formatMoney(
                                      feeForTier(r.category, r.member, "early").currency,
                                      feeForTier(r.category, r.member, "early").amount
                                    )}`
                                  : ""}
                              </option>
                              <option value="regular">
                                Regular Fee
                                {feeForTier(r.category, r.member, "regular").known
                                  ? ` — ${formatMoney(
                                      feeForTier(r.category, r.member, "regular").currency,
                                      feeForTier(r.category, r.member, "regular").amount
                                    )}`
                                  : ""}
                              </option>
                            </select>
                          </label>
                          {/* Participation mode: defaults to the reported value;
                              change it if the delegate switches On-site<->Virtual. */}
                          <label className="block">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Participation mode
                            </span>
                            <select
                              name="mode_actual"
                              defaultValue=""
                              className="input text-[11px] py-0.5 h-auto"
                            >
                              <option value="">— Select to validate —</option>
                              <option value="onsite">On-site</option>
                              <option value="virtual">Virtual</option>
                            </select>
                            {r.modeActual != null &&
                              r.mode != null &&
                              r.modeActual !== r.mode && (
                                <span className="block text-[10px] font-medium text-amber-600">
                                  (changed from{" "}
                                  {r.mode === "onsite" ? "On-site" : "Virtual"})
                                </span>
                              )}
                          </label>
                          <div className="flex gap-1.5 pt-0.5">
                            <SubmitButton
                              variant="primary"
                              className="flex-1 justify-center text-[11px] py-0.5 px-2"
                            >
                              Save
                            </SubmitButton>
                            <button
                              type="button"
                              onClick={() => setEditEmail(null)}
                              className="btn-secondary flex-1 justify-center text-[11px] py-0.5 px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </ActionForm>
                        <ActionForm
                          action={resetParticipationStatus}
                          onDone={() => setEditEmail(null)}
                          confirm="Reset this author's participation — attendance, registration, fee and mode — back to blank? This does not delete any certificate already generated."
                        >
                          <input type="hidden" name="email" value={r.email} />
                          <SubmitButton
                            variant="danger"
                            className="mt-1 w-full justify-center text-[11px] py-0.5 px-2"
                          >
                            Reset participation
                          </SubmitButton>
                        </ActionForm>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            {(
                              [
                                ["Attendance", r.attended],
                                ["Registration", r.registered],
                              ] as const
                            ).map(([label, on]) => (
                              <div
                                key={label}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="text-slate-500">{label}</span>
                                <span
                                  className={`rounded px-1.5 py-0 font-medium ${
                                    on
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {on ? "Yes" : "No"}
                                </span>
                              </div>
                            ))}
                            {/* Fees paid — the tier collected + its amount. */}
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-500">Fees paid</span>
                              {r.paidTier ? (
                                <span className="rounded px-1.5 py-0 font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                  {r.paidTier === "early" ? "Early bird" : "Regular"}
                                  {feeForTier(r.category, r.member, r.paidTier).known
                                    ? ` · ${formatMoney(
                                        feeForTier(r.category, r.member, r.paidTier).currency,
                                        feeForTier(r.category, r.member, r.paidTier).amount
                                      )}`
                                    : ""}
                                </span>
                              ) : (
                                <span className="rounded px-1.5 py-0 font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  Not paid
                                </span>
                              )}
                            </div>
                            {/* Mode — the effective (possibly changed) value. */}
                            {(() => {
                              const effMode = r.modeActual ?? r.mode;
                              const modeChanged =
                                r.modeActual != null &&
                                r.mode != null &&
                                r.modeActual !== r.mode;
                              return (
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-slate-500">Mode</span>
                                  <span className="text-right">
                                    <span
                                      className={`rounded px-1.5 py-0 font-medium ${
                                        effMode === "onsite"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                                          : effMode === "virtual"
                                            ? "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300"
                                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                      }`}
                                    >
                                      {effMode === "onsite"
                                        ? "On-site"
                                        : effMode === "virtual"
                                          ? "Virtual"
                                          : "—"}
                                    </span>
                                    {modeChanged && (
                                      <span className="block text-[10px] font-medium text-amber-600">
                                        changed from{" "}
                                        {r.mode === "onsite" ? "On-site" : "Virtual"}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditEmail(r.email)}
                            className="btn-secondary w-full justify-center text-[11px] py-0.5 px-2"
                          >
                            Edit &amp; save
                          </button>
                        </>
                      )}

                      {r.certEligiblePapers > 0 &&
                      r.certsGenerated >= r.certEligiblePapers ? (
                        <span className="block rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          ✓ Certificate generated
                        </span>
                      ) : r.attended && r.registered && r.paid ? (
                        // The Preview + Generate controls appear only once
                        // attendance, registration AND payment are all recorded,
                        // and are unlocked by an explicit verification checkbox.
                        (() => {
                          const unlocked = !!certUnlocked[r.email];
                          return (
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
                                  I&apos;ve verified this author — enable preview
                                  &amp; generate
                                </span>
                              </label>
                              <a
                                href={
                                  unlocked
                                    ? `/api/participation-certificate/preview?email=${encodeURIComponent(
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
                              <ActionForm action={generateParticipationCertificates}>
                                <input type="hidden" name="email" value={r.email} />
                                <SubmitButton
                                  variant="primary"
                                  disabled={!unlocked}
                                  className={`w-full justify-center text-[11px] py-0.5 px-2 ${
                                    unlocked ? "" : "cursor-not-allowed opacity-40"
                                  }`}
                                >
                                  {r.certsGenerated > 0
                                    ? "Generate remaining"
                                    : "Generate certificate"}
                                </SubmitButton>
                              </ActionForm>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="block text-center text-[10px] text-slate-400">
                          Mark attended, registered &amp; paid to generate
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
