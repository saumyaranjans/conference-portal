"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  generateProgramme,
  setSessionVenue,
  moveSession,
  addSessionChair,
  removeSessionChair,
  saveSessionVolunteer,
  removeSessionVolunteer,
  approveSession,
  publishSession,
  unpublishSession,
  deleteProgrammeSession,
} from "@/lib/programmeActions";
import {
  PROGRAMME_DAYS,
  PROGRAMME_SLOTS,
  MIN_PAPERS_PER_SESSION,
  ABSOLUTE_MAX_PAPERS,
} from "@/lib/programmeAllocator";

export type ChairCandidate = {
  id: string;
  name: string;
  designation: string | null;
  affiliation: string | null;
};

export type BoardSession = {
  id: string;
  title: string;
  mode: "onsite" | "online";
  sessionDate: string | null;
  timeSlot: string | null;
  academicBlock: string | null;
  classroom: string | null;
  meetingLink: string | null;
  status: "draft" | "approved" | "published";
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  approvedAt: string | null;
  trackCode: string | null;
  trackName: string | null;
  papers: {
    rowId: string;
    sequence: number;
    submissionId: string;
    paperId: string;
    title: string;
    authors: {
      name: string;
      email: string | null;
      affiliation: string | null;
      designation: string | null;
      corresponding: boolean;
    }[];
  }[];
  chairs: {
    id: string;
    name: string;
    designation: string | null;
    affiliation: string | null;
    bio: string | null;
  }[];
  volunteers: { id: string; name: string; email: string | null; mobile: string | null }[];
};

