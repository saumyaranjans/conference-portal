"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** File extension from the stored name (or path), lower-cased, no dot. */
function extOf(name: string | null, path: string | null): string {
  const src = (name || path || "").toLowerCase();
  const m = src.match(/\.([a-z0-9]+)(?:\?|$)/);
  return m ? m[1] : "";
}

/**
 * In-dashboard viewer for a manuscript. PDFs render in the browser. Word
 * documents are deliberately download-only: rendering an untrusted Office
 * archive into the privileged portal DOM adds a large parser attack surface.
 */
export function DocumentViewer({
  filePath,
  fileName,
}: {
  filePath: string | null;
  fileName: string | null;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const ext = extOf(fileName, filePath);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!filePath) {
        setStatus("error");
        setMessage("No file uploaded yet.");
        return;
      }
      setStatus("loading");

      const { data, error } = await createClient()
        .storage.from("papers")
        .createSignedUrl(filePath, 300);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setStatus("error");
        setMessage("Could not open the file. Try downloading it instead.");
        return;
      }
      setSignedUrl(data.signedUrl);

      if (ext === "pdf") {
        setStatus("ready");
        return;
      }

      setStatus("error");
      setMessage(
        ext === "doc" || ext === "docx"
          ? "For security, Word files are download-only and are not rendered inside the portal."
          : "This file type cannot be previewed; download it to view."
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filePath, ext]);

  async function download() {
    let url = signedUrl;
    if (!url && filePath) {
      const { data } = await createClient()
        .storage.from("papers")
        .createSignedUrl(filePath, 300);
      url = data?.signedUrl ?? null;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {status === "loading" && (
        <div className="p-3 text-sm text-slate-500 border-b border-slate-100">
          Loading preview...
        </div>
      )}

      {ext === "pdf" && status === "ready" && signedUrl && (
        <iframe
          src={signedUrl}
          title={fileName ?? "Manuscript"}
          className="w-full"
          style={{ height: "70vh" }}
          sandbox="allow-same-origin"
        />
      )}

      {status === "error" && (
        <div className="p-4 text-sm text-slate-600 space-y-2">
          <p>{message}</p>
          {filePath && (
            <button
              onClick={download}
              className="btn-secondary text-xs py-1 px-2"
            >
              Download {fileName ?? "file"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
