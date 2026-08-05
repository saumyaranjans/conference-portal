"use client";

import { useState } from "react";

/**
 * Certificate-number input with an explicit "Auto-generate" button. In auto
 * mode the field submits blank and the server mints a unique alphanumeric
 * number on Generate; typing switches to manual entry. Renders the hidden
 * `certificate_number` the issue form reads.
 */
export function CertNumberField({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [auto, setAuto] = useState(true);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        name="certificate_number"
        value={auto ? "" : value}
        onChange={(e) => {
          setAuto(false);
          setValue(e.target.value);
        }}
        placeholder={
          auto ? "Auto-generated on Generate" : "Enter certificate number"
        }
        className={`input h-8 ${compact ? "w-52" : "w-64"} text-xs ${
          auto ? "text-slate-400 placeholder:text-slate-400" : ""
        }`}
      />
      <button
        type="button"
        onClick={() => {
          setAuto(true);
          setValue("");
        }}
        className={`shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
          auto
            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
        }`}
        title="A unique number is generated automatically on Generate"
      >
        {auto ? "✓ Auto-generate" : "Auto-generate"}
      </button>
    </div>
  );
}
