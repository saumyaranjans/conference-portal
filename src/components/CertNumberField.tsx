"use client";

import { useState } from "react";

/**
 * Certificate-number chooser for the Certificate Office. Two explicit modes:
 *  • Auto-generate — the number is minted on Generate (submits blank).
 *  • Enter number — type a number, Save it (edit again any time). The saved
 *    value is what gets submitted with the Generate form.
 * Renders a hidden `certificate_number` input so it drops straight into the
 * issue form.
 */
export function CertNumberField({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<"auto" | "enter">("auto");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  // Only a saved, typed number is sent; otherwise blank → the server auto-mints.
  const submitted = mode === "enter" && saved ? value.trim() : "";

  const tab = (active: boolean) =>
    `rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
      active
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
    }`;

  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5"}>
      {!compact && (
        <span className="label">Certificate number</span>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            setMode("auto");
            setSaved(false);
          }}
          className={tab(mode === "auto")}
        >
          Auto-generate
        </button>
        <button
          type="button"
          onClick={() => setMode("enter")}
          className={tab(mode === "enter")}
        >
          Enter number
        </button>
      </div>

      {mode === "auto" ? (
        <span className="text-[10px] text-slate-500">
          A number is generated automatically on Generate.
        </span>
      ) : saved ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-800 dark:text-slate-100">
            {value.trim() || "—"}
          </span>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="text-[10px] font-medium text-blue-600 hover:underline"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type certificate number"
            className={`input ${compact ? "h-8 w-44 text-xs" : "w-64"}`}
          />
          <button
            type="button"
            onClick={() => setSaved(true)}
            disabled={!value.trim()}
            className="btn-secondary px-2 py-1 text-[10px] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}

      <input type="hidden" name="certificate_number" value={submitted} />
    </div>
  );
}
