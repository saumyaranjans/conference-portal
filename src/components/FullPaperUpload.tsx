"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  setFullPaperOption,
  submitFullPaper,
  setRequestedOutlets,
  reviseManuscriptDetails,
  buildCameraReady,
  clearCameraReadyBuild,
} from "@/lib/actions";
import {
  FULL_PAPER_OPTIONS,
  GUIDELINES_URL,
  type FullPaperSlot,
} from "@/lib/types";

type StoredFile = { id: string; slot: string; file_name: string; file_path: string };
type Outlet = { id: string; title: string; category: string | null };

/**
 * Pathway B manuscript window. Below the deadline the author may revise the
 * accepted Title/Abstract/Keywords (kept ≥70% similar to the Stage 1 version),
 * then picks Option A (separated, blind-ready) or Option B (combined) and
 * uploads the files. Required slots + one outlet + the declaration gate submit.
 */
/**
 * Response letter to Reviewer & Track Editor — a revision-stage-only upload,
 * offered under both Option A and Option B. Not one of the packaging slots, so
 * it never gates submit.
 */
const RESPONSE_LETTER_SLOT: FullPaperSlot = {
  key: "response_letter",
  label: "Response letter to Reviewer & Track Editor",
  accept: ".pdf,.doc,.docx",
  hint: "Your point-by-point response to the review comments (PDF or Word).",
};

