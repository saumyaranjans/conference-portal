"use client";

import { useMemo, useState } from "react";
import { formatMoney, type RegistrationFee } from "@/lib/registrationFees";

export type PersonRow = {
  name: string;
  email: string;
  papers: { paperId: string; trackCode: string; role: "Corresponding" | "Co-author" }[];
  trackCodes: string[];
  roles: ("Corresponding" | "Co-author")[];
  signedUp: boolean;
  registered: boolean;
  /** Attendance intention as declared (attending → fee applies). */
  intention: "attending" | "not" | "undeclared";
  category: string | null;
  member: boolean;
  fee: RegistrationFee;
};

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
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows.filter((row) => {
      if (track !== "all" && !row.trackCodes.includes(track)) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.papers.some((p) => p.paperId.toLowerCase().includes(needle))
      );
    });
    r = [...r].sort((a, b) => {
      const c = a.name.localeCompare(b.name);
      return dir === "asc" ? c : -c;
    });
    return r;
  }, [rows, track, q, dir]);

  return (
    <div className="space-y-4 [&_.badge]:rounded-md">
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
        <button
          type="button"
          onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="btn-secondary text-sm"
        >
          Author name {dir === "asc" ? "A → Z" : "Z → A"}
        </button>
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {rows.length} authors
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                {[
                  "Author",
                  "Papers (Paper ID · role)",
                  "Role",
                  "Status",
                  "Intention to participate",
                  "Registration amount",
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
                  <td colSpan={6} className="td text-center text-slate-400 py-8">
                    No authors match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.email} className="hover:bg-slate-50 align-top">
                  {/* Author */}
                  <td className="td whitespace-nowrap">
                    <span className="font-medium text-slate-900">{r.name}</span>
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
                  </td>

                  {/* Papers + per-paper role */}
                  <td className="td">
                    <ul className="space-y-0.5">
                      {r.papers.map((p, i) => (
                        <li key={`${p.paperId}-${i}`} className="text-xs">
                          <span className="font-mono text-slate-600">{p.paperId}</span>
                          <span className="text-slate-400"> · {p.role}</span>
                        </li>
                      ))}
                    </ul>
                  </td>

                  {/* Role summary */}
                  <td className="td">
                    <div className="flex flex-col gap-1">
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
                    </div>
                  </td>

                  {/* Status: sign-up + registration */}
                  <td className="td">
                    <div className="flex flex-col gap-1">
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
                          Registered
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">
                          Not registered
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Intention to participate */}
                  <td className="td">
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
                        Not declared
                      </span>
                    )}
                  </td>

                  {/* Registration amount — only when intending to attend */}
                  <td className="td whitespace-nowrap">
                    {r.intention !== "attending" ? (
                      <span className="text-xs text-slate-400">
                        Not applicable
                      </span>
                    ) : r.fee.known ? (
                      <div>
                        <span
                          className={`badge mr-2 ${
                            r.fee.tier === "early"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.fee.tier === "early" ? "Early bird" : "Regular"}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatMoney(r.fee.currency, r.fee.amount)}
                        </span>
                        {r.fee.discount > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            <span className="line-through">
                              {formatMoney(r.fee.currency, r.fee.base)}
                            </span>{" "}
                            −15% member ({r.category})
                          </span>
                        )}
                        {r.fee.discount === 0 && r.category && (
                          <span className="block text-[10px] text-slate-400">
                            {r.category}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Category not set
                      </span>
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
