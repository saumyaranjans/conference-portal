import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Best-effort transactional email via Resend. Gated behind env vars so the
 * portal works unchanged until email is configured:
 *   RESEND_API_KEY   – Resend API key
 *   RESEND_FROM      – verified sender, e.g. "GLOGIFT 27 <no-reply@glogift2027.co.in>"
 *   RESEND_REPLY_TO  – optional reply-to; comma-separate for several inboxes,
 *                      e.g. "chair@x.ac.in, coordinator@x.ac.in"
 *
 * When the key/from are absent, sendEmail() is a no-op and callers fall back
 * to the existing copy-paste + in-app-notification behaviour. It never throws —
 * a mail failure must not break the surrounding action.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/**
 * One address, in either form Resend accepts: "a@b.com" or "Name <a@b.com>".
 * Anything else (blank, several joined by a comma, a stray semicolon) would
 * 422 the whole request, so it is dropped rather than sent.
 */
function validAddress(value?: string | null): string | undefined {
  const s = (value ?? "").trim();
  if (!s) return undefined;
  const bare = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  const named = /^[^<>,;]+<\s*[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+\s*>$/;
  return bare.test(s) || named.test(s) ? s : undefined;
}

/** How many reply-to addresses we will put on one message. */
const MAX_REPLY_TO = 5;

/**
 * Split a comma-separated list into the addresses Resend will accept, dropping
 * any that are malformed. A display name containing a comma cannot survive
 * this, so keep names simple — or use the bare address.
 */
function addressList(value?: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((p) => validAddress(p))
    .filter((p): p is string => Boolean(p));
}

/** Just the address out of "Name <a@b.com>", lowercased, for de-duping. */
function addressKey(value: string): string {
  const m = value.match(/<([^>]+)>/);
  return (m ? m[1] : value).trim().toLowerCase();
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  /** Per-message reply-to (e.g. the chair sending it), added ahead of the env. */
  replyTo?: string;
  /** Carbon-copy recipients (e.g. the handling Track Editor + Convener). */
  cc?: string | string[];
  /** Blind-carbon-copy recipients (e.g. reviewers on a decision notice). */
  bcc?: string | string[];
  /** What this message is, for the Convener's email counts. */
  kind?: string;
  /** Who sent it. */
  sentBy?: string;
  /** Optional file attachments (content is base64-encoded). */
  attachments?: { filename: string; content: string }[];
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  // A reply reaches the person who sent it *and* the organiser inboxes, with
  // the sender first so mail clients offer them by default.
  const replyTo: string[] = [];
  for (const a of [
    ...addressList(args.replyTo),
    ...addressList(process.env.RESEND_REPLY_TO),
  ]) {
    if (replyTo.length >= MAX_REPLY_TO) break;
    if (!replyTo.some((seen) => addressKey(seen) === addressKey(a))) {
      replyTo.push(a);
    }
  }

  if (!key || !from) return { sent: false };

  const to = validAddress(args.to);
  if (!to)
    return { sent: false, error: `"${args.to?.trim()}" is not a valid email address.` };

  // CC the handling Track Editor / Convener, de-duped and never repeating the
  // primary recipient. Accepts a single address or a list.
  const ccRaw = Array.isArray(args.cc) ? args.cc : args.cc ? [args.cc] : [];
  const cc: string[] = [];
  for (const a of ccRaw.flatMap((v) => addressList(v))) {
    if (addressKey(a) === addressKey(to)) continue;
    if (!cc.some((seen) => addressKey(seen) === addressKey(a))) cc.push(a);
  }

  // BCC recipients (e.g. reviewers), de-duped and never repeating the primary
  // recipient or anyone already CC'd.
  const bccRaw = Array.isArray(args.bcc) ? args.bcc : args.bcc ? [args.bcc] : [];
  const bcc: string[] = [];
  for (const a of bccRaw.flatMap((v) => addressList(v))) {
    if (addressKey(a) === addressKey(to)) continue;
    if (cc.some((seen) => addressKey(seen) === addressKey(a))) continue;
    if (!bcc.some((seen) => addressKey(seen) === addressKey(a))) bcc.push(a);
  }

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
        ...(cc.length ? { cc } : {}),
        ...(bcc.length ? { bcc } : {}),
        // Resend takes one address as a string, several as an array.
        ...(replyTo.length
          ? { reply_to: replyTo.length === 1 ? replyTo[0] : replyTo }
          : {}),
        ...(args.attachments?.length ? { attachments: args.attachments } : {}),
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    // Resend returns { id }, the key for looking the message up in its log.
    const data = (await res.json().catch(() => null)) as { id?: string } | null;

    // Record it, best-effort: a logging failure must not look like a send
    // failure, and the table only arrived in migration 0041.
    try {
      await createAdminClient()
        .from("email_log")
        .insert({
          to_email: to,
          subject: args.subject,
          kind: args.kind ?? "other",
          sent_by: args.sentBy ?? null,
          resend_id: data?.id ?? null,
        });
    } catch {
      // ignored on purpose
    }

    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
