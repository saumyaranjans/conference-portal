import "server-only";

/**
 * Best-effort transactional email via Resend. Gated behind env vars so the
 * portal works unchanged until email is configured:
 *   RESEND_API_KEY   – Resend API key
 *   RESEND_FROM      – verified sender, e.g. "GLOGIFT 2027 <no-reply@glogift2027.co.in>"
 *   RESEND_REPLY_TO  – optional reply-to (e.g. the editorial office inbox)
 *
 * When the key/from are absent, sendEmail() is a no-op and callers fall back
 * to the existing copy-paste + in-app-notification behaviour. It never throws —
 * a mail failure must not break the surrounding action.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/**
 * Resend accepts only "a@b.com" or "Name <a@b.com>" — anything else (a blank
 * value, two addresses, a stray comma) 422s the whole request. Returns the
 * address when it is usable, otherwise undefined so the caller can omit it: a
 * bad reply-to must never cost us the message itself.
 */
function validAddress(value?: string | null): string | undefined {
  const s = (value ?? "").trim();
  if (!s) return undefined;
  const bare = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  const named = /^[^<>,;]+<\s*[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+\s*>$/;
  return bare.test(s) || named.test(s) ? s : undefined;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  /** Per-message reply-to (e.g. the chair sending it). Falls back to the env. */
  replyTo?: string;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const replyTo =
    validAddress(args.replyTo) ?? validAddress(process.env.RESEND_REPLY_TO);

  if (!key || !from) return { sent: false };

  const to = validAddress(args.to);
  if (!to)
    return { sent: false, error: `"${args.to?.trim()}" is not a valid email address.` };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: args.subject,
        text: args.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    // Resend returns { id }, the key for looking the message up in its log.
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
