"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteReviewer } from "@/lib/actions";
import { InstitutionInput } from "@/components/InstitutionInput";
import { ComposeEmail } from "@/components/ComposeEmail";

/** A prepared invitation, ready to preview and send to the reviewer. */
type Prepared = {
  to: string;
  subject: string;
  body: string;
  /** Set when the reviewer already had an account (and is now assigned). */
  note?: string;
};

/**
 * Chair-facing form to invite an outside reviewer by their details. Either way
 * the invitation is emailed to the reviewer through the portal: at the address
 * on their profile if they already have an account (they are assigned to the
 * paper straight away), otherwise at the address the chair typed here, with a
 * sign-up link. The chair prepares the draft, previews it, then sends.
 */
export function InviteReviewer({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPrepared(null);
    setBusy(true);

    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("full_name", fullName);
    fd.set("designation", designation);
    fd.set("affiliation", affiliation);
    fd.set("email", email);
    fd.set("due_date", dueDate);

    const res = await inviteReviewer(fd);
    setBusy(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    if (res.existing) {
      setPrepared({ ...res.compose, note: res.message });
      router.refresh();
      return;
    }
    setPrepared(res.invite);
  }

  function reset() {
    setPrepared(null);
    setFullName("");
    setDesignation("");
    setAffiliation("");
    setEmail("");
    setDueDate("");
  }

  return (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Invite a reviewer
      </p>

      {!prepared ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="inv-name">
                Full name
              </label>
              <input
                id="inv-name"
                required
                className="input"
                placeholder="Dr Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="inv-designation">
                Designation
              </label>
              <input
                id="inv-designation"
                className="input"
                placeholder="e.g. Professor, Associate Professor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="inv-affiliation">
                Affiliation
              </label>
              <InstitutionInput
                id="inv-affiliation"
                placeholder="Start typing the institution…"
                value={affiliation}
                onChange={setAffiliation}
              />
            </div>
            <div>
              <label className="label" htmlFor="inv-email">
                Email
              </label>
              <input
                id="inv-email"
                type="email"
                required
                className="input"
                placeholder="reviewer@example.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="inv-due">
                Review deadline <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="inv-due"
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Preparing…" : "Prepare invitation"}
          </button>

          <p className="text-xs text-slate-400">
            The invitation is emailed to the reviewer — at the address on their
            profile if they already have an account, otherwise at the address
            you enter above. Prepare it, preview it, then send.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          {prepared.note && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {prepared.note}
            </p>
          )}
          <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
            Invitation prepared. Review it below, then click{" "}
            <strong>Send now</strong> to email it to{" "}
            <strong>{prepared.to}</strong>.
          </p>
          <ComposeEmail
            to={prepared.to}
            subject={prepared.subject}
            body={prepared.body}
            showSend
          />
          <button type="button" onClick={reset} className="btn-secondary">
            Invite another
          </button>
        </div>
      )}
    </div>
  );
}

