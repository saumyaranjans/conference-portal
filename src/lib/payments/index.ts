/**
 * Which gateway the portal is talking to.
 *
 * Decided by the payment_gateway_config row, falling back to PAYMENT_PROVIDER
 * in the environment. "None" is a supported state rather than a
 * misconfiguration: the registration page still works, it simply tells the
 * delegate that payment is not open and offers no Pay button.
 */

import { gatewayConfig } from "./config";
import { iciciProvider } from "./icici";
import { orangeProvider } from "./orange";
import { sandboxProvider } from "./sandbox";
import type { PaymentProvider } from "./types";

export * from "./types";
export { gatewayConfig, orangeCredentialsFrom } from "./config";

function providerFor(id: string): PaymentProvider | null {
  switch (id.trim()) {
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

export async function paymentProvider(): Promise<PaymentProvider | null> {
  return providerFor((await gatewayConfig()).provider);
}

/** True when the gateway in use is the test stand-in, so the UI can say so
 *  rather than letting anyone believe a real payment was taken. */
export async function paymentsAreSandbox(): Promise<boolean> {
  return (await gatewayConfig()).provider.trim() === "sandbox";
}

/**
 * True only when a provider is selected, holds every credential, AND has been
 * switched on.
 *
 * The enabled flag is deliberate. Credentials arrive over several sittings
 * during onboarding, and a gateway must not start taking money the moment the
 * last field happens to be filled in — someone decides that.
 */
export async function paymentsOpen(): Promise<boolean> {
  const config = await gatewayConfig();
  if (!config.enabled) return false;
  const provider = providerFor(config.provider);
  return !!provider && (await provider.isConfigured());
}

/** What to tell a delegate when payments are not open. */
export async function paymentsClosedMessage(): Promise<string> {
  return providerFor((await gatewayConfig()).provider)
    ? "Online payment is being set up with ICICI Bank and will open shortly. " +
        "Your registration details are saved — you will be emailed as soon as " +
        "the payment link is live."
    : "Online payment is not open yet. Your registration details are saved — " +
        "you will be emailed as soon as the ICICI Bank payment link is live.";
}
