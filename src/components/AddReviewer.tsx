"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  prepareReviewerInvite,
  sendReviewerInvite,
  type PreparedInvite,
} from "@/lib/actions";
import { InstitutionInput } from "@/components/InstitutionInput";
import { ComposeEmail } from "@/components/ComposeEmail";

export type ReviewerOption = {
  reviewer_id: string;
  full_name: string | null;
  email: string | null;
  affiliation: string | null;
  open_assignments: number;
  expertise: string[] | null;
};

/**
 * One box for adding a reviewer to a paper. Typing searches the reviewers the
 * portal already knows; if nobody matches, the same box offers to add the
 * person as a new reviewer. Either way the chair prepares the invitation,
 * previews it, and sends it — the assignment happens on send, so an abandoned
 * draft leaves nothing behind.
 */
export function AddReviewer({
  submissionId,
  available,
}: {
  submissionId: string;
  available: ReviewerOption[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ReviewerOption | null>(null);
  const [adding, setAdding] = useState(false);

  const [designation, setDesignation] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedInvite | null>(null);
  const [sent, setSent] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = available;
    if (!q) return pool.slice(0, 8);
    return pool
      .filter((c) =>
        [c.full_name, c.email, c.affiliation, ...(c.expertise ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [available, query]);

  function choose(c: ReviewerOption) {
    setPicked(c);
    setAdding(false);
    setQuery(c.full_name || c.email || "");
    setOpen(false);
    setError(null);
  }

  function startAdding() {
    setPicked(null);
    setAdding(true);
    setOpen(false);
    setError(null);
  }

  function clearChoice() {
    setPicked(null);
    setAdding(false);
    setQuery("");
    setDesignation("");
    setAffiliation("");
    setEmail("");
  }

  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("due_date", dueDate);
    if (picked) {
      fd.set("reviewer_id", picked.reviewer_id);
    } else {
      fd.set("full_name", query.trim());
      fd.set("designation", designation);
      fd.set("affiliation", affiliation);
      fd.set("email", email);
    }

    const res = await prepareReviewerInvite(fd);
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
    fd.set("submission_id", submissionId);
    fd.set("due_date", dueDate);
    fd.set("to", prepared.to);
    fd.set("subject", subject);
    fd.set("body", body);
    if (prepared.reviewerId) fd.set("reviewer_id", prepared.reviewerId);

    const res = await sendReviewerInvite(fd);
    if (res.ok) {
      setSent(true);
      router.refresh();
    }
    return res;
  }

  function reset() {
    setPrepared(null);
    setSent(false);
    setDueDate("");
    clearChoice();
  }

  if (prepared) {
    return (
      <div className="px-5 py-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add a reviewer
        </p>
        {prepared.warning && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:text-amber-100 dark:bg-amber-500/15 dark:border-amber-500/40">
            ⚠ {prepared.warning}
          </p>
        )}
        <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
          Invitation to <strong>{prepared.reviewerName}</strong> is ready. Review
          it below, then click <strong>Send invitation</strong> to email it to{" "}
          <strong>{prepared.to}</strong>.
          {prepared.existing
            ? " They will be assigned to this paper when you send."
            : " They will be assigned once they complete sign-up."}
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
          {sent ? "Add another reviewer" : "Cancel"}
        </button>
      </div>
    );
  }

  const canPrepare = Boolean(picked) || (adding && query.trim() && email.trim());

  return (
    <form onSubmit={onPrepare} className="px-5 py-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Add a reviewer
      </p>

      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <input
            className="input"
            placeholder="Type a name or email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            aria-label="Reviewer"
          />

          {open && !adding && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-slate-700 dark:bg-slate-800">
              {matches.map((c) => (
                <button
                  key={c.reviewer_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(c)}
                  className="block w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.full_name || c.email}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {[
                      c.affiliation,
                      `${c.open_assignments} open`,
                      c.expertise?.length ? c.expertise.join(", ") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ))}

              {/* Bright by design — the way out when nobody in the list fits. */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={startAdding}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border-t border-amber-200 dark:text-amber-100 dark:bg-amber-500/25 dark:hover:bg-amber-500/35 dark:border-amber-500/40"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs leading-none">
                  +
                </span>
                <span>
                  Add{query.trim() ? ` “${query.trim()}”` : " someone"} as a new
                  reviewer
                </span>
              </button>
            </div>
          )}
        </div>

        <input
          type="date"
          className="input"
          aria-label="Review deadline"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <button
          type="submit"
          disabled={busy || !canPrepare}
          className="btn-primary whitespace-nowrap"
        >
          {busy ? "Preparing…" : "Prepare invitation"}
        </button>
      </div>

      {picked && (
        <p className="text-xs text-slate-500">
          Inviting <strong>{picked.full_name || picked.email}</strong> ({picked.email}
          ) ·{" "}
          <button
            type="button"
            onClick={clearChoice}
            className="text-blue-700 underline"
          >
            change
          </button>
        </p>
      )}

      {adding && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            New reviewer
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="add-name">
                Full name
              </label>
              <input
                id="add-name"
                required
                className="input"
                placeholder="Dr Jane Doe"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="add-designation">
                Designation
              </label>
              <input
                id="add-designation"
                className="input"
                placeholder="e.g. Professor, Associate Professor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="add-affiliation">
                Affiliation
              </label>
              <InstitutionInput
                id="add-affiliation"
                placeholder="Start typing the institution…"
                value={affiliation}
                onChange={setAffiliation}
              />
            </div>
            <div>
              <label className="label" htmlFor="add-email">
                Email
              </label>
              <input
                id="add-email"
                type="email"
                required
                className="input"
                placeholder="reviewer@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={clearChoice}
            className="text-xs text-blue-700 underline"
          >
            Search existing reviewers instead
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-400">
        Search the reviewers already on the portal, or add someone new. The
        invitation is previewed before anything is sent or assigned.
      </p>
    </form>
  );
}
