"use client";

import { useState, useTransition } from "react";
import { sendComposedEmail } from "@/lib/actions";

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
 * Editable email draft (a live preview). With `showSend` + a single `to`, the
 * sender can send it directly through the portal (Resend) via "Send now";
 * otherwise it opens in / is copied into their own mail client. Pass
 * `recipients` for a BCC broadcast (copy-only — no direct send).
 */
export function ComposeEmail({
  to,
  recipients,
  subject: initialSubject,
  body: initialBody,
  showSend = false,
  sendLabel = "Send now",
  ccConvener = false,
  onSend,
}: {
  to?: string;
  recipients?: string[];
  subject: string;
  body: string;
  /** Show a send button that emails via the portal (single `to` only). */
  showSend?: boolean;
  /** Label for that button — e.g. "Send invitation" on the reviewer flow. */
  sendLabel?: string;
  /** CC the Convener (used for decision letters). */
  ccConvener?: boolean;
  /** Custom sender, for flows that do more than email (e.g. also assign). */
  onSend?: (
    subject: string,
    body: string
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const bcc = recipients ?? [];
  const tooManyForMailto = bcc.length > MAILTO_BCC_LIMIT;
  const canSend = showSend && !!to;

  const mailto = to
    ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    : `mailto:?bcc=${encodeURIComponent(bcc.join(","))}&subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

  function send() {
    if (!to) return;
    setResult(null);
    startTransition(async () => {
      const res = onSend
        ? await onSend(subject, body)
        : await (async () => {
            const fd = new FormData();
            fd.set("to", to);
            fd.set("subject", subject);
            fd.set("body", body);
            if (ccConvener) fd.set("cc_convener", "1");
            return sendComposedEmail(fd);
          })();
      setResult({ ok: res.ok, message: res.message ?? "" });
    });
  }

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

      <div className="flex flex-wrap items-center gap-2">
        {canSend && (
          <button
            type="button"
            onClick={send}
            disabled={pending || result?.ok}
            className="btn-primary"
          >
            {pending ? "Sending…" : result?.ok ? "Sent ✓" : sendLabel}
          </button>
        )}

        {!tooManyForMailto ? (
          <a href={mailto} className={canSend ? "btn-secondary" : "btn-primary"}>
            {canSend ? "Or open in your email" : "Open in email"}
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

      <p className="text-xs text-slate-400">
        {canSend
          ? `Review the message above, then “${sendLabel}” to email it through the portal — or open/copy it to send from your own email.`
          : "This opens (or is copied into) your own email — the portal does not send it for you."}
      </p>
    </div>
  );
}
