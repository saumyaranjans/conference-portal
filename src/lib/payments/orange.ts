/**
 * ICICI Bank "Orange PG" adapter.
 *
 * Not Eazypay and not CCAvenue — a third product, REST/JSON rather than a
 * signed form POST. Sale is initiated server-to-server; the bank replies with
 * a redirect URI and a transaction context, and the delegate's browser is sent
 * to `redirectURI?tranCtx=…`. Completion arrives twice over: as a browser
 * return to returnURL, and as a server-to-server Payment Advice POST.
 *
 * Integrity is one rule everywhere, request and response alike:
 *
 *     secureHash = HMAC_SHA256( concat(values ordered by field name), key )
 *
 * — field NAMES sorted alphabetically, their VALUES concatenated with no
 * separator, `secureHash` itself excluded. Verified against the bank's own
 * worked example: the rule rebuilds their HashText character for character.
 * (Their printed hash does not verify with our key, because the example is
 * another merchant's transaction — merchantId T_S0001. The rule is what
 * transfers, not the digest.)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { gatewayConfig, orangeCredentialsFrom } from "./config";

import {
  PaymentNotConfiguredError,
  type Checkout,
  type Currency,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentResult,
} from "./types";

/** ISO 4217 numeric, which is what the gateway wants rather than the letters. */
const CURRENCY_CODE: Record<Currency, string> = { INR: "356", USD: "840" };
const CODE_TO_CURRENCY: Record<string, Currency> = { "356": "INR", "840": "USD" };

/** Success on the sale response; the transaction itself reports "0000". */
const INITIATED_OK = "R1000";
const TXN_SUCCESS = "0000";

async function credentials() {
  return orangeCredentialsFrom(await gatewayConfig());
}

/**
 * The hash text: values ordered by field name, concatenated, nothing between.
 *
 * Exported for the verification script — this is the one function whose
 * behaviour has to be checkable against the bank's example without standing up
 * a payment.
 */
export function hashText(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((k) => k !== "secureHash")
    .sort()
    .map((k) => fields[k] ?? "")
    .join("");
}

export function secureHash(fields: Record<string, string>, key: string): string {
  return createHmac("sha256", key).update(hashText(fields)).digest("hex");
}

