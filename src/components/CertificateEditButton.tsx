"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { revokeCertificate } from "@/lib/certificateActions";

/**
 * Line-3 "Edit" for an already-generated certificate. Clicking it asks for a
 * reason and, on confirm, revokes the current certificate — which returns the
 * row to its editable state so the number can be changed and regenerated
 * (i.e. it re-opens access to line 2). Small font, unobtrusive.
 */
export function CertificateEditButton({
  certificateId,
}: {
  certificateId: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        title="Edit — revokes the current certificate so you can change the number and regenerate"
      >
        ✎ Edit
      </button>
    );
  }

  return (
    <ActionForm
      action={revokeCertificate}
      className="flex flex-wrap items-center gap-1.5"
      onDone={() => setOpen(false)}
    >
      <input type="hidden" name="certificate_id" value={certificateId} />
      <input
        name="reason"
        required
        placeholder="Reason for edit"
        className="input h-7 w-40 text-[11px]"
        aria-label="Reason for edit"
      />
      <SubmitButton variant="danger" className="px-2 py-1 text-[10px]">
        Confirm edit
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[10px] text-slate-500 hover:underline"
      >
        Cancel
      </button>
    </ActionForm>
  );
}
