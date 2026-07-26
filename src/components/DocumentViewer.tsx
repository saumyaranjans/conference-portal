"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** File extension from the stored name (or path), lower-cased, no dot. */
function extOf(name: string | null, path: string | null): string {
  const src = (name || path || "").toLowerCase();
  const m = src.match(/\.([a-z0-9]+)(?:\?|$)/);
  return m ? m[1] : "";
}

/**
 * In-dashboard viewer window for a submission's manuscript. PDFs render in an
 * iframe; .docx is rendered client-side with docx-preview (no external
 * service, so author identity never leaves the portal); legacy .doc and other
 * types fall back to a download link.
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
  const docxRef = useRef<HTMLDivElement>(null);
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

      if (ext === "docx") {
        try {
          const resp = await fetch(data.signedUrl);
          const buf = await resp.arrayBuffer();
          if (cancelled) return;
          const { renderAsync } = await import("docx-preview");
          if (docxRef.current) {
            docxRef.current.innerHTML = "";
            await renderAsync(buf, docxRef.current, undefined, {
              className: "docx",
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
            });
          }
          if (!cancelled) setStatus("ready");
        } catch {
          if (!cancelled) {
            setStatus("error");
            setMessage("Preview unavailable for this file — download to view.");
          }
        }
        return;
      }

      setStatus("error");
      setMessage(
        ext === "doc"
          ? "Legacy .doc files can't be previewed in the browser — download to view."
          : "This file type can't be previewed — download to view."
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
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {status === "loading" && (
        <div className="p-3 text-sm text-slate-500 border-b border-slate-100">
          Loading preview…
        </div>
      )}

      {ext === "pdf" && status === "ready" && signedUrl && (
        <iframe
          src={signedUrl}
          title={fileName ?? "Manuscript"}
          className="w-full"
          style={{ height: "70vh" }}
        />
      )}

      {ext === "docx" && status !== "error" && (
        <div className="max-h-[70vh] overflow-auto bg-slate-100 p-4">
          <div ref={docxRef} className="mx-auto bg-white shadow-sm" />
        </div>
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
