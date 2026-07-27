"use client";

import { useState } from "react";

/** Copy-to-clipboard button with brief confirmation. Shared across dashboards. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="btn-secondary text-xs py-1 px-2"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

// mailto: URLs break past ~1800 chars; keep BCC one-click for small lists only.
const MAILTO_BCC_LIMIT = 30;

/**
 * Editable email draft that the sender launches in their own mail client
 * (Gmail/Outlook) via mailto:, or copies. The portal never sends the email.
 * Pass `to` for a single recipient, or `recipients` for a BCC broadcast.
 */
export function ComposeEmail({
  to,
  recipients,
  subject: initialSubject,
  body: initialBody,
}: {
  to?: string;
  recipients?: string[];
  subject: string;
  body: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const bcc = recipients ?? [];
  const tooManyForMailto = bcc.length > MAILTO_BCC_LIMIT;

  const mailto = to
    ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    : `mailto:?bcc=${encodeURIComponent(bcc.join(","))}&subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

  return (
    <div className="space-y-3">
      {to && (
        <p className="text-xs text-slate-500">
          To: <span className="font-medium">{to}</span>
        </p>
      )}
      {recipients && (
        <p className="text-xs text-slate-500">
          BCC: <span className="font-medium">{bcc.length}</span> recipient
          {bcc.length === 1 ? "" : "s"}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Subject</label>
          <CopyButton text={subject} label="Copy subject" />
        </div>
        <input
          className="input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Message</label>
          <CopyButton text={body} label="Copy message" />
        </div>
        <textarea
          rows={12}
          className="input font-mono text-xs leading-relaxed"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {!tooManyForMailto ? (
          <a href={mailto} className="btn-primary">
            Open in email
          </a>
        ) : (
          <span className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            Too many recipients for a one-click email — use “Copy recipients”
            and paste into the BCC field of your mail client.
          </span>
        )}
        {recipients && (
          <CopyButton text={bcc.join(", ")} label="Copy recipients (BCC)" />
        )}
      </div>

      <p className="text-xs text-slate-400">
        This opens (or is copied into) your own email — the portal does not send
        it for you. Edit the text above before sending if you wish.
      </p>
    </div>
  );
}
