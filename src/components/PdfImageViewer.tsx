"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a PDF as page images on a <canvas> using pdf.js. This works in every
 * browser (it does not rely on the built-in PDF plugin, which our security
 * headers block from framing), and keeps the quality at a light low-to-medium
 * resolution. The actual PDF stays available via the Download link.
 *
 * The worker is served same-origin from /public so it passes the app CSP
 * (worker-src 'self').
 */
export function PdfImageViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    let doc: any = null;

    (async () => {
      try {
        setStatus("loading");
        // Clear any previously-rendered pages up front so a slow or failing new
        // src never leaves the old document (possibly a different paper) visible.
        if (containerRef.current) containerRef.current.innerHTML = "";
        setPageCount(0);

        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(src, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        // isEvalSupported:false keeps pdf.js off new Function()/eval, which our
        // CSP blocks (no 'unsafe-eval').
        doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
        if (cancelled) {
          try {
            doc.destroy();
          } catch {
            /* ignore */
          }
          return;
        }
        setPageCount(doc.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        // Light low-to-medium resolution: cap the rendered width.
        const TARGET_W = 760;
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(1.3, TARGET_W / base.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 12px";
          canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          canvas.setAttribute("aria-label", `Page ${i}`);

          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            container.appendChild(canvas);
          }
        }
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMsg((e as Error)?.message ?? "unknown error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        doc?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [src]);

  return (
    <div>
      {status === "loading" && (
        <p className="p-3 text-sm text-slate-500">Rendering preview…</p>
      )}
      {status === "error" && (
        <p className="p-3 text-sm text-rose-600">
          Could not render the preview ({msg}). Please use “Download PDF”.
        </p>
      )}
      <div
        ref={containerRef}
        className="max-h-[75vh] overflow-y-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-3"
      />
      {status === "ready" && (
        <p className="mt-1 text-xs text-slate-400">{pageCount} page(s)</p>
      )}
    </div>
  );
}
