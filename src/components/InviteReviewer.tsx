"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteReviewer, type InviteResult } from "@/lib/actions";
import { InstitutionInput } from "@/components/InstitutionInput";
import { ComposeEmail } from "@/components/ComposeEmail";

/**
 * Chair-facing form to invite an outside reviewer by their details. If the
 * email already has an account they are assigned immediately; otherwise the
 * portal returns a ready-to-send invitation email the chair copies into their
 * own mail client (Gmail / Hotmail / …).
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
  const [existingMsg, setExistingMsg] = useState<string | null>(null);
  const [existingCompose, setExistingCompose] = useState<
    { to: string; subject: string; body: string } | null
  >(null);
  const [invite, setInvite] =
    useState<Extract<InviteResult, { existing: false }>["invite"] | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExistingMsg(null);
    setExistingCompose(null);
    setInvite(null);
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
      setExistingMsg(res.message);
      setExistingCompose(res.compose ?? null);
      setFullName("");
      setDesignation("");
      setAffiliation("");
      setEmail("");
      setDueDate("");
      router.refresh();
      return;
    }
    setInvite(res.invite);
  }

  function reset() {
    setInvite(null);
    setFullName("");
    setDesignation("");
    setAffiliation("");
    setEmail("");
  }

  return (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Invite a reviewer
      </p>

      {!invite ? (
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
            If they already have an account they are added and assigned. Either
            way you can preview the invitation and send it from the portal.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {existingMsg && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {existingMsg}
            </p>
          )}
          {existingCompose && (
            <div className="border-t border-slate-100 pt-3 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Send them a heads-up
              </p>
              <ComposeEmail
                to={existingCompose.to}
                subject={existingCompose.subject}
                body={existingCompose.body}
                showSend
              />
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
            Invitation prepared. Review it below, then click <strong>Send now</strong>{" "}
            to email it (with the signup link) to <strong>{invite.to}</strong>.
          </p>
          <ComposeEmail
            to={invite.to}
            subject={invite.subject}
            body={invite.body}
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

