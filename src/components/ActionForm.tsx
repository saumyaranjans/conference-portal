"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions";

/**
 * Wraps a server action that returns an ActionResult, surfacing its
 * message inline and refreshing the route on success.
 */
export function ActionForm({
  action,
  children,
  className = "",
  confirm,
  onDone,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;

    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setResult(res);

    if (res.ok) {
      startTransition(() => {
        router.refresh();
        onDone?.();
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {result?.message && (
        <p
          className={`text-sm mt-2 rounded-lg px-3 py-2 ${
            result.ok
              ? "text-emerald-700 bg-emerald-50"
              : "text-red-600 bg-red-50"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="submit" className={`btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