export function FullPaperUpload({
  submissionId,
  option,
  files,
  deadline,
  editable,
  isRevision = false,
  outlets,
  selectedOutlets,
  title,
  abstract,
  keywords,
  cameraReadyBuiltAt = null,
  cameraReadyPath = null,
}: {
  submissionId: string;
  option: "A" | "B" | null;
  files: StoredFile[];
  deadline: string | null;
  editable: boolean;
  /** True only when re-uploading a revised manuscript (revision stage). */
  isRevision?: boolean;
  outlets: Outlet[];
  selectedOutlets: string[];
  title: string;
  abstract: string;
  keywords: string[];
  /** When the camera-ready PDF was last built (null = not built / invalidated). */
  cameraReadyBuiltAt?: string | null;
  /** Storage path of the built camera-ready PDF, for re-preview. */
  cameraReadyPath?: string | null;
}) {
  const router = useRouter();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(selectedOutlets ?? []);
  const [declared, setDeclared] = useState<boolean[]>([false, false, false]);
  const [building, setBuilding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Editable Title / Abstract / Keywords (auto-filled from the accepted abstract).
  const [detTitle, setDetTitle] = useState(title);
  const [detAbstract, setDetAbstract] = useState(abstract);
  const [detKeywords, setDetKeywords] = useState((keywords ?? []).join(", "));
  const [detBusy, setDetBusy] = useState(false);
  const [detMsg, setDetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveDetails() {
    setDetBusy(true);
    setDetMsg(null);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("title", detTitle);
    fd.set("abstract", detAbstract);
    fd.set("keywords", detKeywords);
    const res = await reviseManuscriptDetails(fd);
    setDetBusy(false);
    if (res.ok) {
      setDetMsg({ ok: true, text: res.message ?? "Saved." });
      router.refresh();
    } else {
      setDetMsg({ ok: false, text: res.message ?? "Could not save." });
      if (typeof window !== "undefined") window.alert(res.message ?? "Could not save.");
    }
  }

  async function toggleOutlet(oid: string) {
    const next = picked.includes(oid)
      ? picked.filter((x) => x !== oid)
      : [...picked, oid];
    setPicked(next);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("outlet_ids", next.join(","));
    await setRequestedOutlets(fd);
    router.refresh();
  }

  async function choose(opt: "A" | "B") {
    setError(null);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("option", opt);
    const res = await setFullPaperOption(fd);
    if (!res.ok) setError(res.message ?? "Could not save that.");
    else router.refresh();
  }

  async function upload(slot: FullPaperSlot, file: File) {
    setError(null);
    if (file.size > 25 * 1024 * 1024) {
      setError("Each file must be under 25 MB.");
      return;
    }
    const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
    const allowed = slot.accept.split(",").map((s) => s.replace(".", "").trim());
    if (!allowed.includes(ext)) {
      setError(`"${slot.label}" accepts: ${slot.accept}`);
      return;
    }
    setBusySlot(slot.key);
    const supabase = createClient();
    const path = `${submissionId}/full/${slot.key}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("papers")
      .upload(path, file, { upsert: false, cacheControl: "0" });
    if (upErr) {
      setError(upErr.message);
      setBusySlot(null);
      return;
    }
    const { error: dbErr } = await supabase.from("submission_files").insert({
      submission_id: submissionId,
      slot: slot.key,
      file_path: path,
      file_name: file.name,
    });
    if (dbErr) {
      await supabase.storage.from("papers").remove([path]);
      setError(dbErr.message);
    } else {
      await invalidateBuild();
    }
    setBusySlot(null);
    router.refresh();
  }

  async function remove(f: StoredFile) {
    setError(null);
    const supabase = createClient();
    await supabase.storage.from("papers").remove([f.file_path]);
    await supabase.from("submission_files").delete().eq("id", f.id);
    await invalidateBuild();
    router.refresh();
  }

  // A changed file set invalidates any prior camera-ready build.
  async function invalidateBuild() {
    if (!cameraReadyBuiltAt) return;
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    await clearCameraReadyBuild(fd);
  }

  async function build() {
    setError(null);
    setNotice(null);
    setBuilding(true);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    const res = await buildCameraReady(fd);
    setBuilding(false);
    if (!res.ok) {
      setError(res.message ?? "Could not build the camera-ready PDF.");
      return;
    }
    setShowPreview(true);
    setNotice(
      res.warning
        ? `${res.message} ${res.warning}`
        : res.message ?? "Camera-ready built."
    );
    router.refresh();
  }

  function togglePreview() {
    setShowPreview((v) => !v);
  }

  // Served from our own origin so the browser's native PDF viewer renders it
  // inline (a cross-origin Supabase URL is blocked from the embedded viewer by
  // our Cross-Origin-Resource-Policy). The build timestamp busts the cache
  // after a rebuild.
  const previewSrc = cameraReadyBuiltAt
    ? `/api/camera-ready/${submissionId}?v=${encodeURIComponent(cameraReadyBuiltAt)}`
    : null;

  async function download(f: StoredFile) {
    const { data } = await createClient()
      .storage.from("papers")
      .createSignedUrl(f.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function submit() {
    setError(null);
    setNotice(null);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("declared", String(declared.every(Boolean)));
    const res = await submitFullPaper(fd);
    if (!res.ok) setError(res.message ?? "Could not submit.");
    else {
      setNotice(res.message ?? "Submitted.");
      router.refresh();
    }
  }

  const cfg = option ? FULL_PAPER_OPTIONS[option] : null;
  const required = cfg ? cfg.slots.filter((s) => s.required) : [];
  const haveSlots = new Set(files.map((f) => f.slot));
  const requiredDone = required.filter((s) => haveSlots.has(s.key)).length;
  const filesReady = !!cfg && requiredDone === required.length;
  const isBuilt = !!cameraReadyBuiltAt;
  const canBuild = filesReady && !building;
  const canSubmit =
    filesReady && isBuilt && picked.length > 0 && declared.every(Boolean);

  const DECLARATIONS = [
    "On behalf of all authors, I confirm this full paper is original, not plagiarised, and not submitted or published elsewhere.",
    "On behalf of all authors, I confirm any AI tools were used only for assistance, not as co-authors.",
    "On behalf of all authors, I consent, if accepted, to the paper being shared with the Editorial Offices of associated journals, edited books, and the GLOGIFT 2027 conference proceedings.",
  ];

  return (
    <div className="space-y-4">
      {deadline && <DeadlineBanner deadline={deadline} />}

      {/* ---- Paper details (from the accepted abstract) ---- */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Paper details
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-filled from your accepted (Stage 1) abstract. You may revise the
            title and abstract, but a revision must stay at least 70% on the
            accepted topic.
          </p>
        </div>
        <label className="label">
          Title
          <input
            className="input mt-1"
            value={detTitle}
            disabled={!editable}
            onChange={(e) => setDetTitle(e.target.value)}
          />
        </label>
        <label className="label">
          Abstract
          <textarea
            className="input mt-1"
            rows={6}
            value={detAbstract}
            disabled={!editable}
            onChange={(e) => setDetAbstract(e.target.value)}
          />
        </label>
        <label className="label">
          Keywords
          <input
            className="input mt-1"
            value={detKeywords}
            disabled={!editable}
            placeholder="comma, separated"
            onChange={(e) => setDetKeywords(e.target.value)}
          />
        </label>
        {detMsg && (
          <p className={`text-sm ${detMsg.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {detMsg.text}
          </p>
        )}
        {editable && (
          <button
            type="button"
            onClick={saveDetails}
            disabled={detBusy}
            className="btn-secondary"
          >
            {detBusy ? "Saving…" : "Save details"}
          </button>
        )}
      </div>

      {/* ---- Packaging option: two buttons + (i) to the guidelines ---- */}
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
          Choose how you will package your full paper. You can switch before
          submitting.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["A", "B"] as const).map((opt) => {
            const active = option === opt;
            return (
              <div key={opt} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => choose(opt)}
                  disabled={!editable}
                  aria-pressed={active}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {FULL_PAPER_OPTIONS[opt].title}
                </button>
                <a
                  href={GUIDELINES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Submission guidelines"
                  aria-label={`${FULL_PAPER_OPTIONS[opt].title} — submission guidelines`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-[11px] font-semibold text-slate-500 hover:border-blue-500 hover:text-blue-600"
                >
                  i
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Slots for the chosen option ---- */}
      {cfg && (
        <div className="space-y-3">
          {cfg.slots.map((slot) => {
            const slotFiles = files.filter((f) => f.slot === slot.key);
            return (
              <div
                key={slot.key}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
              >
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {slot.label}
                    {slot.required && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
                        Required
                      </span>
                    )}
                    {slot.multiple && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                        Multiple
                      </span>
                    )}
                  </span>
                  {slot.required && (
                    <span className={haveSlots.has(slot.key) ? "text-emerald-600 text-xs" : "text-slate-400 text-xs"}>
                      {haveSlots.has(slot.key) ? "✓ uploaded" : "missing"}
                    </span>
                  )}
                </div>
                {slot.hint && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {slot.hint}
                  </p>
                )}

                {slotFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {slotFiles.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => download(f)}
                          className="text-blue-700 hover:underline dark:text-blue-300 truncate max-w-[16rem]"
                        >
                          {f.file_name}
                        </button>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => remove(f)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {editable && (slot.multiple || slotFiles.length === 0) && (
                  <label className="block mt-2">
                    <span className="sr-only">Upload {slot.label}</span>
                    <input
                      type="file"
                      accept={slot.accept}
                      disabled={busySlot === slot.key}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(slot, file);
                        e.target.value = "";
                      }}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3
                                 file:rounded-lg file:border-0 file:text-xs file:font-medium
                                 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                  </label>
                )}
                {busySlot === slot.key && (
                  <p className="text-xs text-slate-500 mt-1">Uploading…</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Response letter (revision stage only, both options) ---- */}
      {isRevision && cfg && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {RESPONSE_LETTER_SLOT.label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {RESPONSE_LETTER_SLOT.hint}
          </p>
          {(() => {
            const rl = files.filter((f) => f.slot === RESPONSE_LETTER_SLOT.key);
            return (
              <>
                {rl.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {rl.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => download(f)}
                          className="text-blue-700 hover:underline dark:text-blue-300 truncate max-w-[16rem]"
                        >
                          {f.file_name}
                        </button>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => remove(f)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {editable && rl.length === 0 && (
                  <label className="block mt-2">
                    <span className="sr-only">
                      Upload {RESPONSE_LETTER_SLOT.label}
                    </span>
                    <input
                      type="file"
                      accept={RESPONSE_LETTER_SLOT.accept}
                      disabled={busySlot === RESPONSE_LETTER_SLOT.key}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(RESPONSE_LETTER_SLOT, file);
                        e.target.value = "";
                      }}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3
                                 file:rounded-lg file:border-0 file:text-xs file:font-medium
                                 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                  </label>
                )}
                {busySlot === RESPONSE_LETTER_SLOT.key && (
                  <p className="text-xs text-slate-500 mt-1">Uploading…</p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ---- Publishing outlet(s) ---- */}
      {cfg && outlets.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Publishing outlet(s){" "}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
              at least one
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select every outlet you would like your paper considered for. You may
            pick one, some, or all.
          </p>
          <div className="mt-2 space-y-1.5">
            {outlets.map((o) => (
              <label key={o.id} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={picked.includes(o.id)}
                  disabled={!editable}
                  onChange={() => toggleOutlet(o.id)}
                  className="mt-1"
                />
                <span>
                  <span className="text-slate-800 dark:text-slate-100">{o.title}</span>
                  {o.category && (
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {o.category}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
            <span className="font-semibold">Please note:</span> the outlets you
            select are your preferences only. The final decision on whether a
            paper is forwarded for further submission to any journal, edited book
            or the conference proceedings rests with the Track Editor and the
            GLOGIFT 2027 conference committee.
          </p>
        </div>
      )}

      {/* ---- Declaration (re-affirmed for the full paper) ---- */}
      {cfg && editable && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Declaration{" "}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
              all required
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Please confirm the following on behalf of all authors before you
            submit.
          </p>
          <div className="mt-2 space-y-1.5">
            {DECLARATIONS.map((label, i) => (
              <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={declared[i]}
                  onChange={() =>
                    setDeclared((d) => d.map((v, j) => (j === i ? !v : v)))
                  }
                  className="mt-1"
                />
                <span className="text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ---- Camera-ready: build → preview → approve, before submit ---- */}
      {cfg && editable && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Camera-ready PDF{" "}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
              required before submit
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            This compiles your uploaded files (everything except the Title Page)
            behind a generated cover page — with the Manuscript ID, title, track,
            conference details and the full author list — into one PDF. The
            manuscript itself is read with no author names. Preview it and, if it
            looks right, submit.
          </p>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={build}
              disabled={!canBuild}
              className="btn-secondary disabled:opacity-50"
              title={filesReady ? undefined : "Upload the required files first"}
            >
              {building
                ? "Building…"
                : isBuilt
                  ? "Rebuild Camera-Ready PDF"
                  : "Build Camera-Ready PDF for Approval"}
            </button>
            {isBuilt && (
              <button
                type="button"
                onClick={togglePreview}
                className="text-sm text-blue-700 hover:underline dark:text-blue-300"
              >
                {showPreview ? "Hide preview" : "Preview camera-ready"}
              </button>
            )}
          </div>

          {isBuilt ? (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Camera-ready built. Review it below — if you change any file you
              will need to rebuild before submitting.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Not built yet. Build it to unlock “Submit Manuscript”.
            </p>
          )}

          {isBuilt && showPreview && previewSrc && (
            <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <object
                data={previewSrc}
                type="application/pdf"
                className="w-full block"
                style={{ height: "78vh" }}
              >
                <iframe
                  src={previewSrc}
                  title="Camera-ready preview"
                  className="w-full"
                  style={{ height: "78vh" }}
                />
              </object>
              <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline dark:text-blue-300"
                >
                  Open in a new tab ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {cfg && editable && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary disabled:opacity-50"
            title={
              canSubmit
                ? undefined
                : "Build the camera-ready PDF, pick an outlet, and accept the declaration"
            }
          >
            Submit Manuscript
          </button>
          <span className="text-xs text-slate-500">
            Files: {requiredDone}/{required.length} · Camera-ready:{" "}
            {isBuilt ? "✓" : "pending"} · Outlets: {picked.length} · Declaration:{" "}
            {declared.every(Boolean) ? "✓" : "pending"}
          </span>
        </div>
      )}
    </div>
  );
}

function DeadlineBanner({ deadline }: { deadline: string }) {
  const d = new Date(`${deadline}T00:00:00`);
  const nice = isNaN(d.getTime())
    ? deadline
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2
                  dark:text-amber-100 dark:bg-amber-500/15 dark:border-amber-500/40">
      Full-paper submission deadline: <strong>{nice}</strong>. Please submit on or
      before this date.
    </p>
  );
}
