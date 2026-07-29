"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptTrackInvitation,
  respondToPaperAssignment,
} from "@/lib/actions";

/** Accept an invitation to chair a track, from the dashboard. */
export function AcceptTrackButton({
  trackId,
  trackName,
}: {
  trackId: string;
  trackName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("track_id", trackId);
    const res = await acceptTrackInvitation(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "Could not accept.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={accept} disabled={busy} className="btn-primary">
        {busy ? "Accepting…" : `Accept ${trackName}`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Accept — or hand back — a paper the Convener assigned. */
export function AcceptPaperButtons({
  submissionId,
  compact = false,
}: {
  submissionId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setError(null);
    setBusy(accept ? "accept" : "decline");
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("accept", String(accept));
    const res = await respondToPaperAssignment(fd);
    setBusy(null);
    if (!res.ok) {
      setError(res.message ?? "Could not respond.");
      return;
    }
    router.refresh();
  }

  return (
    <div className={compact ? "flex items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
      <button
        type="button"
        onClick={() => respond(true)}
        disabled={busy !== null}
        className={compact ? "btn-primary text-xs py-1 px-2" : "btn-primary"}
      >
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      <button
        type="button"
        onClick={() => respond(false)}
        disabled={busy !== null}
        className={compact ? "btn-secondary text-xs py-1 px-2" : "btn-secondary"}
      >
        {busy === "decline" ? "…" : "Hand back"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
