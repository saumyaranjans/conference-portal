"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { INTEGRITY_PROVIDERS } from "@/lib/types";

export type IntegrityResult = { ok: boolean; message: string };

const MAX_REPORT_BYTES = 20 * 1024 * 1024;

/** A percentage field: blank clears it, otherwise it must land in 0..100. */
function percent(form: FormData, key: string): number | null | "invalid" {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "invalid";
  return Math.round(n);
}

/**
 * Record the result of a research-integrity check against a manuscript.
 *
 * The scores are produced outside the portal — in Turnitin, iThenticate,
 * Copyleaks or whichever tool the Editorial Office uses — and entered here with
 * the provider named and (optionally) the provider's own report PDF attached,
 * so the record shows where a number came from and who stood behind it. When a
 * machine-readable provider is wired up later it writes through this same
 * shape; only the entry point differs.
 */
export async function recordIntegrityCheck(
  formData: FormData
): Promise<IntegrityResult> {
  const profile = await requireRole("editor", "chief", "admin");
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  if (!submissionId) return { ok: false, message: "Submission is missing." };

  const similarity = percent(formData, "similarity_index");
  const ai = percent(formData, "ai_percentage");
  if (similarity === "invalid" || ai === "invalid") {
    return { ok: false, message: "Percentages must be between 0 and 100." };
  }
  if (similarity === null && ai === null) {
    return {
      ok: false,
      message: "Enter at least one score — similarity or AI writing.",
    };
  }

  const provider = String(formData.get("integrity_provider") ?? "manual").trim();
  if (!(INTEGRITY_PROVIDERS as readonly string[]).includes(provider)) {
    return { ok: false, message: "Unknown integrity tool." };
  }

  const notes = String(formData.get("integrity_notes") ?? "").trim().slice(0, 1000);

  const admin = createAdminClient();

  // The provider's own report is the evidence behind the numbers; keep it in
  // the same private bucket as the manuscripts.
  let reportPath: string | undefined;
  const file = formData.get("report") as File | null;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_REPORT_BYTES) {
      return { ok: false, message: "Report must be 20 MB or smaller." };
    }
    if (file.type && file.type !== "application/pdf") {
      return { ok: false, message: "Report must be a PDF." };
    }
    reportPath = `integrity/${submissionId}/${randomBytes(6).toString("hex")}.pdf`;
    const { error: upErr } = await admin.storage
      .from("papers")
      .upload(reportPath, Buffer.from(await file.arrayBuffer()), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) return { ok: false, message: upErr.message };
  }

  const { error } = await admin
    .from("submissions")
    .update({
      similarity_index: similarity,
      ai_percentage: ai,
      integrity_provider: provider,
      integrity_notes: notes || null,
      integrity_checked_at: new Date().toISOString(),
      integrity_checked_by: profile.id,
      ...(reportPath ? { integrity_report_path: reportPath } : {}),
    })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "submission.integrity_recorded",
    entity_id: submissionId,
    details: { provider, similarity_index: similarity, ai_percentage: ai },
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/chief/submissions/${submissionId}`);
  return { ok: true, message: "Integrity check recorded." };
}

/** Clear a recorded check (wrong paper, superseded by a re-run). */
export async function clearIntegrityCheck(
  formData: FormData
): Promise<IntegrityResult> {
  const profile = await requireRole("editor", "chief", "admin");
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  if (!submissionId) return { ok: false, message: "Submission is missing." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("submissions")
    .select("integrity_report_path")
    .eq("id", submissionId)
    .maybeSingle();

  const { error } = await admin
    .from("submissions")
    .update({
      similarity_index: null,
      ai_percentage: null,
      integrity_checked_at: null,
      integrity_checked_by: null,
      integrity_notes: null,
      integrity_report_path: null,
      integrity_provider: "manual",
    })
    .eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  const path = (row as any)?.integrity_report_path;
  if (path) await admin.storage.from("papers").remove([path]);

  await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: "submission.integrity_cleared",
    entity_id: submissionId,
  });

  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/chief/submissions/${submissionId}`);
  return { ok: true, message: "Integrity check cleared." };
}

/** A short-lived link to the stored provider report. */
export async function integrityReportUrl(
  submissionId: string
): Promise<string | null> {
  await requireRole("editor", "chief", "admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("integrity_report_path")
    .eq("id", submissionId)
    .maybeSingle();
  const path = (data as any)?.integrity_report_path;
  if (!path) return null;

  const { data: signed } = await createAdminClient()
    .storage.from("papers")
    .createSignedUrl(path, 300);
  return signed?.signedUrl ?? null;
}
