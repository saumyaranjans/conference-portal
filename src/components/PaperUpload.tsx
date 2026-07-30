"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Uploads straight to Supabase Storage from the browser, then records the
 * object path on the submission row. Keeps large PDFs off the server.
 */
export function PaperUpload({
  submissionId,
  currentName,
  editable,
  kind = "paper",
}: {
  submissionId: string;
  currentName: string | null;
  editable: boolean;
  /** Which slot to write to — the main paper or the camera-ready file. */
  kind?: "paper" | "camera_ready";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cols =
    kind === "camera_ready"
      ? { path: "camera_ready_file_path", name: "camera_ready_file_name" }
      : { path: "file_path", name: "file_name" };
  const folder = kind === "camera_ready" ? "camera-ready/" : "";

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("File must be under 25 MB.");
      return;
    }

    if (kind === "paper" && !/\.(doc|docx)$/i.test(file.name)) {
      setError(
        "The full paper must be a Word file (.doc or .docx)."
      );
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const path = `${submissionId}/${folder}${Date.now()}-${file.name}`;

    const { error: upErr } = await supabase.storage
      .from("papers")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const patch: Record<string, unknown> = {
      [cols.path]: path,
      [cols.name]: file.name,
    };
    if (kind === "camera_ready") patch.camera_ready_at = new Date().toISOString();

    const { error: dbErr } = await supabase
      .from("submissions")
      .update(patch)
      .eq("id", submissionId);

    if (dbErr) setError(dbErr.message);

    setBusy(false);
    router.refresh();
  }

  async function download() {
    const supabase = createClient();
    const { data: sub } = await supabase
      .from("submissions")
      .select(cols.path)
      .eq("id", submissionId)
      .single();

    const filePath = (sub as Record<string, string> | null)?.[cols.path];
    if (!filePath) return;

    const { data } = await supabase.storage
      .from("papers")
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-2">
      {currentName ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-700">{currentName}</span>
          <button onClick={download} className="btn-secondary text-xs py-1 px-2">
            Download
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No file uploaded yet.</p>
      )}

      {editable && (
        <label className="block">
          <span className="sr-only">Upload paper</span>
          <input
            type="file"
            accept={kind === "paper" ? ".doc,.docx" : ".pdf,.doc,.docx"}
            onChange={onChange}
            disabled={busy}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:text-sm file:font-medium
                       file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                       disabled:opacity-50"
          />
        </label>
      )}

      {busy && <p className="text-sm text-slate-500">Uploading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Read-only download control for reviewers / editors. */
export function PaperDownload({
  filePath,
  fileName,
}: {
  filePath: string | null;
  fileName: string | null;
}) {
  const [busy, setBusy] = useState(false);

  async function open() {
    if (!filePath) return;
    setBusy(true);
    const { data } = await createClient()
      .storage.from("papers")
      .createSignedUrl(filePath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    setBusy(false);
  }

  if (!filePath) return <span className="text-sm text-slate-400">No file</span>;

  return (
    <button onClick={open} disabled={busy} className="btn-secondary">
      {busy ? "Opening…" : `Download ${fileName ?? "paper"}`}
    </button>
  );
}
