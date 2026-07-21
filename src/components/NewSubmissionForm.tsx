"use client";

import { useState } from "react";
import { createSubmission } from "@/lib/actions";
import type { Conference, Track } from "@/lib/types";

type ConfWithTracks = Conference & { tracks: Track[] };

export function NewSubmissionForm({
  conferences,
}: {
  conferences: ConfWithTracks[];
}) {
  const [confId, setConfId] = useState(conferences[0]?.id ?? "");
  const tracks =
    conferences.find((c) => c.id === confId)?.tracks ?? [];

  return (
    <form action={createSubmission} className="card card-pad space-y-5 max-w-3xl">
      {/* Conference — a selector only when more than one is open */}
      {conferences.length > 1 ? (
        <div>
          <label className="label" htmlFor="conference_id">
            Conference
          </label>
          <select
            id="conference_id"
            name="conference_id"
            required
            className="input"
            value={confId}
            onChange={(e) => setConfId(e.target.value)}
          >
            {conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.acronym} {c.year})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="conference_id" value={confId} />
      )}

      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input id="title" name="title" required className="input" />
      </div>

      <div>
        <label className="label" htmlFor="track_id">
          Track
        </label>
        <select id="track_id" name="track_id" required className="input">
          <option value="">Select a track…</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code ? `${t.code} — ${t.name}` : t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Your Paper ID (e.g. AIF-001) is assigned from the track when you submit.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="abstract">
          Abstract
        </label>
        <textarea id="abstract" name="abstract" rows={8} required className="input" />
      </div>

      <div>
        <label className="label" htmlFor="keywords">
          Keywords
        </label>
        <input
          id="keywords"
          name="keywords"
          className="input"
          placeholder="machine learning, finance, forecasting"
        />
        <p className="text-xs text-slate-400 mt-1">Comma separated.</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary">
          Create draft
        </button>
        <p className="text-xs text-slate-500">
          You will upload the paper file and add co-authors on the next screen.
        </p>
      </div>
    </form>
  );
}
