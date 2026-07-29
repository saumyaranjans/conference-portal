"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reassignTrackEditor } from "@/lib/actions";

export type ChairOption = { id: string; name: string };

/**
 * Compact per-row control on the Convener's submission list: hand this paper
 * to one of its track's chairs. Only chairs of that track appear, and any who
 * authored the paper are filtered out before it gets here.
 */
export function AssignPaperEditor({
  submissionId,
  chairs,
  invitedCount = 0,
  currentId,
  defaultLabel,
}: {
  submissionId: string;
  chairs: ChairOption[];
  /** Invited but not yet accepted — they cannot be given a paper yet. */
  invitedCount?: number;
  /** The per-paper override, when the Convener has set one. */
  currentId: string | null;
  /** What "no override" means for this paper — usually "Any track chair". */
  defaultLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (chairs.length === 0) {
    return (
      <span className="text-xs text-slate-400">
        {invitedCount > 0
          ? `${invitedCount} invited — awaiting acceptance`
          : "No Track Editor yet — invite one above"}
      </span>
    );
  }

  // Explicit: pick a name, then press Assign. Choosing alone changes nothing.
  async function assign() {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("editor_id", value);
    const res = await reassignTrackEditor(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "Could not assign.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-[12rem]">
      <div className="flex items-center gap-1.5">
        <select
          className="input py-1 text-xs"
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Track Editor for this paper"
        >
          <option value="">{defaultLabel}</option>
          {chairs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={assign}
          disabled={busy || value === (currentId ?? "")}
          className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
        >
          {busy ? "…" : "Assign"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
