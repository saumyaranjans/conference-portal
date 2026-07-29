"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAbstractReviewRoute } from "@/lib/actions";

const CHOICES = [
  {
    value: "self",
    title: "I will evaluate this myself",
    detail:
      "The topic falls directly within my area of expertise, so I am bypassing the review process and deciding as Track Editor.",
  },
  {
    value: "facilitated",
    title: "Send it out for review",
    detail:
      "The topic is unrelated to my area and I cannot evaluate it myself, so I will facilitate the review process and invite reviewers.",
  },
] as const;

/**
 * The first gate on an abstract: the chair says how it will be judged. Until
 * one is chosen the decision form stays shut, so nobody records a decision
 * without having declared the basis for it.
 */
export function AbstractReviewRoute({
  submissionId,
  current,
}: {
  submissionId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(route: string) {
    setError(null);
    setBusy(route);
    const fd = new FormData();
    fd.set("submission_id", submissionId);
    fd.set("route", route);
    const res = await setAbstractReviewRoute(fd);
    setBusy(null);
    if (!res.ok) {
      setError(res.message ?? "Could not save that.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card card-pad space-y-3">
      {!current && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:text-amber-100 dark:bg-amber-500/15 dark:border-amber-500/40">
          Choose how this abstract will be reviewed. The decision form opens once
          you do.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {CHOICES.map((c) => {
          const active = current === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => choose(c.value)}
              disabled={busy !== null}
              aria-pressed={active}
              className={`text-left rounded-xl border p-4 transition ${
                active
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15 dark:border-blue-400"
                  : "border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              } ${busy !== null ? "opacity-60" : ""}`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-blue-600 bg-blue-600" : "border-slate-400"
                  }`}
                >
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {busy === c.value ? "Saving…" : c.title}
                </span>
              </span>
              <span className="block text-xs text-slate-600 mt-2 dark:text-slate-400">
                {c.detail}
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {current === "self"
            ? "You are evaluating this abstract in your capacity as Track Editor. Select the other option if you would rather send it out."
            : "This abstract is going out for review. Invite reviewers in the section above; you can still record your decision below."}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
