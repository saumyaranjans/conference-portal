import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Where the gateway's settings come from.
 *
 * The database row wins, environment variables are the fallback. That order
 * matters: onboarding involves several rounds of credentials (UAT first,
 * production at go-live) and the Convener should be able to enter them without
 * a developer and a redeploy. The env vars remain useful for local work and as
 * a safety net if the table has not been created yet.
 *
 * Never send `secureKey` to a browser. It signs our requests and verifies the
 * bank's callbacks; anyone holding it can forge a payment advice and mark a
 * registration paid.
 */
export type GatewayConfig = {
  provider: string;
  merchantId: string;
  aggregatorId: string;
  secureKey: string;
  initiateUrl: string;
  commandUrl: string;
  mode: "uat" | "production";
  enabled: boolean;
  /** Where each value came from, for the config screen to show. */
  source: "database" | "environment";
};

const fromEnv = (): GatewayConfig => ({
  provider: (process.env.PAYMENT_PROVIDER ?? "").trim(),
  merchantId: (process.env.ICICI_ORANGE_MERCHANT_ID ?? "").trim(),
  aggregatorId: (process.env.ICICI_ORANGE_AGGREGATOR_ID ?? "").trim(),
  secureKey: (process.env.ICICI_ORANGE_SECURE_KEY ?? "").trim(),
  initiateUrl: (process.env.ICICI_ORANGE_INITIATE_URL ?? "").trim(),
  commandUrl: (process.env.ICICI_ORANGE_COMMAND_URL ?? "").trim(),
  mode: "uat",
  // An env-only setup is "on" as soon as a provider is named, which is how it
  // behaved before this table existed.
  enabled: !!(process.env.PAYMENT_PROVIDER ?? "").trim(),
  source: "environment",
});

/**
 * Read once per request. Several things ask (the registration page, the fee
 * card, submitRegistration) and they must all see the same answer.
 */
export const gatewayConfig = cache(async (): Promise<GatewayConfig> => {
  const env = fromEnv();
  try {
    const { data, error } = await createAdminClient()
      .from("payment_gateway_config")
      .select(
        "provider, merchant_id, aggregator_id, secure_key, initiate_url, command_url, mode, enabled"
      )
      .maybeSingle();

    // Table absent (migration 0083 not applied) or unreadable: fall back
    // rather than take the whole registration page down with it.
    if (error || !data) return env;

    const r = data as any;
    const pick = (v: string, fallback: string) =>
      (v ?? "").trim() || fallback;

    return {
      provider: pick(r.provider, env.provider),
      merchantId: pick(r.merchant_id, env.merchantId),
      aggregatorId: pick(r.aggregator_id, env.aggregatorId),
      secureKey: pick(r.secure_key, env.secureKey),
      initiateUrl: pick(r.initiate_url, env.initiateUrl),
      commandUrl: pick(r.command_url, env.commandUrl),
      mode: r.mode === "production" ? "production" : "uat",
      enabled: !!r.enabled,
      source: "database",
    };
  } catch {
    return env;
  }
});

/** Everything Orange PG needs, and whether it is complete. */
export function orangeCredentialsFrom(c: GatewayConfig) {
  const creds = {
    merchantId: c.merchantId,
    aggregatorId: c.aggregatorId,
    key: c.secureKey,
    initiateUrl: c.initiateUrl,
    commandUrl: c.commandUrl,
  };
  return {
    ...creds,
    complete: Object.values(creds).every((v) => v.trim().length > 0),
  };
}
