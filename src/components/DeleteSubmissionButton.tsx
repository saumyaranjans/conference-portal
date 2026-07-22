"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteSubmission } from "@/lib/actions";

export function DeleteSubmissionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (
      !window.confirm(
        "Delete this paper permanently? This also removes its reviews, decisions and files, and cannot be undone."
      )
    )
      return;

    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    const res = await deleteSubmission(fd);

    if (res.ok) {
      router.push("/chief");
      router.refresh();
    } else {
      setError(res.message ?? "Could not delete the paper.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onClick} disabled={busy} className="btn-danger">
        {busy ? "Deleting…" : "Delete paper"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
