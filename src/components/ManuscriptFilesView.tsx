"use client";

import { useState } from "react";
import { fullPaperSlotLabel } from "@/lib/types";
import { PdfImageViewer } from "@/components/PdfImageViewer";

type StoredFile = { id: string; slot: string; file_name: string; file_path: string };

/**
 * Role-aware view of a Pathway B manuscript package.
 *
 *  - reviewer: single-blind. Sees the blinded review copy (author-less cover +
 *    manuscript) and neutral extras only — never the Title Page and never the
 *    author-named camera-ready cover.
 *  - editor / chief: identity-aware. Sees the full camera-ready PDF (cover with
 *    author names), the blinded review copy (exactly what reviewers see) and
 *    every raw uploaded file, including the Title Page.
 *
 * The two compiled PDFs render inside collapsible boxes — expand to view.
 */
const IDENTITY_SLOTS = new Set(["title_page"]);
const SLOT_ORDER = [
  "manuscript_full",
  "manuscript_anon",
  "figures",
  "tables",
  "appendices",
  "supplementary",
  "response_letter",
  "others",
  "title_page",
];

function slotLabel(slot: string): string {
  if (slot === "response_letter") return "Response letter to Reviewer & Track Editor";
  return fullPaperSlotLabel(slot);
}

export function ManuscriptFilesView({
  role,
  submissionId,
  files,
  cameraReadyBuiltAt,
  reviewCopyBuiltAt,
}: {
  role: "reviewer" | "editor" | "chief";
  submissionId: string;
  files: StoredFile[];
  cameraReadyBuiltAt?: string | null;
  /** When the blinded review copy was built (shown to reviewers with a cover). */
  reviewCopyBuiltAt?: string | null;
}) {
  const isReviewer = role === "reviewer";

  // Blinded review copy = the compiled manuscript behind an author-less cover.
  const reviewCopySrc = reviewCopyBuiltAt
    ? `/api/review-copy/${submissionId}?v=${encodeURIComponent(reviewCopyBuiltAt)}`
    : null;

  // Reviewers never see identity-bearing files.
  const visible = files
    .filter((f) => !(isReviewer && IDENTITY_SLOTS.has(f.slot)))
    .sort((a, b) => {
      const ai = SLOT_ORDER.indexOf(a.slot);
      const bi = SLOT_ORDER.indexOf(b.slot);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  // Fallback preview when no review copy is built: the raw blinded manuscript.
  const manuscript = visible.find(
    (f) => (f.slot === "manuscript_full" || f.slot === "manuscript_anon") && /\.pdf$/i.test(f.file_name)
  );

  const cameraReadySrc =
    !isReviewer && cameraReadyBuiltAt
      ? `/api/camera-ready/${submissionId}?v=${encodeURIComponent(cameraReadyBuiltAt)}`
      : null;

  if (!visible.length && !cameraReadySrc && !reviewCopySrc) {
    return (
      <p className="text-sm text-slate-500">
        No manuscript files have been uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isReviewer && (
        <p className="text-xs text-slate-400">
          Author identities are withheld — reviews are single-blind. The Title
          Page and any author-identifying material are not shown here.
        </p>
      )}

      {/* Full paper (camera-ready, with author names) — editor / convener only. */}
      {cameraReadySrc && (
        <PdfBox
          src={cameraReadySrc}
          label="Full paper — camera-ready (cover carries author identities)"
          note="Approved by the corresponding author. For the Track Editor and Convener only — never shown to reviewers."
          accent="emerald"
        />
      )}

      {/* Manuscript preview — the blinded review copy (author-less cover). */}
      {reviewCopySrc ? (
        <PdfBox
          src={reviewCopySrc}
          label="Manuscript preview — blinded, with cover"
          note={
            isReviewer
              ? undefined
              : "Exactly what your reviewers see — the compiled manuscript behind an author-less cover (single-blind)."
          }
        />
      ) : (
        manuscript && (
          <PdfBox
            src={`/api/paper-file/${manuscript.id}`}
            label={`Manuscript preview${isReviewer ? " — blinded" : ""}`}
          />
        )
      )}

      {/* Full file list. */}
      <div className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Files
        </p>
        <ul className="space-y-1.5">
          {visible.map((f) => (
            <li key={f.id} className="flex items-baseline gap-3 text-sm">
              <span className="text-[11px] uppercase tracking-wide text-slate-400 w-40 shrink-0">
                {slotLabel(f.slot)}
              </span>
              <a
                href={`/api/paper-file/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline dark:text-blue-300 truncate"
              >
                {f.file_name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * A collapsed box for a compiled PDF: header with label + actions (View /
 * Download / Open), and the pdf.js image viewer rendered only once expanded
 * (so the heavy render happens on demand).
 */
function PdfBox({
  src,
  label,
  note,
  accent,
}: {
  src: string;
  label: string;
  note?: string;
  accent?: "emerald";
}) {
  const [open, setOpen] = useState(false);
  const box =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10 dark:border-emerald-500/30"
      : "border-slate-200 dark:border-slate-700";
  const labelColor =
    accent === "emerald"
      ? "text-emerald-900 dark:text-emerald-200"
      : "text-slate-800 dark:text-slate-100";

  return (
    <div className={`rounded-lg border ${box} p-3`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-expanded={open}
          >
            {open ? "Hide" : "View"} {open ? "▲" : "▼"}
          </button>
          <a
            href={src}
            download
            className="text-blue-700 hover:underline dark:text-blue-300 text-xs"
          >
            Download
          </a>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:underline dark:text-blue-300 text-xs"
          >
            Open ↗
          </a>
        </div>
      </div>
      {note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{note}</p>}
      {open && (
        <div className="mt-3">
          <PdfImageViewer src={src} />
        </div>
      )}
    </div>
  );
}
