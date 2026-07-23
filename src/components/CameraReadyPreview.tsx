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
      className="rounded-xl border border-slate-300 p-8 sm:p-10"
      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
    >
      {/* -------- Header -------- */}
      <header className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
        <img
          src="/glogift-logo.jpg"
          alt="GLOGIFT"
          className="h-16 w-auto object-contain shrink-0"
        />

        <div className="flex-1 text-center px-2">
          <p className="text-xl font-bold tracking-wide">GLOGIFT 2027</p>
          <p className="text-[13px] leading-snug mt-1">{conferenceName}</p>
          <p className="text-[13px] font-semibold mt-1">
            Track: {trackName || "—"}
          </p>
        </div>

        <img
          src="/iim-sambalpur.png"
          alt="Indian Institute of Management Sambalpur"
          className="h-12 w-auto object-contain shrink-0"
        />
      </header>

      {/* -------- Title -------- */}
      <h1 className="text-center text-lg font-bold mt-8 leading-snug">
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
  );
}
