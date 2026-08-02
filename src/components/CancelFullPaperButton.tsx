"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelFullPaper } from "@/lib/actions";

/**
 * Corresponding-author control to cancel a Pathway B full paper and revert the
 * paper to an accepted Pathway A abstract. Deliberately guarded by a two-step
 * ("double") confirmation before the server action runs, because it notifies
 * every author and the handling Track Editor + Convener and cannot be undone
 * from here.
 */
export function CancelFullPaperButton({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  // 0 = idle link, 1 = first confirm, 2 = final confirm
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    const res = await cancelFullPaper(fd);
    setBusy(false);
    if (res.ok) {
      setStep(0);
      router.refresh();
    } else {
      setError(res.message ?? "Could not cancel the full paper.");
    }
  }

  if (step === 0) {
    return (
      <button
        type="button"
        onClick={() => setStep(1)}
        className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
      >
        Cancel full paper submission
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left">
      {step === 1 ? (
        <>
          <p className="text-xs text-red-900">
            Cancel the full paper and move this paper back to the{" "}
            <strong>Pathway A</strong> dashboard? Your abstract stays accepted;
            the full-paper track is withdrawn.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              Keep full paper
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-red-900">
            <strong>Final confirmation.</strong> All co-authors, the handling
            Track Editor and the Convener will be emailed about this decision.
            This cannot be undone here.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Cancelling…" : "Yes, cancel full paper submission"}
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              disabled={busy}
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              No, keep it
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