const DAY_LABEL: Record<string, string> = {
  "2027-02-25": "Day 1 · 25 Feb 2027",
  "2027-02-26": "Day 2 · 26 Feb 2027",
  "2027-02-27": "Day 3 · 27 Feb 2027",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  approved: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

function SessionCard({
  s,
  chairCandidates,
}: {
  s: BoardSession;
  chairCandidates: ChairCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const short = s.papers.length < MIN_PAPERS_PER_SESSION;
  const venueSet =
    s.mode === "onsite" ? Boolean(s.classroom) : Boolean(s.meetingLink);
  const slotted = Boolean(s.sessionDate && s.timeSlot);

  return (
    <div className="card card-pad space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
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
            <span className={`badge ${STATUS_STYLE[s.status]}`}>{s.status}</span>
            {s.hasUnpublishedChanges && s.status === "published" && (
              <span
                className="badge bg-orange-100 text-orange-800"
                title="The public still sees the last published version"
              >
                edited — not re-published
              </span>
            )}
            <span>
              {s.sessionDate ? DAY_LABEL[s.sessionDate] ?? s.sessionDate : "no day"}
            </span>
            <span>· {s.timeSlot ?? "no slot"}</span>
            <span>· {s.papers.length} paper{s.papers.length === 1 ? "" : "s"}</span>
            {short && (
              <span className="badge bg-amber-100 text-amber-800">
                below {MIN_PAPERS_PER_SESSION}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="btn-secondary shrink-0 py-1.5 text-xs"
        >
          {open ? "Close" : "Arrange"}
        </button>
      </div>

      {/* Running order — always visible; it is the point of the session. */}
      <ol className="space-y-1">
        {s.papers.map((p) => (
          <li key={p.rowId} className="text-xs">
            <span className="font-mono text-slate-500">{p.sequence}.</span>{" "}
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {p.paperId}
            </span>{" "}
            <span className="text-slate-600 dark:text-slate-300">{p.title}</span>
            <span className="block pl-5 text-slate-500">
              {p.authors
                .map((a) => `${a.name}${a.corresponding ? " (corresponding)" : ""}`)
                .join(" · ")}
            </span>
          </li>
        ))}
        {s.papers.length === 0 && (
          <li className="text-xs text-slate-400">No papers in this session.</li>
        )}
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>
          Chairs:{" "}
          {s.chairs.length ? (
            <b className="text-slate-700 dark:text-slate-200">
              {s.chairs.map((c) => c.name).join(", ")}
            </b>
          ) : (
            <span className="text-amber-700">none yet</span>
          )}
        </span>
        <span>
          Volunteer:{" "}
          {s.volunteers.length ? (
            <b className="text-slate-700 dark:text-slate-200">
              {s.volunteers.map((v) => v.name).join(", ")}
            </b>
          ) : (
            <span className="text-amber-700">none yet</span>
          )}
        </span>
        <span>
          Venue:{" "}
          {venueSet ? (
            <b className="text-slate-700 dark:text-slate-200">
              {s.mode === "onsite"
                ? [s.academicBlock, s.classroom].filter(Boolean).join(" · ")
                : "link set"}
            </b>
          ) : (
            <span className="text-amber-700">not set</span>
          )}
        </span>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          {/* Day + slot */}
          <ActionForm action={moveSession} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="session_id" value={s.id} />
            <label className="label text-[11px]">
              Day
              <select
                name="session_date"
                defaultValue={s.sessionDate ?? ""}
                className="input mt-1 w-auto text-xs"
              >
                <option value="">—</option>
                {PROGRAMME_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABEL[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="label text-[11px]">
              Time slot
              <select
                name="time_slot"
                defaultValue={s.timeSlot ?? ""}
                className="input mt-1 w-auto text-xs"
              >
                <option value="">—</option>
                {PROGRAMME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton variant="secondary" className="py-1.5 text-xs">
              Move
            </SubmitButton>
          </ActionForm>

          {/* Venue — two fields on site, a link online */}
          <ActionForm action={setSessionVenue} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="session_id" value={s.id} />
            {s.mode === "onsite" ? (
              <>
                <label className="label text-[11px]">
                  Academic block
                  <input
                    name="academic_block"
                    defaultValue={s.academicBlock ?? ""}
                    list="academic-blocks"
                    placeholder="e.g. Thakshasila 1"
                    className="input mt-1 w-44 text-xs"
                  />
                </label>
                <label className="label text-[11px]">
                  Classroom
                  <input
                    name="classroom"
                    defaultValue={s.classroom ?? ""}
                    placeholder="e.g. LH-3"
                    className="input mt-1 w-32 text-xs"
                  />
                </label>
              </>
            ) : (
              <label className="label text-[11px] flex-1">
                Meeting link
                <input
                  name="meeting_link"
                  defaultValue={s.meetingLink ?? ""}
                  placeholder="https://…"
                  className="input mt-1 text-xs"
                />
              </label>
            )}
            <SubmitButton variant="secondary" className="py-1.5 text-xs">
              Save venue
            </SubmitButton>
          </ActionForm>

          {/* Chairs */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Session chairs ({s.chairs.length}/3) — faculty only
            </p>
            {s.chairs.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700"
              >
                <div className="min-w-0 text-xs">
                  <b className="text-slate-800 dark:text-slate-100">{c.name}</b>
                  <span className="block text-slate-500">
                    {[c.designation, c.affiliation].filter(Boolean).join(" · ")}
                  </span>
                  {c.bio && <span className="block text-slate-400">{c.bio}</span>}
                </div>
                <ActionForm action={removeSessionChair}>
                  <input type="hidden" name="chair_id" value={c.id} />
                  <SubmitButton variant="danger" className="!px-2 !py-1 !text-[10px]">
                    Remove
                  </SubmitButton>
                </ActionForm>
              </div>
            ))}
            {s.chairs.length < 3 && (
              <ActionForm action={addSessionChair} className="space-y-1.5">
                <input type="hidden" name="session_id" value={s.id} />
                <select name="profile_id" required className="input text-xs">
                  <option value="">Add a chair…</option>
                  {chairCandidates
                    .filter((c) => !s.chairs.some((x) => x.name === c.name))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.affiliation ? ` — ${c.affiliation}` : ""}
                      </option>
                    ))}
                </select>
                <textarea
                  name="bio"
                  rows={2}
                  placeholder="Short bio, as it should appear in the programme"
                  className="input text-xs"
                />
                <SubmitButton variant="secondary" className="py-1.5 text-xs">
                  Add chair
                </SubmitButton>
              </ActionForm>
            )}
          </div>

          {/* Volunteers */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Student volunteers
            </p>
            {s.volunteers.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700"
              >
                <span>
                  <b className="text-slate-800 dark:text-slate-100">{v.name}</b>
                  {v.email && <span className="text-slate-500"> · {v.email}</span>}
                </span>
                <ActionForm action={removeSessionVolunteer}>
                  <input type="hidden" name="volunteer_id" value={v.id} />
                  <SubmitButton variant="danger" className="!px-2 !py-1 !text-[10px]">
                    Remove
                  </SubmitButton>
                </ActionForm>
              </div>
            ))}
            <ActionForm action={saveSessionVolunteer} className="flex flex-wrap gap-1.5">
              <input type="hidden" name="session_id" value={s.id} />
              <input
                name="full_name"
                required
                placeholder="Volunteer name"
                className="input w-40 text-xs"
              />
              <input name="email" placeholder="Email" className="input w-44 text-xs" />
              <input name="mobile" placeholder="Mobile" className="input w-32 text-xs" />
              <SubmitButton variant="secondary" className="py-1.5 text-xs">
                Add
              </SubmitButton>
            </ActionForm>
          </div>

          {/* Lifecycle */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            {s.status === "draft" && (
              <ActionForm action={approveSession}>
                <input type="hidden" name="session_id" value={s.id} />
                <SubmitButton variant="primary" className="py-1.5 text-xs">
                  Approve
                </SubmitButton>
              </ActionForm>
            )}
            {(s.status === "approved" ||
              (s.status === "published" && s.hasUnpublishedChanges)) && (
              <ActionForm action={publishSession}>
                <input type="hidden" name="session_id" value={s.id} />
                <SubmitButton variant="primary" className="py-1.5 text-xs">
                  {s.status === "published" ? "Re-publish" : "Publish"}
                </SubmitButton>
              </ActionForm>
            )}
            {s.status === "published" && (
              <ActionForm
                action={unpublishSession}
                confirm="Remove this session from the public schedule?"
              >
                <input type="hidden" name="session_id" value={s.id} />
                <SubmitButton variant="secondary" className="py-1.5 text-xs">
                  Unpublish
                </SubmitButton>
              </ActionForm>
            )}
            <ActionForm
              action={deleteProgrammeSession}
              confirm="Delete this session? Its papers return to the unscheduled pool."
            >
              <input type="hidden" name="session_id" value={s.id} />
              <SubmitButton variant="danger" className="py-1.5 text-xs">
                Delete
              </SubmitButton>
            </ActionForm>
            {!slotted && (
              <span className="text-[11px] text-amber-700">
                Give it a day and slot before publishing.
              </span>
            )}
            {slotted && !venueSet && (
              <span className="text-[11px] text-amber-700">
                {s.mode === "onsite" ? "Set a classroom" : "Set a meeting link"} before publishing.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgrammeBoard({
  sessions,
  chairCandidates,
  unscheduledCount,
  conflicts,
  basePath,
}: {
  sessions: BoardSession[];
  chairCandidates: ChairCandidate[];
  unscheduledCount: number;
  conflicts: { person: string; slot: string; sessions: string[]; papers: string[] }[];
  basePath: string;
}) {
  const published = sessions.filter((s) => s.status === "published").length;
  const drafts = sessions.filter((s) => s.status === "draft").length;
  const stale = sessions.filter(
    (s) => s.status === "published" && s.hasUnpublishedChanges
  ).length;

  // Group for display the way the programme is actually read.
  const byDay = new Map<string, BoardSession[]>();
  for (const s of sessions) {
    const k = s.sessionDate ?? "unscheduled";
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const dayKeys = [...byDay.keys()].sort((a, b) =>
    a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["Sessions", sessions.length, "border-slate-200 bg-slate-50 text-slate-800"],
            ["Drafts", drafts, "border-amber-200 bg-amber-50 text-amber-800"],
            ["Published", published, "border-emerald-200 bg-emerald-50 text-emerald-800"],
            ["Edited, not re-published", stale, "border-orange-200 bg-orange-50 text-orange-800"],
            ["Paid but unscheduled", unscheduledCount, "border-rose-200 bg-rose-50 text-rose-800"],
          ] as [string, number, string][]
        ).map(([label, value, cls]) => (
          <div key={label} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {label}
            </p>
            <p className="mt-0.5 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div className="card card-pad border-rose-300 bg-rose-50 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
            {conflicts.length} scheduling clash{conflicts.length === 1 ? "" : "es"}
          </p>
          <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
            Someone is expected in two rooms at the same time. Two papers inside one
            session are fine — these are across sessions.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-rose-800 dark:text-rose-200">
            {conflicts.slice(0, 12).map((c, i) => (
              <li key={i}>
                <b>{c.person}</b> — {c.slot}: {c.sessions.join("  ‖  ")} ({c.papers.join(", ")})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card card-pad">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Generate the programme
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Places every accepted paper whose corresponding author has paid, grouped by
          track and mode, ordered by topic, and slotted so nobody is in two rooms at
          once. Only untouched generated drafts are replaced — anything you approved,
          published or built by hand stays exactly where it is.
        </p>
        <ActionForm action={generateProgramme} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="label text-[11px]">
            Papers per session (max)
            <input
              name="max_per_session"
              type="number"
              min={MIN_PAPERS_PER_SESSION}
              max={ABSOLUTE_MAX_PAPERS}
              defaultValue={5}
              className="input mt-1 w-20 text-xs"
            />
          </label>
          <SubmitButton variant="primary" className="py-1.5 text-sm">
            Generate draft programme
          </SubmitButton>
          <span className="text-[11px] text-slate-500">
            Six is allowed as a special case.
          </span>
        </ActionForm>
      </div>

      {/* Suggestions for the block field, drawn from what is already in use. */}
      <datalist id="academic-blocks">
        {[...new Set(sessions.map((s) => s.academicBlock).filter(Boolean))].map((b) => (
          <option key={b as string} value={b as string} />
        ))}
      </datalist>

      {sessions.length === 0 ? (
        <div className="card card-pad text-center text-sm text-slate-500">
          No sessions yet. Generate the draft programme above.
        </div>
      ) : (
        dayKeys.map((day) => (
          <section key={day} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {day === "unscheduled" ? "Not yet slotted" : DAY_LABEL[day] ?? day}
            </h2>
            {byDay
              .get(day)!
              .sort(
                (a, b) =>
                  PROGRAMME_SLOTS.indexOf(a.timeSlot as any) -
                  PROGRAMME_SLOTS.indexOf(b.timeSlot as any)
              )
              .map((s) => (
                <SessionCard key={s.id} s={s} chairCandidates={chairCandidates} />
              ))}
          </section>
        ))
      )}
    </div>
  );
}
