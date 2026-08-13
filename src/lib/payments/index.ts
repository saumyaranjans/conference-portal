/**
 * Which gateway the portal is talking to, decided by PAYMENT_PROVIDER.
 *
 * Unset means "no online payment yet", which is a supported state rather than
 * a misconfiguration: the registration page still works, it just tells the
 * delegate that payment is not open and does not offer a Pay button.
 */

import { iciciProvider } from "./icici";
import { orangeProvider } from "./orange";
import { sandboxProvider } from "./sandbox";
import type { PaymentProvider } from "./types";

export * from "./types";

export function paymentProvider(): PaymentProvider | null {
  switch ((process.env.PAYMENT_PROVIDER ?? "").trim()) {
    case "icici_eazypay":
      return iciciProvider("icici_eazypay");
    case "icici_ccavenue":
      return iciciProvider("icici_ccavenue");
    // The product ICICI actually offered: REST/JSON, HMAC-SHA256 over values
    // ordered by field name. See orange.ts.
    case "icici_orange":
      return orangeProvider();
    // A stand-in bank for testing the flow end to end before ICICI is wired.
    // Refuses to run in production without an explicit override — see
    // sandbox.ts.
    case "sandbox":
      return sandboxProvider();
    default:
      return null;
  }
}

/** True when the gateway in use is the test stand-in, so the UI can say so
 *  rather than letting anyone believe a real payment was taken. */
export function paymentsAreSandbox(): boolean {
  return (process.env.PAYMENT_PROVIDER ?? "").trim() === "sandbox";
}

/** True only when a provider is selected AND holds every credential. */
export function paymentsOpen(): boolean {
  const p = paymentProvider();
  return !!p && p.isConfigured();
}

/** What to tell a delegate when payments are not open. */
export function paymentsClosedMessage(): string {
  return paymentProvider()
    ? "Online payment is being set up with ICICI Bank and will open shortly. " +
        "Your registration details are saved — you will be emailed as soon as " +
        "the payment link is live."
    : "Online payment is not open yet. Your registration details are saved — " +
        "you will be emailed as soon as the ICICI Bank payment link is live.";
}
