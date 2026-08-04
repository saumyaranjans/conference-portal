// Shared helpers for the A–Z name index used by the management directories.

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const SALUTATIONS = new Set([
  "dr", "prof", "professor", "mr", "mrs", "ms", "miss", "mx", "sri", "smt",
  "shri", "er", "capt", "col", "maj", "rev", "hon", "adv",
]);

/** Drop any leading salutation tokens (e.g. "Dr.", "Prof.") from a name. */
export function stripSalutation(name: string): string {
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
export function initialOf(name: string): string {
  const c = (stripSalutation(name)[0] || "").toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

/** Escape a value for a CSV cell. */
export function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Trigger a browser download of CSV text (opens in Excel). */
export function downloadCsv(fileName: string, rows: string[]): void {
  const blob = new Blob([`﻿${rows.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
