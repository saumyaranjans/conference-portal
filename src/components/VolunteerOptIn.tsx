"use client";

import { VOLUNTEER_ROLE_INFO, type VolunteerRole } from "@/lib/types";

/**
 * Offers to serve as a Reviewer and/or a Track Editor.
 *
 * Shown only to faculty, and only ever as an offer: nothing here grants access.
 * The Convener decides on each offer separately, which is why the two are
 * independent checkboxes rather than one control with three states.
 *
 * The duties are listed in full rather than summarised behind a link. Someone
 * agreeing to review three to five papers over Christmas should be able to see
 * that before they tick the box, not after they are assigned.
 */
export type VolunteerTrack = { id: string; code: string | null; name: string };

export function VolunteerOptIn({
  reviewer,
  editor,
  tracks = [],
  reviewerTrack = "",
  editorTrack = "",
  onChange,
  onTrackChange,
}: {
  reviewer: boolean;
  editor: boolean;
  /** Conference tracks, for the "which track" question. */
  tracks?: VolunteerTrack[];
  reviewerTrack?: string;
  editorTrack?: string;
  onChange: (role: VolunteerRole, next: boolean) => void;
  onTrackChange?: (role: VolunteerRole, trackId: string) => void;
}) {
  const rows: { role: VolunteerRole; checked: boolean; track: string }[] = [
    { role: "reviewer", checked: reviewer, track: reviewerTrack },
    { role: "editor", checked: editor, track: editorTrack },
  ];

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Serving the conference <span className="text-slate-400">(optional)</span>
      </p>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        GLOGIFT 27 is run by its academic community. If you are willing to help,
        tell us here — you may choose either role, both, or neither. Your offer
        goes to the Convener, who decides on each one. Nothing changes for you
        unless and until it is accepted.
      </p>

      <div className="space-y-3">
        {rows.map(({ role, checked, track }) => {
          const info = VOLUNTEER_ROLE_INFO[role];
          return (
            <label
              key={role}
              className={`block cursor-pointer rounded-lg border p-3 transition ${
                checked
                  ? "border-blue-400 bg-blue-50/70 dark:border-blue-500/50 dark:bg-blue-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                  checked={checked}
                  onChange={(e) => onChange(role, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    I am willing to serve as a {info.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">
                    {info.summary}
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">
                    What this involves:
                  </span>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-500">
                    {info.duties.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>

                  {checked && tracks.length > 0 && (
                    <span
                      className="mt-3 block"
                      // The select lives inside a <label>; without this a click
                      // on it toggles the checkbox that wraps it.
                      onClick={(e) => e.preventDefault()}
                    >
                      <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                        {role === "editor"
                          ? "Which track would you chair?"
                          : "Which track is closest to your expertise?"}
                      </span>
                      <select
                        value={track}
                        onChange={(e) => onTrackChange?.(role, e.target.value)}
                        className="input mt-1 w-full text-sm"
                      >
                        <option value="">Select a track</option>
                        {tracks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code ? `${t.code} - ` : ""}
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-slate-500">
                        {role === "editor"
                          ? "If the Convener accepts, you are seated on this track."
                          : "Used to match you with papers; reviewers are assigned per paper."}
                      </span>
                    </span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
