"use client";

import { useState } from "react";
import { remindTrackEditor } from "@/lib/actions";
import { ComposeEmail } from "@/components/ComposeEmail";

/**
 * Convener nudges a Track Editor who still has papers open. The letter is
 * drafted from what they are actually holding, previewed, then sent — the same
 * rule as every other message the portal sends.
 */
export function RemindTrackEditor({
  editorId,
  name,
  pending,
  missed,
}: {
  editorId: string;
  name: string;
  /** Papers of theirs still awaiting a decision. */
  pending: number;
  /** Of those, how many have a reviewer past their deadline. */
  missed: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    { to: string; subject: string; body: string } | null
  >(null);

  if (pending === 0) {
    return <span className="text-xs text-slate-400">Nothing pending</span>;
  }

  async function prepare() {
    setError(null);
    setBusy(true);
    setOpen(true);
    const fd = new FormData();
    fd.set("editor_id", editorId);
    const res = await remindTrackEditor(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "Could not prepare the reminder.");
      return;
    }
    setDraft(res.draft!);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={prepare}
        className={`btn-secondary text-xs py-1 px-2 whitespace-nowrap ${
          missed > 0 ? "border-amber-300 text-amber-900" : ""
        }`}
      >
        Remind to complete
      </button>
    );
  }

  return (
    <div className="text-left mt-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Remind {name}
      </p>
      {busy && <p className="text-xs text-slate-500">Preparing…</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {draft && (
        <ComposeEmail
          to={draft.to}
          subject={draft.subject}
          body={draft.body}
          showSend
          sendLabel="Send reminder"
        />
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setDraft(null);
        }}
        className="btn-secondary text-xs py-1 px-2 mt-3"
      >
        Close
      </button>
    </div>
  );
}
