"use client";

import { useState } from "react";
import { ComposeEmail } from "@/components/ComposeEmail";
import { chairInviteEmail } from "@/lib/emailTemplates";

type Person = { id: string; full_name: string; email: string };
type TrackOpt = { id: string; name: string };

/**
 * Convener composes an "invitation to serve as Track Editor" email for a
 * chosen person + track, opened in their own mail client. Assigning the chair
 * (which also notifies them in-app) is done separately in the Tracks & Track Editors list.
 */
export function ChairInviteComposer({
  editors,
  tracks,
  openByTrack,
}: {
  editors: Person[];
  tracks: TrackOpt[];
  openByTrack: Record<string, number>;
}) {
  const [personId, setPersonId] = useState("");
  const [trackId, setTrackId] = useState("");

  const person = editors.find((e) => e.id === personId);
  const track = tracks.find((t) => t.id === trackId);
  const ready = person && track;

  const email = ready
    ? chairInviteEmail({
        name: person!.full_name,
        track: track!.name,
        openCount: openByTrack[track!.id] ?? 0,
      })
    : null;

  return (
    <div className="card card-pad space-y-4 mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Invite a Track Editor by email
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          className="input"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
        >
          <option value="">Select a person…</option>
          {editors.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name || e.email}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
        >
          <option value="">Select a track…</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {email && person ? (
        <ComposeEmail
          key={`${personId}:${trackId}`}
          to={person.email}
          subject={email.subject}
          body={email.body}
        />
      ) : (
        <p className="text-xs text-slate-400">
          Choose a person and a track to generate the invitation email.
        </p>
      )}
    </div>
  );
}
