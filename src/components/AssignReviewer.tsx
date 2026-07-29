"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignReviewer } from "@/lib/actions";
import { ComposeEmail } from "@/components/ComposeEmail";

export type ReviewerOption = {
  reviewer_id: string;
  full_name: string | null;
  email: string | null;
  open_assignments: number;
  expertise: string[] | null;
};

/**
 * Assign a reviewer who already has a portal account. The paper is assigned on
 * "Prepare invitation"; the letter is then previewed and sent to their profile
 * email with "Invite & send email" — the same two-step flow as inviting an
 * outside expert.
 */
export function AssignReviewer({
  submissionId,
  available,
}: {
  submissionId: string;
  available: ReviewerOption[];
}) {
  const router = useRouter();
  const [reviewerId, setReviewerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [compose, setCompose] = useState<
    { to: string; subject: string; body: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    setCompose(null);
    setBusy(true);

    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("reviewer_id", reviewerId);
    fd.set("due_date", dueDate);

    const res = await assignReviewer(fd);
    setBusy(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    setNote(res.message);
    setCompose(res.compose ?? null);
    router.refresh();
  }

  function reset() {
    setNote(null);
    setCompose(null);
    setReviewerId("");
    setDueDate("");
  }

  if (compose) {
    return (
      <div className="px-5 py-4 space-y-4">
        {note && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            {note}
          </p>
        )}
        <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
          Invitation prepared. Review it below, then click{" "}
          <strong>Invite &amp; send email</strong> to email it to{" "}
          <strong>{compose.to}</strong>.
        </p>
        <ComposeEmail
          to={compose.to}
          subject={compose.subject}
          body={compose.body}
          showSend
          sendLabel={"Invite & send email"}
        />
        <button type="button" onClick={reset} className="btn-secondary">
          Assign another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="px-5 py-4">
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <select
          required
          className="input"
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          aria-label="Reviewer"
        >
          <option value="">Select a reviewer…</option>
          {available.map((c) => (
            <option key={c.reviewer_id} value={c.reviewer_id}>
              {c.full_name || c.email} — {c.open_assignments} open
              {c.expertise?.length ? ` · ${c.expertise.join(", ")}` : ""}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          aria-label="Due date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-primary whitespace-nowrap"
        >
          {busy ? "Preparing…" : "Prepare invitation"}
        </button>
      </div>

      {available.length === 0 && (
        <p className="text-xs text-slate-400 mt-2">
          No further reviewers available — add one below.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}
      {note && !compose && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-3">
          {note}
        </p>
      )}

      <p className="text-xs text-slate-400 mt-2">
        The reviewer is assigned straight away; the invitation is then previewed
        and emailed to the address on their profile.
      </p>
    </form>
  );
}
