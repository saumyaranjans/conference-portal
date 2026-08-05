"use client";

import { useState } from "react";
import { issueCertificate } from "@/lib/certificateActions";

/**
 * Editorial-Office "Preview" — generates an unsaved certificate PDF (with
 * relaxed checks, any time) and opens it in a new tab. Nothing is issued,
 * emailed, or shown to the recipient; that is the separate "Generate" button.
 */
export function CertificatePreviewButton({
  type,
  subjectId,
  conferenceId,
  number,
}: {
  type: "participant" | "reviewer" | "track_editor";
  subjectId: string;
  conferenceId: string;
  /** Fixed number (issued state). When absent, the entered/auto-generated
   *  number is read from the enclosing form so the preview matches the box. */
  number?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preview(e: React.MouseEvent<HTMLButtonElement>) {
    setBusy(true);
    setError(null);

    const fromForm = (
      e.currentTarget
        .closest("form")
        ?.elements.namedItem("certificate_number") as HTMLInputElement | null
    )?.value?.trim();
    const certNumber = (number ?? fromForm ?? "").trim();

    // Open the tab NOW — synchronously inside the click's user gesture — so the
    // browser does not treat it as an unsolicited pop-up and block it. (No
    // "noopener": that makes window.open return null, and we need the handle to
    // fill the tab once the PDF is ready.)
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(
        "<!doctype html><title>Certificate preview</title>" +
          "<body style='font-family:system-ui,sans-serif;padding:2rem;color:#475569'>" +
          "Generating certificate preview…</body>"
      );
    }

    const fd = new FormData();
    fd.set("certificate_type", type);
    fd.set("subject_id", subjectId);
    fd.set("conference_id", conferenceId);
    if (certNumber) fd.set("certificate_number", certNumber);
    fd.set("preview", "true");
    const res = await issueCertificate(fd);
    setBusy(false);

    if (res.ok && res.previewPdf) {
      const bytes = Uint8Array.from(atob(res.previewPdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" })
      );
      if (win) {
        win.location.href = url;
      } else {
        // The browser blocked the tab despite the synchronous open — fall back
        // to downloading the preview PDF instead.
        const a = document.createElement("a");
        a.href = url;
        a.download = "certificate-preview.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      if (win) win.close();
      setError(res.message ?? "Could not generate a preview.");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={preview}
        disabled={busy}
        className="btn-secondary"
      >
        {busy ? "Preparing…" : "Preview"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
