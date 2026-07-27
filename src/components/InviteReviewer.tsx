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
          </div>

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Preparing…" : "Prepare invitation"}
          </button>

          <p className="text-xs text-slate-400">
            If they already have an account they are added and assigned straight
            away. Otherwise you get an email to copy into your own mail client.
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
                Optional: email them a heads-up
              </p>
              <ComposeEmail
                to={existingCompose.to}
                subject={existingCompose.subject}
                body={existingCompose.body}
              />
            </div>
          )}
        </form>
      ) : (
        <GeneratedEmail invite={invite} onDone={reset} />
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" onClick={copy} className="btn-secondary text-xs py-1 px-2">
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function GeneratedEmail({
  invite,
  onDone,
}: {
  invite: { link: string; subject: string; body: string };
  onDone: () => void;
}) {
  const mailto = `mailto:?subject=${encodeURIComponent(
    invite.subject
  )}&body=${encodeURIComponent(invite.body)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
        Invitation ready. Copy the subject and message below into your email
        (Gmail, Outlook, …) and send it to the reviewer.
      </p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Subject</label>
          <CopyButton text={invite.subject} label="Copy subject" />
        </div>
        <input readOnly className="input bg-slate-50" value={invite.subject} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Message</label>
          <CopyButton text={invite.body} label="Copy message" />
        </div>
        <textarea
          readOnly
          rows={12}
          className="input bg-slate-50 font-mono text-xs leading-relaxed"
          value={invite.body}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Invitation link</label>
          <CopyButton text={invite.link} label="Copy link" />
        </div>
        <input readOnly className="input bg-slate-50 text-xs" value={invite.link} />
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={mailto} className="btn-secondary">
          Open in mail app
        </a>
        <button type="button" onClick={onDone} className="btn-secondary">
          Invite another
        </button>
      </div>

      <p className="text-xs text-slate-400">
        The reviewer appears in the list above only after they complete
        registration from this link.
      </p>
    </div>
  );
}
