"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSubmissionOnePage,
  submitForReview,
  type CoAuthorInput,
} from "@/lib/actions";
import { InstitutionInput } from "@/components/InstitutionInput";
import { CameraReadyPreview } from "@/components/CameraReadyPreview";
import {
  ABSTRACT_WORD_LIMIT,
  ABSTRACT_MIN_WORDS,
  AUTHOR_ATTENDANCE,
  countWords,
  COUNTRY_DIAL_CODES,
  PARTICIPANT_CATEGORIES,
  PARTICIPATION_MODES,
  SUBMISSION_TYPES,
  type Conference,
  type Track,
} from "@/lib/types";

type ConfWithTracks = Conference & { tracks: Track[] };

/** The signed-in author, shown as the corresponding author. */
export type Me = {
  full_name: string;
  email: string;
  affiliation: string;
  designation: string;
  participant_category: string;
  mobile: string;
};

/** `dialCode` is form-only — it is merged into `mobile` on submit. */
type AuthorRow = CoAuthorInput & {
  is_corresponding?: boolean;
  dialCode?: string;
};

const emptyCoAuthor = (): AuthorRow => ({
  full_name: "",
  designation: "",
  participant_category: "",
  affiliation: "",
  email: "",
  mobile: "",
  dialCode: "+91",
  attendance: "",
});

