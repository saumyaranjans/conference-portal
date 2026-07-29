"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptTrackChairInvite } from "@/lib/actions";

/** The accept button on a track-chair invitation. */
export function AcceptChairInvite({
  token,
  trackName,
}: {
  token: string;
  trackName: string;
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
