"use client";

export type PreviewAuthor = {
  full_name: string;
  designation: string;
  affiliation: string;
};

/**
 * Camera-ready proof of the abstract, shown for the author's review and
 * approval before the abstract is submitted.
 */
export function CameraReadyPreview({
  conferenceName,
  trackName,
  title,
  authors,
  abstract,
  keywords,
}: {
  conferenceName: string;
  trackName: string;
  title: string;
  authors: PreviewAuthor[];
  abstract: string;
  keywords: string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-300 overflow-hidden"
      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
    >
      {/* -------- Standardized letterhead (single image) -------- */}
      <img
        src="/letterhead.png"
        alt="GLOGIFT 2027 — Indian Institute of Management Sambalpur"
        className="w-full block"
      />

      <div className="px-8 sm:px-12 pb-10 pt-2">
        {/* -------- Track -------- */}
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Track: {trackName || "—"}
        </p>

        {/* -------- Title -------- */}
        <h1 className="text-center text-lg font-bold mt-4 leading-snug">
          {title || "—"}
        </h1>

      {/* -------- Authors in declared order -------- */}
      <div className="text-center mt-4 space-y-1">
        {authors.map((a, i) => (
          <p key={i} className="text-sm">
            <span className="font-medium">{a.full_name}</span>
            {[a.designation, a.affiliation].filter(Boolean).length > 0 && ", "}
            {[a.designation, a.affiliation].filter(Boolean).join(", ")}
          </p>
        ))}
      </div>

      {/* -------- Abstract -------- */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide">Abstract</h2>
        <p className="text-sm mt-2 whitespace-pre-wrap text-justify leading-relaxed">
          {abstract}
        </p>
      </section>

      {/* -------- Keywords -------- */}
      {keywords.trim() && (
        <section className="mt-6">
          <p className="text-sm">
            <span className="font-bold">Keywords: </span>
            {keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>
      )}
      </div>
    </div>
  );
}
