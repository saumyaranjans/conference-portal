"use client";

import { useState } from "react";

function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Certificate-number field. The Editorial Office may type a number (it is used
 * as-is on Generate), or click "Auto-generate" to fill the box with a unique
 * alphanumeric number that stays visible and editable. Left blank, the server
 * auto-generates on Generate. Uniqueness is guaranteed by a DB constraint.
 */
export function CertNumberField({
  compact = false,
  numberPrefix = "CERT",
}: {
  compact?: boolean;
  numberPrefix?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        name="certificate_number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter number, or click Auto-generate"
        className={`input h-8 ${compact ? "w-56" : "w-64"} font-mono text-xs`}
      />
      <button
        type="button"
        onClick={() => setValue(`${numberPrefix}-${randomHex(6)}`)}
        className="shrink-0 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
        title="Fill a unique auto-generated number (you can still edit it)"
      >
        Auto-generate
      </button>
    </div>
  );
}
