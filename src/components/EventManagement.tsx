"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  createSession,
  updateSession,
  deleteSession,
  addSessionPaper,
  removeSessionPaper,
} from "@/lib/eventActions";

export type EventSession = {
  id: string;
  title: string;
  mode: "onsite" | "online";
  trackId: string | null;
  trackCode: string | null;
  sessionDate: string | null;
  timeSlot: string | null;
  classroom: string | null;
  meetingLink: string | null;
  papers: { id: string; paperId: string; title: string }[];
};
export type PickPaper = {
  id: string;
  paperId: string;
  title: string;
  trackCode: string;
};
export type TrackOpt = { id: string; code: string; name: string };

const DAYS = [
  { value: "2027-02-25", label: "Day 1 · 25 Feb 2027" },
  { value: "2027-02-26", label: "Day 2 · 26 Feb 2027" },
  { value: "2027-02-27", label: "Day 3 · 27 Feb 2027" },
];
const SLOTS = [
  "10:00 – 11:30",
  "11:45 – 13:15",
  "14:15 – 15:45",
  "16:00 – 17:30",
];

function dayLabel(d: string | null) {
  return DAYS.find((x) => x.value === d)?.label ?? d ?? "Day —";
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "onsite" | "online";
  onChange: (m: "onsite" | "online") => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      {(["onsite", "online"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            mode === m
              ? m === "onsite"
                ? "bg-emerald-600 text-white"
                : "bg-violet-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {m === "onsite" ? "On-site" : "Online"}
        </button>
      ))}
    </div>
  );
}

/** Create / edit form for a session (mode-conditional classroom vs meeting link). */
function SessionForm({
  action,
  initial,
  tracks,
  submitLabel,
  onDone,
}: {
  action: (fd: FormData) => Promise<{ ok: boolean; message?: string }>;
  initial?: EventSession;
  tracks: TrackOpt[];
  submitLabel: string;
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<"onsite" | "online">(
    initial?.mode ?? "onsite"
  );
  return (
    <ActionForm action={action} onDone={onDone} className="space-y-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="mode" value={mode} />
      <input
        name="title"
        defaultValue={initial?.title ?? ""}
        placeholder="Session title (e.g., Finance & FinTech — Session A)"
        className="input text-sm"
        required
      />
      <div className="flex flex-wrap items-center gap-2">
        <ModeToggle mode={mode} onChange={setMode} />
        <select
          name="session_date"
          defaultValue={initial?.sessionDate ?? ""}
          className="input w-auto text-sm"
          aria-label="Day"
        >
          <option value="">Day…</option>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          name="time_slot"
          defaultValue={initial?.timeSlot ?? ""}
          className="input w-auto text-sm"
          aria-label="Time slot"
        >
          <option value="">Time slot…</option>
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="track_id"
          defaultValue={initial?.trackId ?? ""}
          className="input w-auto text-sm"
          aria-label="Track"
        >
          <option value="">Track (optional)…</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
      </div>
      {mode === "onsite" ? (
        <input
          name="classroom"
          defaultValue={initial?.classroom ?? ""}
          placeholder="Classroom number (e.g., LH-3)"
          className="input text-sm"
        />
      ) : (
        <input
          name="meeting_link"
          defaultValue={initial?.meetingLink ?? ""}
          placeholder="Meeting link (https://…)"
          className="input text-sm"
        />
      )}
      <div className="flex items-center gap-2">
        <SubmitButton variant="primary" className="text-sm">
          {submitLabel}
        </SubmitButton>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-medium text-slate-500 hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </ActionForm>
  );
}

function SessionCard({
  s,
  papers,
  tracks,
}: {
  s: EventSession;
  papers: PickPaper[];
  tracks: TrackOpt[];
}) {
  const [editing, setEditing] = useState(false);
  const inSession = new Set(s.papers.map((p) => p.paperId));
  const available = papers.filter((p) => !inSession.has(p.paperId));

  return (
    <div className="card card-pad">
      {editing ? (
        <SessionForm
          action={updateSession}
          initial={s}
          tracks={tracks}
          submitLabel="Save changes"
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">
                {s.title}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span
                  className={`badge ${
                    s.mode === "onsite"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {s.mode === "onsite" ? "On-site" : "Online"}
                </span>
                <span>{dayLabel(s.sessionDate)}</span>
                {s.timeSlot && <span>· {s.timeSlot}</span>}
                {s.trackCode && <span>· {s.trackCode}</span>}
                {s.mode === "onsite" ? (
                  <span>
                    · Classroom:{" "}
                    <b className="text-slate-700 dark:text-slate-200">
                      {s.classroom || "not set"}
                    </b>
                  </span>
                ) : (
                  <span className="truncate">
                    · Link:{" "}
                    {s.meetingLink ? (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        join
                      </a>
                    ) : (
                      <b className="text-slate-700 dark:text-slate-200">not set</b>
                    )}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary text-xs py-1 px-2"
              >
                Edit
              </button>
              <ActionForm
                action={deleteSession}
                confirm={`Delete the session "${s.title}"? Papers slotted here will be unassigned (papers themselves are not deleted).`}
              >
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton variant="danger" className="text-xs py-1 px-2">
                  Delete
                </SubmitButton>
              </ActionForm>
            </div>
          </div>

          {/* Papers in this session */}
          <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Papers ({s.papers.length})
            </p>
            {s.papers.length === 0 ? (
              <p className="text-xs text-slate-400">No papers slotted yet.</p>
            ) : (
              <ul className="space-y-1">
                {s.papers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {p.paperId}
                      </span>{" "}
                      <span className="text-slate-500">{p.title}</span>
                    </span>
                    <ActionForm action={removeSessionPaper}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton
                        variant="secondary"
                        className="!py-0.5 !px-1.5 !text-[10px]"
                      >
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}

            {/* Add a paper */}
            <ActionForm
              action={addSessionPaper}
              className="mt-2 flex flex-wrap items-center gap-1.5"
            >
              <input type="hidden" name="session_id" value={s.id} />
              <select
                name="submission_id"
                defaultValue=""
                required
                className="input w-auto max-w-full text-xs"
                aria-label="Add a paper"
              >
                <option value="" disabled>
                  Add a paper…
                </option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.paperId} · {p.trackCode} · {p.title.slice(0, 40)}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary" className="text-xs py-1 px-2">
                Add
              </SubmitButton>
            </ActionForm>
          </div>
        </>
      )}
    </div>
  );
}

export function EventManagement({
  sessions,
  papers,
  tracks,
}: {
  sessions: EventSession[];
  papers: PickPaper[];
  tracks: TrackOpt[];
}) {
  const onsite = sessions.filter((s) => s.mode === "onsite");
  const online = sessions.filter((s) => s.mode === "online");

  return (
    <div className="space-y-6">
      <div className="card card-pad">
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Create a session
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          On-site sessions take a <b>Classroom number</b>; online sessions take a{" "}
          <b>Meeting link</b>. Then slot accepted papers into each session below.
        </p>
        <SessionForm
          action={createSession}
          tracks={tracks}
          submitLabel="Create session"
        />
      </div>

      {(
        [
          ["On-site sessions", onsite],
          ["Online sessions", online],
        ] as const
      ).map(([label, list]) => (
        <section key={label} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}{" "}
            <span className="text-xs font-normal text-slate-400">
              ({list.length})
            </span>
          </h3>
          {list.length === 0 ? (
            <p className="text-sm text-slate-400">None yet.</p>
          ) : (
            list.map((s) => (
              <SessionCard key={s.id} s={s} papers={papers} tracks={tracks} />
            ))
          )}
        </section>
      ))}
    </div>
  );
}
