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
}: {
  type: "participant" | "reviewer" | "track_editor";
  subjectId: string;
  conferenceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function preview() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("certificate_type", type);
    fd.set("subject_id", subjectId);
    fd.set("conference_id", conferenceId);
    fd.set("preview", "true");
    const res = await issueCertificate(fd);
    setBusy(false);
    if (res.ok && res.previewPdf) {
      const bytes = Uint8Array.from(atob(res.previewPdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
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
