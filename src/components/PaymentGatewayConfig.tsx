"use client";

import { useState } from "react";

import {
  saveGatewayConfig,
  testGatewayConnection,
  type GatewayConfigView,
} from "@/lib/paymentConfigActions";

const PROVIDERS: { value: string; label: string; hint: string }[] = [
  { value: "", label: "None — payments closed", hint: "Delegates are told online payment is not open yet." },
  { value: "icici_orange", label: "ICICI Bank — Orange PG", hint: "The product ICICI onboarded this conference onto." },
  { value: "sandbox", label: "Sandbox (test only)", hint: "A stand-in bank. No money moves. Refuses to run on the live domain." },
];

/**
 * Gateway settings for the Convener, and for a bank engineer sitting with them
 * during onboarding.
 *
 * The signing key is write-only. It is never sent to the browser — the screen
 * reports only whether one is stored — so leaving the box blank keeps the
 * stored key, which is the normal case when editing anything else.
 */
export function PaymentGatewayConfig({ config }: { config: GatewayConfigView }) {
  const [provider, setProvider] = useState(config.provider);
  const [enabled, setEnabled] = useState(config.enabled);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState<{ ok: boolean; message?: string } | null>(null);
  const [tested, setTested] = useState<{ ok: boolean; message?: string } | null>(null);

  const isOrange = provider === "icici_orange";

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(null);
    try {
      setSaved(await saveGatewayConfig(new FormData(e.currentTarget)));
    } finally {
      setSaving(false);
    }
  }

  async function onTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTesting(true);
    setTested(null);
    try {
      setTested(await testGatewayConnection(new FormData(e.currentTarget)));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {config.tableMissing && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <strong className="font-semibold">Not saveable yet.</strong> The
          payment_gateway_config table does not exist — apply migration{" "}
          <span className="font-mono">0083_payment_gateway_config.sql</span> in
          the Supabase SQL editor. Values below are read from environment
          variables until then.
        </p>
      )}

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          enabled
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        }`}
      >
        <strong className="font-semibold">
          {enabled ? "Payments are OPEN" : "Payments are CLOSED"}
        </strong>
        {" — "}
        {enabled
          ? `delegates can pay now, via ${provider || "no gateway"} in ${config.mode} mode.`
          : "delegates see their fee and can save a registration, but no money is taken."}
        <span className="ml-1 opacity-70">
          Settings currently read from {config.source === "database" ? "the database" : "environment variables"}.
        </span>
      </div>

      <form onSubmit={onSave} className="card card-pad space-y-5">
        <div>
          <label htmlFor="provider" className="label">Gateway</label>
          <select
            id="provider"
            name="provider"
            className="input sm:max-w-md"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            {PROVIDERS.find((p) => p.value === provider)?.hint}
          </p>
        </div>

        {isOrange && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="merchant_id" className="label">Merchant ID</label>
                <input id="merchant_id" name="merchant_id" className="input font-mono"
                  defaultValue={config.merchantId} placeholder="100000000007164" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="aggregator_id" className="label">Aggregator ID</label>
                <input id="aggregator_id" name="aggregator_id" className="input font-mono"
                  defaultValue={config.aggregatorId} placeholder="A100000000007164" autoComplete="off" />
              </div>
            </div>

            <div>
              <label htmlFor="secure_key" className="label">
                Secure key{" "}
                <span className="font-normal text-slate-500">
                  {config.hasSecureKey ? "(stored — leave blank to keep it)" : "(not set)"}
                </span>
              </label>
              <input id="secure_key" name="secure_key" type="password" className="input font-mono sm:max-w-md"
                placeholder={config.hasSecureKey ? "••••••••  unchanged" : "Paste the key from ICICI"} autoComplete="off" />
              <p className="mt-1.5 text-xs text-slate-500">
                Signs our requests and verifies the bank&rsquo;s replies. It is never
                displayed once saved, and never sent to a browser. Anyone holding it
                could forge a payment confirmation, so treat it as a password.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="initiate_url" className="label">Initiate Sale URL</label>
                <input id="initiate_url" name="initiate_url" className="input font-mono text-xs"
                  defaultValue={config.initiateUrl}
                  placeholder="https://pgpayuat.icici.bank.in/tsp/pg/api/v2/initiateSale" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="command_url" className="label">Command URL (status / refund)</label>
                <input id="command_url" name="command_url" className="input font-mono text-xs"
                  defaultValue={config.commandUrl}
                  placeholder="https://pgpayuat.icici.bank.in/tsp/pg/api/command" autoComplete="off" />
              </div>
            </div>

            <div>
              <label htmlFor="mode" className="label">Environment</label>
              <select id="mode" name="mode" className="input sm:max-w-xs" defaultValue={config.mode}>
                <option value="uat">UAT — testing</option>
                <option value="production">Production — real money</option>
              </select>
            </div>
          </>
        )}

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
          <input type="checkbox" name="enabled" className="mt-0.5 accent-blue-600"
            checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-sm">
            <strong className="font-semibold">Accept payments</strong>
            <span className="block text-xs text-slate-500">
              Kept separate from the credentials on purpose: they arrive over several
              sittings during onboarding, and the gateway must not start taking money
              the moment the last field happens to be filled in.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save configuration"}
          </button>
          {saved?.message && (
            <p className={`text-sm ${saved.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>
              {saved.message}
            </p>
          )}
        </div>
      </form>

      {isOrange && (
        <form onSubmit={onTest} className="card card-pad space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Test the credentials
          </h3>
          <p className="text-xs text-slate-500">
            Runs a Status Check against the gateway. It moves no money and takes no
            card details, but it signs a request and verifies the signed reply — so a
            success proves the merchant ID, the endpoint and the secure key all match
            what ICICI holds. That is the one thing that cannot be checked offline.
            Use any reference the bank has given you, or a past order number.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="reference" className="label text-xs">Transaction reference</label>
              <input id="reference" name="reference" className="input font-mono text-sm sm:w-72"
                placeholder="GLOGIFT27-XXXXXXXX" autoComplete="off" />
            </div>
            <button type="submit" disabled={testing} className="btn-secondary">
              {testing ? "Contacting gateway…" : "Run test"}
            </button>
          </div>
          {tested?.message && (
            <p className={`rounded-lg px-3 py-2 text-sm ${
              tested.ok
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }`}>
              {tested.message}
            </p>
          )}
        </form>
      )}

      <div className="card card-pad text-xs text-slate-500">
        <p className="font-semibold text-slate-700 dark:text-slate-200">For the bank</p>
        <p className="mt-1">
          Payment Advice / return URL to register against this merchant:{" "}
          <span className="font-mono text-slate-700 dark:text-slate-200">
            https://glogift2027.in/api/payments/callback
          </span>
        </p>
        <p className="mt-1">
          It accepts form-encoded POSTs, verifies the secure hash before acting, and
          returns HTTP 200 once the advice has been processed.
        </p>
      </div>
    </div>
  );
}
