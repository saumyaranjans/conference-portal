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
  PARTICIPANT_CATEGORIES,
  type Conference,
  type Track,
} from "@/lib/types";

type ConfWithTracks = Conference & { tracks: Track[] };

const emptyCoAuthor = (): CoAuthorInput => ({
  full_name: "",
  designation: "",
  participant_category: "",
  affiliation: "",
  email: "",
  mobile: "",
});

export function NewSubmissionForm({
  conferences,
}: {
  conferences: ConfWithTracks[];
}) {
  const router = useRouter();

  const [confId, setConfId] = useState(conferences[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [trackId, setTrackId] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coAuthors, setCoAuthors] = useState<CoAuthorInput[]>([]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tracks = conferences.find((c) => c.id === confId)?.tracks ?? [];

  function setCoAuthor(i: number, patch: Partial<CoAuthorInput>) {
    setCoAuthors((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Enter a title.");
    if (!trackId) return setError("Choose a track.");
    if (!abstract.trim()) return setError("Enter an abstract.");
    if (!file) return setError("Upload your paper file.");
    if (file.size > 25 * 1024 * 1024)
      return setError("The paper file must be under 25 MB.");

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
        coAuthors,
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

      {/* ---------------- Co-authors ---------------- */}
      <div className="card card-pad space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Co-authors</h2>
          <button
            type="button"
            className="btn-secondary text-sm py-1.5"
            onClick={() => setCoAuthors((r) => [...r, emptyCoAuthor()])}
          >
            Add co-author
          </button>
        </div>
        <p className="text-xs text-slate-500">
          You are added automatically as the corresponding author. Add any
          co-authors below.
        </p>

        {coAuthors.map((c, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                className="input"
                placeholder="Name"
                value={c.full_name}
                onChange={(e) => setCoAuthor(i, { full_name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Designation"
                value={c.designation}
                onChange={(e) => setCoAuthor(i, { designation: e.target.value })}
              />
              <select
                className="input"
                value={c.participant_category}
                onChange={(e) =>
                  setCoAuthor(i, { participant_category: e.target.value })
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
                value={c.affiliation}
                onChange={(v) => setCoAuthor(i, { affiliation: v })}
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={c.email}
                onChange={(e) => setCoAuthor(i, { email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Mobile number"
                value={c.mobile}
                onChange={(e) => setCoAuthor(i, { mobile: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline mt-2"
              onClick={() =>
                setCoAuthors((r) => r.filter((_, idx) => idx !== i))
              }
            >
              Remove
            </button>
          </div>
        ))}
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
