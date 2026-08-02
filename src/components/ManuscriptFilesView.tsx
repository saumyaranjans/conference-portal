"use client";

import { fullPaperSlotLabel } from "@/lib/types";

type StoredFile = { id: string; slot: string; file_name: string; file_path: string };

/**
 * Role-aware view of a Pathway B manuscript package.
 *
 *  - reviewer: single-blind. Sees the blinded manuscript and neutral extras
 *    only — never the Title Page and never the author-named camera-ready cover.
 *  - editor / chief: identity-aware. Sees the compiled camera-ready PDF (cover
 *    with author names + the full manuscript) plus every raw uploaded file,
 *    including the Title Page.
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
}: {
  role: "reviewer" | "editor" | "chief";
  submissionId: string;
  files: StoredFile[];
  cameraReadyBuiltAt?: string | null;
}) {
  const isReviewer = role === "reviewer";

  // Reviewers never see identity-bearing files.
  const visible = files
    .filter((f) => !(isReviewer && IDENTITY_SLOTS.has(f.slot)))
    .sort((a, b) => {
      const ai = SLOT_ORDER.indexOf(a.slot);
      const bi = SLOT_ORDER.indexOf(b.slot);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  // The slot to preview inline (the blinded manuscript, if it is a PDF).
  const manuscript = visible.find(
    (f) => (f.slot === "manuscript_full" || f.slot === "manuscript_anon") && /\.pdf$/i.test(f.file_name)
  );

  const cameraReadySrc =
    !isReviewer && cameraReadyBuiltAt
      ? `/api/camera-ready/${submissionId}?v=${encodeURIComponent(cameraReadyBuiltAt)}`
      : null;

  if (!visible.length && !cameraReadySrc) {
    return (
      <p className="text-sm text-slate-500">
        No manuscript files have been uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor / convener: the compiled camera-ready proof (author names on cover). */}
      {cameraReadySrc && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10 dark:border-emerald-500/30 p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Camera-ready PDF (compiled) — cover carries author identities
            </p>
            <a
              href={cameraReadySrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-800 dark:text-emerald-200 hover:underline"
            >
              Open in a new tab ↗
            </a>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
            Approved by the corresponding author. This full PDF is for the Track
            Editor and Convener only — it is never shown to reviewers.
          </p>
          <div className="mt-3">
            <PdfFrame src={cameraReadySrc} title="Camera-ready PDF" />
          </div>
        </div>
      )}

      {isReviewer && (
        <p className="text-xs text-slate-400">
          Author identities are withheld — reviews are single-blind. The Title
          Page and any author-identifying material are not shown here.
        </p>
      )}

      {/* Inline preview of the blinded manuscript (reviewers and everyone). */}
      {manuscript && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Manuscript preview {isReviewer ? "(blinded)" : ""}
          </p>
          <PdfFrame src={`/api/paper-file/${manuscript.id}`} title="Manuscript" />
        </div>
      )}

      {/* Full file list. */}
      <div>
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
 * Inline PDF from our own origin. A plain same-origin iframe is allowed by the
 * app CSP (frame-src 'self'); an <object> is not (object-src 'none').
 */
function PdfFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <iframe src={src} title={title} className="w-full block" style={{ height: "72vh" }} />
      <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:underline dark:text-blue-300"
        >
          Open in a new tab ↗
        </a>
      </div>
    </div>
  );
}
