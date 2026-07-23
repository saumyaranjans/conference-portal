"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createSubmissionOnePage,
  submitForReview,
  type CoAuthorInput,
} from "@/lib/actions";
import { InstitutionInput } from "@/components/InstitutionInput";
import {
  ABSTRACT_WORD_LIMIT,
  countWords,
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

type AuthorRow = CoAuthorInput & { is_corresponding?: boolean };

const emptyCoAuthor = (): AuthorRow => ({
  full_name: "",
  designation: "",
  participant_category: "",
  affiliation: "",
  email: "",
  mobile: "",
});

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
  const [file, setFile] = useState<File | null>(null);
  const [authors, setAuthors] = useState<AuthorRow[]>([
    { ...me, is_corresponding: true },
  ]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submissionType, setSubmissionType] = useState("");
  const [participationMode, setParticipationMode] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tracks = conferences.find((c) => c.id === confId)?.tracks ?? [];
  const abstractWords = countWords(abstract);

  function setAuthor(i: number, patch: Partial<CoAuthorInput>) {
    setAuthors((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Enter a title.");
    if (!trackId) return setError("Choose a track.");
    if (!abstract.trim()) return setError("Enter an abstract.");
    if (abstractWords > ABSTRACT_WORD_LIMIT)
      return setError(
        `The abstract is ${abstractWords} words — please reduce it to ${ABSTRACT_WORD_LIMIT} words or fewer.`
      );
    if (!file) return setError("Upload your paper file.");
    if (file.size > 25 * 1024 * 1024)
      return setError("The paper file must be under 25 MB.");
    if (!submissionType) return setError("Select your level of participation.");
    if (!participationMode) return setError("Select your attendance format.");

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
        authors,
        submission_type: submissionType,
        participation_mode: participationMode,
      });
      if (!created.ok || !created.id) {
        setError(created.message ?? "Could not create the submission.");
        setBusy(false);
        return;
      }
      const id = created.id;
      const supabase = createClient();

      // 2. Upload the paper file to storage.
      setStatus("Uploading paper…");
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("papers")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError(`Paper uploaded failed: ${upErr.message}`);
        setBusy(false);
        return;
      }
      await supabase
        .from("submissions")
        .update({ file_path: path, file_name: file.name })
        .eq("id", id);

      // 3. Submit for review.
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

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl">
      {/* ---------------- Manuscript ---------------- */}
      <div className="card card-pad space-y-5">
        <h2 className="font-semibold text-slate-900">Manuscript</h2>

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

        <div>
          <label className="label" htmlFor="file">
            Paper file
          </label>
          <input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:text-sm file:font-medium
                       file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-slate-400 mt-1">PDF or Word, up to 25 MB.</p>
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
                        placeholder="Email"
                        value={a.email}
                        onChange={(e) => setAuthor(i, { email: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="Mobile number"
                        value={a.mobile}
                        onChange={(e) =>
                          setAuthor(i, { mobile: e.target.value })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline mt-2"
                      onClick={() =>
                        setAuthors((r) => r.filter((_, idx) => idx !== i))
                      }
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
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
                <span className="block text-sm font-medium text-slate-900">
                  {t.label}
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? status || "Submitting…" : "Submit manuscript"}
        </button>
        <p className="text-xs text-slate-500">
          This submits your paper for review in one step.
        </p>
      </div>
    </form>
  );
}
