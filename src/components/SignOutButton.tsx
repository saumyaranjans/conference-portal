"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  // Two-step: the first click asks for confirmation (a reminder to save any
  // in-progress work) before actually signing out.
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="btn-secondary whitespace-nowrap"
      >
        Sign out
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline text-[11px] text-slate-500 whitespace-nowrap">
        Save your work first —
      </span>
      <button
        onClick={signOut}
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
      >
        {pending ? "Signing out…" : "Confirm sign out"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-xs font-medium text-slate-600 hover:underline whitespace-nowrap dark:text-slate-300"
      >
        Cancel
      </button>
    </div>
  );
}