/** Constant-time compare, so a wrong hash cannot be narrowed down by timing. */
function hashMatches(expected: string, got: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from((got ?? "").toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** yyyyMMddHHmmss in IST — the gateway's txnDate format. */
function txnDate(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${ist.getUTCFullYear()}${p(ist.getUTCMonth() + 1)}${p(ist.getUTCDate())}` +
    `${p(ist.getUTCHours())}${p(ist.getUTCMinutes())}${p(ist.getUTCSeconds())}`
  );
}

export function orangeProvider(): PaymentProvider {
  return {
    id: "icici_orange",
    label: "ICICI Bank (Orange PG)",

    async isConfigured(): Promise<boolean> {
      // Every credential, or none. A half-configured gateway gets as far as
      // the bank and fails there, which is worse than not offering payment.
      return (await credentials()).complete;
    },

    async createCheckout(order: PaymentOrder): Promise<Checkout> {
      const c = await credentials();
      if (!c.complete) {
        throw new PaymentNotConfiguredError(
          "Orange PG is not configured. Complete it under Payment Gateway, or set the ICICI_ORANGE_* environment variables."
        );
      }

      // Amount is always two decimal places; the gateway rejects "100" for 100.
      const fields: Record<string, string> = {
        merchantId: c.merchantId,
        aggregatorID: c.aggregatorId,
        merchantTxnNo: order.orderId,
        amount: order.amount.toFixed(2),
        currencyCode: CURRENCY_CODE[order.currency],
        payType: "0",
        customerEmailID: order.payer.email,
        transactionType: "SALE",
        returnURL: order.returnUrl,
        txnDate: txnDate(),
        customerMobileNo: order.payer.mobile.replace(/[^\d]/g, ""),
        customerName: order.payer.name,
        addlParam1: "000",
        addlParam2: "111",
      };
      fields.secureHash = secureHash(fields, c.key);

      const res = await fetch(c.initiateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        throw new Error(`Orange PG initiateSale returned HTTP ${res.status}`);
      }

      const body = (await res.json()) as Record<string, string>;
      if (body.responseCode !== INITIATED_OK || !body.redirectURI || !body.tranCtx) {
        throw new Error(
          `Orange PG refused the sale (${body.responseCode ?? "no code"})` +
            `${body.respDescription ? `: ${body.respDescription}` : ""}`
        );
      }

      // Documented shape: redirectURI?tranCtx=<value>. Built through URL so a
      // redirectURI that already carries a query string cannot produce "??".
      const url = new URL(body.redirectURI);
      url.searchParams.set("tranCtx", body.tranCtx);
      return { method: "redirect", url: url.toString() };
    },

    async verifyCallback(
      payload: Record<string, string>
    ): Promise<PaymentResult> {
      const c = await credentials();
      if (!c.complete) {
        throw new PaymentNotConfiguredError("Orange PG is not configured.");
      }

      const expected = secureHash(payload, c.key);
      if (!hashMatches(expected, payload.secureHash ?? "")) {
        // Throw rather than return "failed": this is the only thing between a
        // forged POST and a registration marked paid, and the caller treats an
        // exception as "do not settle".
        throw new Error("Orange PG callback failed hash verification");
      }

      const code = payload.responseCode ?? "";
      // txnStatus appears on Status Check; responseCode on the sale response.
      const status: PaymentResult["status"] =
        code === TXN_SUCCESS || payload.txnStatus === "SUC"
          ? "paid"
          : code === ""
            ? "pending"
            : "failed";

      const amount = payload.amount ? Number(payload.amount) : null;

      return {
        orderId: payload.merchantTxnNo ?? "",
        status,
        providerRef: payload.txnID ?? payload.paymentID ?? null,
        // Reported by the gateway, for the caller to compare against what we
        // asked for. Never trusted as the amount to settle.
        amount: Number.isFinite(amount as number) ? (amount as number) : null,
        currency: CODE_TO_CURRENCY[payload.currencyCode ?? ""] ?? null,
        raw: payload,
      };
    },
  };
}

/**
 * Ask the gateway what actually happened to an order.
 *
 * This is what turns the Convener's recovery desk from "go and read the bank
 * statement" into a button: where a Payment Advice was lost, the truth can be
 * fetched rather than reconstructed by hand.
 */
export async function orangeStatusCheck(
  merchantTxnNo: string
): Promise<PaymentResult> {
  const c = await credentials();
  if (!c.complete) {
    throw new PaymentNotConfiguredError("Orange PG is not configured.");
  }

  const fields: Record<string, string> = {
    merchantId: c.merchantId,
    aggregatorID: c.aggregatorId,
    merchantTxnNo,
    originalTxnNo: merchantTxnNo,
    transactionType: "STATUS",
  };
  fields.secureHash = secureHash(fields, c.key);

  const res = await fetch(c.commandUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`Orange PG status check returned HTTP ${res.status}`);

  const body = (await res.json()) as Record<string, string>;
  const expected = secureHash(body, c.key);
  if (!hashMatches(expected, body.secureHash ?? "")) {
    throw new Error("Orange PG status response failed hash verification");
  }

  const amount = body.amount ? Number(body.amount) : null;
  return {
    orderId: body.merchantTxnNo ?? merchantTxnNo,
    status:
      body.txnStatus === "SUC" || body.txnResponseCode === TXN_SUCCESS
        ? "paid"
        : body.txnStatus === "PEN"
          ? "pending"
          : "failed",
    providerRef: body.txnID ?? null,
    amount: Number.isFinite(amount as number) ? (amount as number) : null,
    currency: CODE_TO_CURRENCY[body.currencyCode ?? ""] ?? null,
    raw: body,
  };
}
