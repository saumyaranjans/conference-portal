"use client";

import { useState } from "react";
import {
  prepareChairInvite,
  sendChairInvite,
  type PreparedInvite,
} from "@/lib/actions";
import { ComposeEmail } from "@/components/ComposeEmail";
import { InstitutionInput } from "@/components/InstitutionInput";

type Person = { id: string; full_name: string; email: string };
type TrackOpt = { id: string; name: string };

/**
 * Convener invites a Track Editor to a track. Someone already on the portal is
 * picked from the list; anyone else is added here by name, designation,
 * affiliation and email — those details pre-fill their sign-up, so completing
 * it drops them straight into their Track Queue. The letter is previewed, then
 * sent through the portal.
 */
export function ChairInviteComposer({
  editors,
  tracks,
}: {
  editors: Person[];
  tracks: TrackOpt[];
  /** Kept for callers that still pass it; the count is read server-side now. */
  openByTrack?: Record<string, number>;
}) {
  const [trackId, setTrackId] = useState("");
  const [personId, setPersonId] = useState("");
  const [adding, setAdding] = useState(false);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedInvite | null>(null);
  const [sent, setSent] = useState(false);

  const ready = Boolean(
    trackId && (adding ? fullName.trim() && email.trim() : personId)
  );

  async function onPrepare() {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("track_id", trackId);
    if (adding) {
      fd.set("full_name", fullName);
      fd.set("designation", designation);
      fd.set("affiliation", affiliation);
      fd.set("email", email);
    } else {
      fd.set("editor_id", personId);
    }
    const res = await prepareChairInvite(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPrepared(res.prepared);
  }

  async function onSend(subject: string, body: string) {
    if (!prepared) return { ok: false, message: "Nothing to send." };
    const fd = new FormData();
    fd.set("to", prepared.to);
    fd.set("subject", subject);
    fd.set("body", body);
    const res = await sendChairInvite(fd);
    if (res.ok) setSent(true);
    return res;
  }

  function reset() {
    setPrepared(null);
    setSent(false);
    setPersonId("");
    setFullName("");
    setDesignation("");
    setAffiliation("");
    setEmail("");
    setAdding(false);
  }

  if (prepared) {
    return (
      <div className="card card-pad space-y-4">
        <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
          Invitation to <strong>{prepared.reviewerName}</strong> is ready.
          Review it below, then click <strong>Send invitation</strong> to email
          it to <strong>{prepared.to}</strong>.
          {prepared.existing
            ? " They accept from the link, and the track is theirs once they do."
            : " The link opens a sign-up already filled in with their details."}
        </p>
        <ComposeEmail
          to={prepared.to}
          subject={prepared.subject}
          body={prepared.body}
          showSend
          sendLabel="Send invitation"
          onSend={onSend}
        />
        <button type="button" onClick={reset} className="btn-secondary">
          {sent ? "Invite someone else" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <div className="card card-pad space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="chair-track">
            Track
          </label>
          <select
            id="chair-track"
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

        {!adding && (
          <div>
            <label className="label" htmlFor="chair-person">
              Track Editor
            </label>
            <select
              id="chair-person"
              className="input"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">Select a Track Editor…</option>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name || e.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 dark:text-amber-100 dark:bg-amber-500/25 dark:hover:bg-amber-500/35"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs leading-none">
            +
          </span>
          Not on the portal? Add a new Track Editor
        </button>
      ) : (
        <div className="border-t border-slate-100 pt-3 space-y-3 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            New Track Editor
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="chair-name">
                Full name
              </label>
              <input
                id="chair-name"
                className="input"
                placeholder="Dr Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="chair-designation">
                Designation
              </label>
              <input
                id="chair-designation"
                className="input"
                placeholder="e.g. Professor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="chair-affiliation">
                Affiliation
              </label>
              <InstitutionInput
                id="chair-affiliation"
                placeholder="Start typing the institution…"
                value={affiliation}
                onChange={setAffiliation}
              />
            </div>
            <div>
              <label className="label" htmlFor="chair-email">
                Email
              </label>
              <input
                id="chair-email"
                type="email"
                className="input"
                placeholder="editor@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-blue-700 underline"
          >
            Choose from the portal instead
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onPrepare}
        disabled={busy || !ready}
        className="btn-primary"
      >
        {busy ? "Preparing…" : "Prepare invitation"}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-400">
        The invitation carries the conference link, sign-up instructions and a
        contact address. It is previewed before anything is sent.
      </p>
    </div>
  );
}
