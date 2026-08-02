"use client";

import { useState } from "react";

/**
 * Abstract-revision only: a short "Response to Track Editor & Reviewer" the
 * corresponding author writes when resubmitting a revised abstract. Capped at
 * 300 words (live counter; the server re-checks). Renders a `revision_response`
 * field so it submits with the surrounding "Submit revision" form.
 */
export function RevisionResponse({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [val, setVal] = useState(defaultValue ?? "");
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;
  const over = words > 300;

  return (
    <div>
      <label className="label" htmlFor="revision_response">
        Response to Track Editor &amp; Reviewer
      </label>
      <p className="text-xs text-slate-500 mb-1.5">
        Briefly explain how you have addressed the comments (max 300 words).
      </p>
      <textarea
        id="revision_response"
        name="revision_response"
        rows={6}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="input"
        placeholder="Summarise how the reviewer and track editor comments have been addressed…"
      />
      <p className={`text-xs mt-1 ${over ? "text-rose-600" : "text-slate-500"}`}>
        {words} / 300 words{over ? " — please shorten before submitting" : ""}
      </p>
    </div>
  );
}