/** Attendance picker shown for every listed author. */
function AttendanceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className={`input ${value ? "" : "text-slate-400"}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Attendance Intention"
    >
      {/* placeholder styled like the other fields; not offered as a choice */}
      <option value="" disabled hidden>
        Attendance Intention
      </option>
      {AUTHOR_ATTENDANCE.map((a) => (
        <option key={a.value} value={a.value} className="text-slate-900">
          {a.label}
        </option>
      ))}
    </select>
  );
}

export function NewSubmissionForm({
  conferences,
  me,
}: {
  conferences: ConfWithTracks[];
  me: Me;
}) {
  const router = useRouter();

  const [confId, setConfId] = useState(conferences[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [trackId, setTrackId] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [authors, setAuthors] = useState<AuthorRow[]>([
    { ...me, attendance: "", is_corresponding: true },
  ]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submissionType, setSubmissionType] = useState("");
  const [participationMode, setParticipationMode] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Author declarations — all three must be accepted before submitting.
  const [declOriginal, setDeclOriginal] = useState(false);
  const [declAi, setDeclAi] = useState(false);
  const [declConsent, setDeclConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Popup shown when the abstract is under the 350-word minimum.
  const [shortAbstract, setShortAbstract] = useState(false);

  const tracks = conferences.find((c) => c.id === confId)?.tracks ?? [];
  const abstractWords = countWords(abstract);
  const declarationsAccepted = declOriginal && declAi && declConsent;

  function setAuthor(i: number, patch: Partial<AuthorRow>) {
    setAuthors((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  /** Insert a fresh co-author row directly after the given position. */
  function addAfter(i: number) {
    setAuthors((rows) => {
      const copy = [...rows];
      copy.splice(i + 1, 0, emptyCoAuthor());
      return copy;
    });
  }

  /** Move an author from one position to another (drag-drop or arrows). */
  function moveRow(from: number, to: number) {
    if (from === to || to < 0 || to >= authors.length) return;
    setAuthors((rows) => {
      const copy = [...rows];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  /** Validate the form; returns an error message or null. */
  function validate(): string | null {
    if (!title.trim()) return "Enter a title.";
    if (!trackId) return "Choose a track.";
    if (!abstract.trim()) return "Enter an abstract.";
    if (abstractWords > ABSTRACT_WORD_LIMIT)
      return `The abstract is ${abstractWords} words — please reduce it to ${ABSTRACT_WORD_LIMIT} words or fewer.`;
    if (!submissionType) return "Select your level of participation.";
    if (!participationMode) return "Select your attendance format.";
    // Every co-author must have a name AND a valid email — the email is
    // required so they receive their submission acknowledgement and can
    // register. A completely blank row is ignored.
    const EMAIL_RE = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
    for (const a of authors) {
      if (a.is_corresponding) continue;
      const hasName = a.full_name.trim();
      const hasEmail = a.email.trim();
      if (!hasName && !hasEmail) continue;
      if (!hasName) return "Enter a name for every co-author.";
      if (!hasEmail)
        return "Enter an email address for every co-author — it is required so they receive the submission and can register.";
      if (!EMAIL_RE.test(hasEmail))
        return `"${hasEmail}" is not a valid email address.`;
    }
    const listed = authors.filter(
      (a) => a.is_corresponding || (a.full_name.trim() && a.email.trim())
    );
    if (listed.some((a) => !a.attendance))
      return "Select the conference attendance for every author.";
    if (!declOriginal || !declAi || !declConsent)
      return "Please accept all declarations before continuing.";
    return null;
  }

  function onReview(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    // The 350-word minimum is enforced, but surfaced as a popup rather than an
    // always-visible counter hint.
    if (abstractWords < ABSTRACT_MIN_WORDS) {
      setShortAbstract(true);
      return;
    }
    setError(null);
    setShowPreview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit() {
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      setShowPreview(false);
      return;
    }

    setBusy(true);
    try {
      // 1. Create the submission with its authors.
      setStatus("Creating submission…");
      const created = await createSubmissionOnePage({
        conference_id: confId,
        title,
        track_id: trackId,
        abstract,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        // merge the dial code into each co-author's mobile number
        authors: authors.map((a) => ({
          ...a,
          mobile: a.mobile.trim()
            ? `${a.dialCode ?? "+91"} ${a.mobile.trim()}`.trim()
            : "",
        })),
        submission_type: submissionType,
        participation_mode: participationMode,
        declared_original: declOriginal,
        declared_ai_assistance: declAi,
        declared_consent_publication: declConsent,
      });
      if (!created.ok || !created.id) {
        setError(created.message ?? "Could not create the submission.");
        setBusy(false);
        return;
      }
      const id = created.id;

      // 2. Submit the abstract for review.
      setStatus("Submitting for review…");
      const fd = new FormData();
      fd.set("id", id);
      const res = await submitForReview(fd);
      if (!res.ok) {
        setError(res.message ?? "Could not submit.");
        setBusy(false);
        return;
      }

      router.push(`/author/submissions/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  // -------- Camera-ready proof: review and approve before submitting --------
  if (showPreview) {
    const conf = conferences.find((c) => c.id === confId);
    const track = tracks.find((t) => t.id === trackId);

    return (
      <div className="space-y-6 max-w-4xl">
        <div className="card card-pad bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Review your camera-ready abstract.</strong> Check the details
            below carefully — approve to submit, or go back to make changes.
          </p>
        </div>

        <CameraReadyPreview
          conferenceName={
            conf ? `${conf.name} (${conf.acronym} ${conf.year})` : ""
          }
          trackName={track ? `${track.code} — ${track.name}` : ""}
          title={title}
          authors={authors.map((a) =>
            a.is_corresponding
              ? {
                  full_name: me.full_name || me.email,
                  designation: me.designation,
                  affiliation: me.affiliation,
                }
              : {
                  full_name: a.full_name,
                  designation: a.designation,
                  affiliation: a.affiliation,
                }
          )}
          abstract={abstract}
          keywords={keywords}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            className="btn-secondary"
            onClick={() => setShowPreview(false)}
          >
            Back to edit
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-primary"
            onClick={onSubmit}
          >
            {busy ? status || "Submitting…" : "Approve & Submit Abstract"}
          </button>
          <p className="text-xs text-slate-500">
            By approving you confirm the details above are correct.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onReview} className="space-y-6 max-w-4xl">
      {/* Popup: abstract below the 350-word minimum. */}
      {shortAbstract && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShortAbstract(false)}
        >
          <div
            className="card card-pad max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl">
              !
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Abstract is too short
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Your abstract is <strong>{abstractWords}</strong> words. Please
              write at least <strong>{ABSTRACT_MIN_WORDS} words</strong> before
              you can proceed to submit.
            </p>
            <button
              type="button"
              onClick={() => setShortAbstract(false)}
              className="btn-primary mt-5"
            >
              Continue editing
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Abstract ---------------- */}
      <div className="card card-pad space-y-5">
        <h2 className="font-semibold text-slate-900">Abstract</h2>

        {conferences.length > 1 && (
          <div>
            <label className="label" htmlFor="conference_id">
              Conference
            </label>
            <select
              id="conference_id"
              className="input"
              value={confId}
              onChange={(e) => {
                setConfId(e.target.value);
                setTrackId("");
              }}
            >
              {conferences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.acronym} {c.year})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="track">
            Track
          </label>
          <select
            id="track"
            className="input"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
          >
            <option value="">Select a track…</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} — ${t.name}` : t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Your Paper ID (e.g. AIF-001) is assigned from the track on submission.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="abstract">
            Abstract
          </label>
          <textarea
            id="abstract"
            rows={7}
            className="input"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
          />
          <p
            className={`text-xs mt-1 ${
              abstractWords > ABSTRACT_WORD_LIMIT
                ? "text-red-600 font-medium"
                : "text-slate-400"
            }`}
          >
            {abstractWords} / {ABSTRACT_WORD_LIMIT} words
            {abstractWords > ABSTRACT_WORD_LIMIT &&
              ` — ${abstractWords - ABSTRACT_WORD_LIMIT} over the limit`}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="keywords">
            Keywords
          </label>
          <input
            id="keywords"
            className="input"
            placeholder="machine learning, finance, forecasting"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Comma separated.</p>
        </div>

      </div>

      {/* ---------------- Authors ---------------- */}
      <div className="card card-pad space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Authors</h2>
          <button
            type="button"
            className="btn-secondary text-sm py-1.5"
            onClick={() => setAuthors((r) => [...r, emptyCoAuthor()])}
          >
            Add co-author
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Drag a row (or use the arrows) to change the author order. Your own
          details come from your profile.
        </p>

        {authors.map((a, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveRow(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`border rounded-lg p-3 bg-white ${
              dragIndex === i
                ? "border-blue-400 opacity-70"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* order + drag handle */}
              <div className="flex flex-col items-center pt-1 shrink-0">
                <span
                  className="cursor-grab active:cursor-grabbing text-slate-400 leading-none"
                  title="Drag to reorder"
                  aria-hidden
                >
                  ⠿
                </span>
                <span className="text-sm font-semibold text-slate-700 mt-1">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => moveRow(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Move author up"
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none mt-1"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(i, i + 1)}
                  disabled={i === authors.length - 1}
                  aria-label="Move author down"
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none"
                >
                  ▼
                </button>
              </div>

              <div className="flex-1 min-w-0">
                {a.is_corresponding ? (
                  <>
                    <p className="text-sm font-medium text-slate-900">
                      {me.full_name || me.email}
                      <span className="badge bg-blue-100 text-blue-800 ml-2">
                        Corresponding
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[
                        me.designation,
                        me.participant_category,
                        me.affiliation,
                        me.email,
                        me.mobile,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Edit these in My Profile.
                    </p>
                    <div className="mt-2 max-w-md">
                      <AttendanceSelect
                        value={a.attendance ?? ""}
                        onChange={(v) => setAuthor(i, { attendance: v })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <input
                        className="input"
                        placeholder="Name"
                        value={a.full_name}
                        onChange={(e) =>
                          setAuthor(i, { full_name: e.target.value })
                        }
                      />
                      <input
                        className="input"
                        placeholder="Designation"
                        value={a.designation}
                        onChange={(e) =>
                          setAuthor(i, { designation: e.target.value })
                        }
                      />
                      <select
                        className="input"
                        value={a.participant_category}
                        onChange={(e) =>
                          setAuthor(i, { participant_category: e.target.value })
                        }
                      >
                        <option value="">Participant category…</option>
                        {PARTICIPANT_CATEGORIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <InstitutionInput
                        placeholder="Affiliation"
                        value={a.affiliation}
                        onChange={(v) => setAuthor(i, { affiliation: v })}
                      />
                      <input
                        className="input"
                        type="email"
                        placeholder="Email (required)"
                        value={a.email}
                        onChange={(e) => setAuthor(i, { email: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <select
                          aria-label="Country code"
                          className="input w-24 shrink-0"
                          value={a.dialCode ?? "+91"}
                          onChange={(e) =>
                            setAuthor(i, { dialCode: e.target.value })
                          }
                        >
                          {COUNTRY_DIAL_CODES.map((c) => (
                            <option key={c.country} value={c.code}>
                              {c.code} {c.country}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          type="tel"
                          placeholder="Mobile number"
                          value={a.mobile}
                          onChange={(e) =>
                            setAuthor(i, { mobile: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <AttendanceSelect
                          value={a.attendance ?? ""}
                          onChange={(v) => setAuthor(i, { attendance: v })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        type="button"
                        className="text-xs text-blue-700 hover:underline"
                        onClick={() => addAfter(i)}
                      >
                        Add co-author
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() =>
                          setAuthors((r) => r.filter((_, idx) => idx !== i))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <svg
            className="w-4 h-4 text-blue-700 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 11v5m0-8.5v.5" />
          </svg>
          <p className="text-xs text-blue-900">
            Indicate for each author whether they will attend. Choosing{" "}
            <strong>
              Attending Conference &amp; Require Attendance/Presentation
              Certificate
            </strong>{" "}
            requires payment of the registration fee.
          </p>
        </div>
      </div>

      {/* ---------------- Participation ---------------- */}
      <div className="card card-pad space-y-5">
        <div>
          <h2 className="font-semibold text-slate-900">Participation</h2>
          <p className="text-sm text-slate-600 mt-1">
            Please select your intended level of participation below.
          </p>
        </div>

        <div className="space-y-2">
          {SUBMISSION_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex items-start gap-3 border border-slate-300 rounded-lg
                         px-3 py-3 cursor-pointer hover:bg-slate-50
                         has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                name="submission_type"
                value={t.value}
                checked={submissionType === t.value}
                onChange={(e) => setSubmissionType(e.target.value)}
                className="mt-1"
              />
              <span>
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900">
                    {t.label}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      t.pathway === "Pathway A"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300"
                    }`}
                  >
                    {t.pathway}
                  </span>
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">
            Participation Intention
          </p>
          <p className="text-xs text-slate-500 mt-0.5 mb-2">
            Please specify your attendance format:
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {PARTICIPATION_MODES.map((m) => (
              <label
                key={m.value}
                className="flex items-center gap-3 border border-slate-300 rounded-lg
                           px-3 py-2.5 cursor-pointer hover:bg-slate-50
                           has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="participation_mode"
                  value={m.value}
                  checked={participationMode === m.value}
                  onChange={(e) => setParticipationMode(e.target.value)}
                />
                <span className="text-sm text-slate-800">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- Declaration ---------------- */}
      <div className="card card-pad space-y-3">
        <h2 className="font-semibold text-slate-900">Declaration</h2>
        <p className="text-sm text-slate-600">
          Please confirm the following before continuing.
        </p>

        {(
          [
            [
              declOriginal,
              setDeclOriginal,
              "This work is original, not plagiarized, and has not been submitted/published elsewhere.",
            ],
            [
              declAi,
              setDeclAi,
              "AI tools were used only for assistance, not as co-authors.",
            ],
            [
              declConsent,
              setDeclConsent,
              "I consent to my submission, if accepted, being shared with the Editorial Offices of associated journals, edited books, and the GLOGIFT 27 conference proceedings.",
            ],
          ] as [boolean, (v: boolean) => void, string][]
        ).map(([checked, setter, label]) => (
          <label
            key={label}
            className="flex items-start gap-3 border border-slate-300 rounded-lg
                       px-3 py-2.5 cursor-pointer hover:bg-slate-50
                       has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setter(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-slate-800">{label}</span>
          </label>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !declarationsAccepted}
          title={
            declarationsAccepted
              ? undefined
              : "Accept all declarations above to continue"
          }
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Review camera-ready copy
        </button>
        <p className="text-xs text-slate-500">
          {declarationsAccepted
            ? "You will see a camera-ready proof to approve before the abstract is submitted."
            : "Accept all three declarations above to continue."}
        </p>
      </div>
    </form>
  );
}
