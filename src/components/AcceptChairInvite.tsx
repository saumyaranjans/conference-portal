"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptTrackChairInvite,
  declineTrackInvitation,
} from "@/lib/actions";

/** The accept button on a track-chair invitation. */
export function AcceptChairInvite({
  token,
  trackName,
  trackId,
}: {
  token: string;
  trackName: string;
  /** Present when the invitation can also be declined from here. */
  trackId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  async function accept() {
    setBusy(true);
    const res = await acceptTrackChairInvite(token);
    setBusy(false);
    setResult({ ok: res.ok, message: res.message ?? "" });
    if (res.ok) router.refresh();
  }

  async function reject() {
    if (!trackId) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("track_id", trackId);
    const res = await declineTrackInvitation(fd);
    setBusy(false);
    setResult({ ok: res.ok, message: res.message ?? "" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={busy || result?.ok}
        className="btn-primary"
      >
        {busy
          ? "Accepting…"
          : result?.ok
            ? "Accepted ✓"
            : `Accept — Track Editor for ${trackName}`}
      </button>

      {trackId && !result?.ok && (
        <button
          type="button"
          onClick={reject}
          disabled={busy}
          className="btn-secondary ml-2"
        >
          Reject
        </button>
      )}

      {result && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            result.ok
              ? "text-emerald-700 bg-emerald-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
