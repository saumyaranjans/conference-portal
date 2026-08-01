"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  setFullPaperOption,
  submitFullPaper,
  setRequestedOutlets,
} from "@/lib/actions";
import {
  FULL_PAPER_OPTIONS,
  type FullPaperSlot,
} from "@/lib/types";

type StoredFile = { id: string; slot: string; file_name: string; file_path: string };
type Outlet = { id: string; title: string; category: string | null };

/**
 * Pathway B full-paper packaging + upload. The author first picks Option A
 * (separated, blind-ready) or Option B (combined), then uploads the files for
 * each slot. Uploads go straight to Supabase Storage and are recorded in
 * submission_files (RLS-scoped to the owner). Required slots gate submission.
 */
export function FullPaperUpload({
  submissionId,
  option,
  files,
  deadline,
  editable,
  outlets,
  selectedOutlets,
}: {
  submissionId: string;
  option: "A" | "B" | null;
  files: StoredFile[];
  deadline: string | null;
  editable: boolean;
  outlets: Outlet[];
  selectedOutlets: string[];
}) {
  const router = useRouter();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(selectedOutlets ?? []);
  // Re-affirmed for the full paper, on behalf of all authors, at submit time.
  const [declared, setDeclared] = useState<boolean[]>([false, false, false]);

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
    }
    setBusySlot(null);
    router.refresh();
  }

  async function remove(f: StoredFile) {
    setError(null);
    const supabase = createClient();
    await supabase.storage.from("papers").remove([f.file_path]);
    await supabase.from("submission_files").delete().eq("id", f.id);
    router.refresh();
  }

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

  // ---- Option not yet chosen: two-card picker ----
  if (!option) {
    return (
      <div className="space-y-3">
        {deadline && <DeadlineBanner deadline={deadline} />}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Choose how you will package your full paper. You can switch before
          submitting.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {(["A", "B"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              disabled={!editable}
              className="text-left rounded-xl border border-slate-300 p-4 hover:bg-slate-50
                         dark:border-slate-600 dark:hover:bg-slate-800 transition disabled:opacity-60"
            >
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                {FULL_PAPER_OPTIONS[opt].title}
              </span>
              <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1">
                {FULL_PAPER_OPTIONS[opt].detail}
              </span>
              <ul className="mt-2 text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-0.5">
                {FULL_PAPER_OPTIONS[opt].slots.map((s) => (
                  <li key={s.key}>
                    {s.label}
                    {s.required ? " *" : ""}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  // ---- Option chosen: per-slot uploads ----
  const cfg = FULL_PAPER_OPTIONS[option];
  const required = cfg.slots.filter((s) => s.required);
  const haveSlots = new Set(files.map((f) => f.slot));
  const requiredDone = required.filter((s) => haveSlots.has(s.key)).length;
  const canSubmit =
    requiredDone === required.length &&
    picked.length > 0 &&
    declared.every(Boolean);

  const DECLARATIONS = [
    "On behalf of all authors, I confirm this full paper is original, not plagiarised, and not submitted or published elsewhere.",
    "On behalf of all authors, I confirm any AI tools were used only for assistance, not as co-authors.",
    "On behalf of all authors, I consent, if accepted, to the paper being shared with the Editorial Offices of associated journals, edited books, and the GLOGIFT 2027 conference proceedings.",
  ];

  return (
    <div className="space-y-4">
      {deadline && <DeadlineBanner deadline={deadline} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {cfg.title}
        </p>
        {editable && (
          <button
            type="button"
            onClick={() => choose(option === "A" ? "B" : "A")}
            className="text-xs text-blue-700 hover:underline dark:text-blue-300"
          >
            Switch to {option === "A" ? "Option B" : "Option A"}
          </button>
        )}
      </div>

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

      {/* ---- Publishing outlet(s) ---- */}
      {outlets.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Publishing outlet(s){" "}
            <span className="ml-1 text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
              at least one
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select every outlet you would like your paper considered for. You
            may pick one, some, or all.
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
        </div>
      )}

      {/* ---- Declaration (re-affirmed for the full paper) ---- */}
      {editable && (
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

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {editable && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="btn-primary disabled:opacity-50"
            title={canSubmit ? undefined : "Upload the required files, pick an outlet, and accept the declaration"}
          >
            Submit full paper
          </button>
          <span className="text-xs text-slate-500">
            Required files: {requiredDone}/{required.length} · Outlets:{" "}
            {picked.length} · Declaration:{" "}
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
