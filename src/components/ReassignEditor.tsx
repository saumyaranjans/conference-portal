"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reassignTrackEditor } from "@/lib/actions";

export type EditorOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  affiliation?: string | null;
};

/**
 * Convener-only: hand this one paper to a different Track Session Chair. Used
 * when the assigned chair has a conflict or handled it inappropriately. The
 * track keeps its own chair for every other paper.
 */
export function ReassignEditor({
  submissionId,
  editors,
  currentEditorId,
  trackEditorName,
}: {
  submissionId: string;
  editors: EditorOption[];
  currentEditorId: string | null;
  trackEditorName?: string | null;
}) {
  const router = useRouter();
  const [editorId, setEditorId] = useState(currentEditorId ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("editor_id", editorId);
    fd.set("note", note);
    const res = await reassignTrackEditor(fd);
    setBusy(false);
    setResult({ ok: res.ok, message: res.message ?? "" });
    if (res.ok) {
      setNote("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="card card-pad space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {currentEditorId
          ? "This paper is handled by a Track Editor you assigned, overriding the track's own."
          : `This paper follows its track's chair${
              trackEditorName ? ` (${trackEditorName})` : ""
            }. Reassign it to hand it to someone else — for this paper only.`}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="reassign-editor">
            Track Editor for this paper
          </label>
          <select
            id="reassign-editor"
            className="input"
            value={editorId}
            onChange={(e) => setEditorId(e.target.value)}
          >
            <option value="">— The track&rsquo;s own chair —</option>
            {editors.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name || e.email}
                {e.affiliation ? ` · ${e.affiliation}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reassign-note">
            Note to them <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="reassign-note"
            className="input"
            placeholder="Why it is being reassigned"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Saving…" : editorId ? "Reassign this paper" : "Hand back to the track chair"}
      </button>

      {result && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            result.ok
              ? "text-emerald-700 bg-emerald-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
