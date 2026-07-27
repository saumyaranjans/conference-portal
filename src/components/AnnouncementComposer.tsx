"use client";

import { useMemo, useState } from "react";
import { broadcastAnnouncement } from "@/lib/actions";
import { announcementEmail } from "@/lib/emailTemplates";
import { CopyButton } from "@/components/ComposeEmail";

type Person = { id: string; full_name: string; email: string; roles: string[] };
type TrackOpt = { id: string; name: string };

const MAILTO_BCC_LIMIT = 30;

/**
 * Editorial Office composes an announcement, posts it as an in-app notification
 * to a chosen audience (reliable, no email), and/or emails it from their own
 * client (Copy BCC / mailto / CSV). The portal never sends the email itself.
 */
export function AnnouncementComposer({
  people,
  tracks,
  authorIds,
  authorsByTrack,
}: {
  people: Person[];
  tracks: TrackOpt[];
  authorIds: string[];
  authorsByTrack: Record<string, string[]>;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(
    null
  );

  const authorSet = useMemo(() => new Set(authorIds), [authorIds]);

  // Recipients (emails) for the selected audience — for BCC/CSV/mailto.
  const recipients = useMemo(() => {
    let list = people;
    if (audience === "reviewers") {
      list = people.filter((p) => p.roles.includes("reviewer"));
    } else if (audience === "authors") {
      list = people.filter((p) => authorSet.has(p.id));
    } else if (audience.startsWith("track:")) {
      const ids = new Set(authorsByTrack[audience.slice(6)] ?? []);
      list = people.filter((p) => ids.has(p.id));
    }
    return list.filter((p) => p.email);
  }, [people, audience, authorSet, authorsByTrack]);

  const emails = recipients.map((r) => r.email);
  const emailContent = announcementEmail({ subject: title, message });
  const tooManyForMailto = emails.length > MAILTO_BCC_LIMIT;
  const mailto = `mailto:?bcc=${encodeURIComponent(
    emails.join(",")
  )}&subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(
    emailContent.body
  )}`;

  async function post() {
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", message);
    fd.set("audience", audience);
    const res = await broadcastAnnouncement(fd);
    setResult(res);
    setBusy(false);
  }

  function downloadCsv() {
    const rows = [
      ["Name", "Email"],
      ...recipients.map((r) => [r.full_name || "", r.email]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card card-pad space-y-4 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ann-title">
            Title / subject
          </label>
          <input
            id="ann-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Camera-ready deadline extended"
          />
        </div>
        <div>
          <label className="label" htmlFor="ann-audience">
            Audience
          </label>
          <select
            id="ann-audience"
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="all">All participants</option>
            <option value="authors">Authors (with a submission)</option>
            <option value="reviewers">Reviewers</option>
            {tracks.map((t) => (
              <option key={t.id} value={`track:${t.id}`}>
                Authors — {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">
              {recipients.length}
            </span>{" "}
            recipient{recipients.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="ann-message">
          Message
        </label>
        <textarea
          id="ann-message"
          rows={8}
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your announcement…"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={post} disabled={busy || !title} className="btn-primary">
          {busy ? "Posting…" : "Post as in-app notification"}
        </button>
        {!tooManyForMailto && emails.length > 0 ? (
          <a href={mailto} className="btn-secondary">
            Open email (BCC)
          </a>
        ) : null}
        <CopyButton text={emails.join(", ")} label="Copy recipients (BCC)" />
        <CopyButton text={emailContent.body} label="Copy message" />
        <button onClick={downloadCsv} className="btn-secondary text-xs py-1 px-2">
          Download CSV
        </button>
      </div>

      {tooManyForMailto && (
        <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          Too many recipients for a one-click email — use “Copy recipients (BCC)”
          or the CSV and paste into your mail client’s BCC field.
        </p>
      )}

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
        “Post as in-app notification” delivers instantly inside the portal (the
        🔔 bell). Email is composed in your own client — the portal does not send
        it for you.
      </p>
    </div>
  );
}
