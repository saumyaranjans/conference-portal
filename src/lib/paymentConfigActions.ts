"use server";

import { revalidatePath } from "next/cache";

import { requireUserManagement } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { gatewayConfig } from "@/lib/payments";
import { orangeStatusCheck } from "@/lib/payments/orange";
import type { ActionResult } from "@/lib/actions";

/**
 * Gateway settings, for the Convener.
 *
 * requireUserManagement() throughout: an outright Convener holding manage
 * rights, explicitly NOT Editorial Office by courtesy. These fields decide
 * where real money goes, and the signing secret they hold lets whoever has it
 * forge a payment advice.
 */

/** What the screen may see. Note the secret is reported, never returned. */
export type GatewayConfigView = {
  provider: string;
  merchantId: string;
  aggregatorId: string;
  initiateUrl: string;
  commandUrl: string;
  mode: "uat" | "production";
  enabled: boolean;
  /** True when a signing key is stored. The key itself never leaves the server. */
  hasSecureKey: boolean;
  source: "database" | "environment";
  tableMissing: boolean;
};

export async function loadGatewayConfig(): Promise<GatewayConfigView> {
  await requireUserManagement();
  const c = await gatewayConfig();

  // If the row is absent the loader silently falls back to env, so ask
  // directly whether the table exists — the screen needs to say so.
  const { error } = await createAdminClient()
    .from("payment_gateway_config")
    .select("id")
    .limit(1);

  return {
    provider: c.provider,
    merchantId: c.merchantId,
    aggregatorId: c.aggregatorId,
    initiateUrl: c.initiateUrl,
    commandUrl: c.commandUrl,
    mode: c.mode,
    enabled: c.enabled,
    hasSecureKey: c.secureKey.trim().length > 0,
    source: c.source,
    tableMissing: !!error,
  };
}

export async function saveGatewayConfig(
  formData: FormData
): Promise<ActionResult> {
  const staff = await requireUserManagement();
  const admin = createAdminClient();

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const provider = str("provider");
  const mode = str("mode") === "production" ? "production" : "uat";
  const enabled = String(formData.get("enabled")) === "on";
  const secureKey = str("secure_key");

  if (enabled && !provider) {
    return { ok: false, message: "Choose a gateway before switching payments on." };
  }

  // Turning payments on demands the full set. Half a configuration reaches the
  // bank and fails there, in front of a delegate holding a card.
  if (enabled && provider === "icici_orange") {
    const needed: [string, string][] = [
      ["Merchant ID", str("merchant_id")],
      ["Aggregator ID", str("aggregator_id")],
      ["Initiate Sale URL", str("initiate_url")],
      ["Command URL", str("command_url")],
    ];
    const missing = needed.filter(([, v]) => !v).map(([k]) => k);
    const existing = await gatewayConfig();
    if (!secureKey && !existing.secureKey) missing.push("Secure key");
    if (missing.length) {
      return {
        ok: false,
        message: `Cannot switch payments on — still missing: ${missing.join(", ")}.`,
      };
    }
  }

  const patch: Record<string, unknown> = {
    id: true,
    provider,
    merchant_id: str("merchant_id"),
    aggregator_id: str("aggregator_id"),
    initiate_url: str("initiate_url"),
    command_url: str("command_url"),
    mode,
    enabled,
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  };
  // Blank means "leave the stored key alone" — the form never shows it, so an
  // empty box is the normal state when editing anything else.
  if (secureKey) patch.secure_key = secureKey;

  const { error } = await admin
    .from("payment_gateway_config")
    .upsert(patch, { onConflict: "id" });
  if (error) {
    return {
      ok: false,
      message:
        error.message.includes("payment_gateway_config")
          ? "The payment_gateway_config table does not exist yet. Apply migration 0083."
          : error.message,
    };
  }

  revalidatePath("/chief/payment-gateway");
  revalidatePath("/registration");
  return {
    ok: true,
    message: enabled
      ? `Saved. Payments are OPEN via ${provider} (${mode}).`
      : "Saved. Payments remain closed until you switch them on.",
  };
}

/**
 * Ask the gateway about a transaction reference, as a live credentials check.
 *
 * Status Check is the safe probe: it moves no money and takes no card details,
 * but it signs a request and verifies the signed reply — so a success proves
 * the merchant ID, the endpoint and, crucially, the signing key all agree with
 * the bank's. That is the one thing that cannot be confirmed offline.
 */
export async function testGatewayConnection(
  formData: FormData
): Promise<ActionResult> {
  await requireUserManagement();

  const ref = String(formData.get("reference") ?? "").trim();
  if (!ref) {
    return { ok: false, message: "Enter a transaction reference to look up." };
  }

  try {
    const result = await orangeStatusCheck(ref);
    return {
      ok: true,
      message:
        `Gateway replied and its signature verified — credentials are correct. ` +
        `Reference ${result.orderId}: ${result.status}` +
        `${result.providerRef ? ` (txn ${result.providerRef})` : ""}.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // A hash failure is the interesting one: we reached them, they answered,
    // and the reply did not verify — so the key is wrong, not the network.
    return {
      ok: false,
      message: msg.includes("hash verification")
        ? "Reached the gateway, but its reply failed signature verification — the secure key does not match the one ICICI holds for this merchant."
        : `Test failed: ${msg}`,
    };
  }
}
