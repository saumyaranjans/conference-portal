"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function signOut() {
    await createClient().auth.signOut();
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button onClick={signOut} disabled={pending} className="btn-secondary">
      {pending ? "…" : "Sign out"}
    </button>
  );
}
