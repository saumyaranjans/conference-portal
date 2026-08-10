/**
 * Which gateway the portal is talking to, decided by PAYMENT_PROVIDER.
 *
 * Unset means "no online payment yet", which is a supported state rather than
 * a misconfiguration: the registration page still works, it just tells the
 * delegate that payment is not open and does not offer a Pay button.
 */

import { iciciProvider } from "./icici";
import type { PaymentProvider } from "./types";

export * from "./types";

export function paymentProvider(): PaymentProvider | null {
  switch ((process.env.PAYMENT_PROVIDER ?? "").trim()) {
    case "icici_eazypay":
      return iciciProvider("icici_eazypay");
    case "icici_ccavenue":
      return iciciProvider("icici_ccavenue");
    default:
      return null;
  }
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
