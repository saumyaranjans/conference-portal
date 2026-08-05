"use client";

/**
 * Downloads the conference schedule as a PDF via the browser's print-to-PDF
 * (the page carries `@media print` styles so it renders cleanly on paper —
 * nav and controls hidden, colours preserved).
 */
export function SchedulePdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print btn-secondary shrink-0 whitespace-nowrap text-sm"
      title="Download the conference schedule as a PDF"
    >
      ⬇ Download PDF
    </button>
  );
}
