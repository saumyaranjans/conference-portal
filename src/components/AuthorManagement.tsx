"use client";

import { useMemo, useState } from "react";
import {
  formatMoney,
  feeForTier,
  type RegistrationFee,
} from "@/lib/registrationFees";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { saveParticipationStatus } from "@/lib/actions";
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
    title: string;
    trackName: string;
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
}: {
  rows: PersonRow[];
  tracks: { code: string; name: string }[];
}) {
  const [track, setTrack] = useState("all");
  const [q, setQ] = useState("");
  // Active alphabet-index letter ("all" = every author).
  const [letter, setLetter] = useState<string>("all");
  // Track filter for the Registration analytics panel (independent of the table).
  const [anaTrack, setAnaTrack] = useState("all");

  const analytics = useMemo(() => {
    const base = rows.filter(
      (r) => anaTrack === "all" || r.trackCodes.includes(anaTrack)
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
    return {
      total: base.length,
      registered: registered.length,
      notRegistered: base.length - registered.length,
      onsite,
      virtual,
      modeUnset,
    };
  }, [rows, anaTrack]);
  // Which paper's title/track popup is open (keyed by email + paper index).
  const [openPaper, setOpenPaper] = useState<string | null>(null);
  // Which person's participation desk is in edit mode (by email).
  const [editEmail, setEditEmail] = useState<string | null>(null);

  const { list: filtered, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Track + search first; the alphabet index reflects this subset.
    const base = rows.filter((row) => {
      if (track !== "all" && !row.trackCodes.includes(track)) return false;
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
  }, [rows, track, q, letter]);

  return (
    <div className="space-y-4 [&_.badge]:rounded-md">
      {/* ---- Registration analytics ---- */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Registration analytics
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="input max-w-xs"
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
          placeholder="Search author, email, paper…"
          className="input max-w-xs"
        />
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {rows.length} authors
        </span>
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
                      {r.member ? "★ GLOGIFT member" : "Not a GLOGIFT member"}
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
                                <p className="mt-1 text-xs text-slate-500">
                                  Track: {p.trackName}
                                </p>
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
                        <ActionForm
                          action={saveParticipationStatus}
                          onDone={() => setEditEmail(null)}
                          className="space-y-1.5"
                        >
                          <input type="hidden" name="email" value={r.email} />
                          {(
                            [
                              ["attended", "Attendance", r.attended, "Attended", "Not attended"],
                              ["registered", "Registration", r.registered, "Registered", "Not registered"],
                            ] as const
                          ).map(([name, label, current, yes, no]) => (
                            <label key={name} className="block">
                              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                {label}
                              </span>
                              <select
                                name={name}
                                defaultValue={current ? "true" : "false"}
                                className="input text-[11px] py-0.5 h-auto"
                              >
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
                              defaultValue={r.paidTier ?? ""}
                              className="input text-[11px] py-0.5 h-auto"
                            >
                              <option value="">Not paid</option>
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
                              defaultValue={r.modeActual ?? r.mode ?? "onsite"}
                              className="input text-[11px] py-0.5 h-auto"
                            >
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
                        // The Generate control appears only once attendance,
                        // registration AND payment are all recorded.
                        <ActionForm action={generateParticipationCertificates}>
                          <input type="hidden" name="email" value={r.email} />
                          <SubmitButton
                            variant="primary"
                            className="w-full justify-center text-[11px] py-0.5 px-2"
                          >
                            {r.certsGenerated > 0
                              ? "Generate remaining"
                              : "Generate certificate"}
                          </SubmitButton>
                        </ActionForm>
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
