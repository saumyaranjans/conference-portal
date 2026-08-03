"use client";

import { useMemo, useState } from "react";

import { formatMoney, type RegistrationFee } from "@/lib/registrationFees";

export type AuthorRow = {
  paperId: string | null;
  title: string;
  track: string;
  trackCode: string;
  author: string;
  category: string | null;
  coAuthors: string[];
  member: boolean;
  fee: RegistrationFee;
};

/**
 * Author Management — a filterable list of every submission's corresponding
 * author + co-authors and the chosen participant category. Filter by track and
 * search; sort alphabetically by author name (A→Z / Z→A).
 */
export function AuthorManagement({
  rows,
  tracks,
}: {
  rows: AuthorRow[];
  tracks: { code: string; name: string }[];
}) {
  const [track, setTrack] = useState("all");
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows.filter((row) => {
      if (track !== "all" && row.trackCode !== track) return false;
      if (!needle) return true;
      return (
        row.author.toLowerCase().includes(needle) ||
        row.title.toLowerCase().includes(needle) ||
        (row.paperId ?? "").toLowerCase().includes(needle) ||
        row.coAuthors.some((c) => c.toLowerCase().includes(needle))
      );
    });
    r = [...r].sort((a, b) => {
      const c = a.author.localeCompare(b.author);
      return dir === "asc" ? c : -c;
    });
    return r;
  }, [rows, track, q, dir]);

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          placeholder="Search author, co-author, paper…"
          className="input max-w-xs"
        />
        <button
          type="button"
          onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="btn-secondary text-sm"
          title="Sort by author name"
        >
          Author name {dir === "asc" ? "A → Z" : "Z → A"}
        </button>
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                {[
                  "Paper ID",
                  "Name of Paper",
                  "Author",
                  "Co-authors",
                  "Participant Category",
                  "GLOGIFT member",
                  "Registration fee",
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
                  <td colSpan={7} className="td text-center text-slate-400 py-8">
                    No authors match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={`${r.paperId}-${i}`} className="hover:bg-slate-50 align-top">
                  <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                    {r.paperId ?? "—"}
                    <span className="block text-[10px] text-slate-400">{r.trackCode}</span>
                  </td>
                  <td className="td text-slate-800 max-w-xs">{r.title}</td>
                  <td className="td font-medium text-slate-900 whitespace-nowrap">
                    {r.author}
                  </td>
                  <td className="td text-slate-600 max-w-sm">
                    {r.coAuthors.length ? r.coAuthors.join(", ") : "—"}
                  </td>
                  <td className="td">
                    {r.category ? (
                      <span className="badge bg-violet-100 text-violet-800">
                        {r.category}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not specified</span>
                    )}
                  </td>
                  <td className="td">
                    {r.member ? (
                      <span className="badge bg-blue-100 text-blue-800">GLOGIFT member</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-600">Non-member</span>
                    )}
                  </td>
                  <td className="td whitespace-nowrap">
                    <span
                      className={`badge mr-2 ${
                        r.fee.tier === "early"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.fee.tier === "early" ? "Early bird" : "Regular"}
                    </span>
                    {r.fee.known ? (
                      <>
                        <span className="font-semibold text-slate-800">
                          {formatMoney(r.fee.currency, r.fee.amount)}
                        </span>
                        {r.fee.discount > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            <span className="line-through">
                              {formatMoney(r.fee.currency, r.fee.base)}
                            </span>{" "}
                            −15% member
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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
