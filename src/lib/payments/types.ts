/**
 * The seam between "a delegate owes us money" and "a bank took it".
 *
 * The portal talks to this interface and never to a gateway directly, because
 * the gateway is not settled yet: ICICI fronts more than one product (Eazypay
 * on its own rails, CCAvenue as an aggregator) and they agree on nothing —
 * not the request encoding, not the signature algorithm, not the callback
 * shape. Everything above this file is written once; only the adapter changes.
 */

export type Currency = "INR" | "USD";

/** What we ask the gateway to collect. Amounts are whole currency units. */
export type PaymentOrder = {
  /** Our reference. Unique, echoed back by the gateway, safe to show a human. */
  orderId: string;
  amount: number;
  currency: Currency;
  description: string;
  payer: {
    name: string;
    email: string;
    mobile: string;
    country: string;
  };
  /** Where the gateway sends the delegate's browser when it is finished. */
  returnUrl: string;
};

/**
 * How to hand the delegate over.
 *
 * `redirect` is a plain GET. `post` is a self-submitting form, which is what
 * the Indian bank gateways generally want — the signed fields go in the body,
 * not the query string, so they never land in a browser history or a proxy log.
 */
export type Checkout =
  | { method: "redirect"; url: string }
  | { method: "post"; url: string; fields: Record<string, string> };

/** What the adapter makes of whatever the gateway sent back. */
export type PaymentResult = {
  orderId: string;
  status: "paid" | "failed" | "cancelled" | "pending";
  /** The gateway's transaction id, when it supplied one. */
  providerRef: string | null;
  /** As reported by the GATEWAY, for comparison against what we asked for. */
  amount: number | null;
  currency: Currency | null;
  /** The raw payload, stored verbatim for reconciliation. */
  raw: Record<string, unknown>;
};

export interface PaymentProvider {
  /** Stable id written to payment_orders.provider. */
  readonly id: string;
  /** Shown to staff and delegates, e.g. "ICICI Bank (Eazypay)". */
  readonly label: string;
  /** False when credentials are missing, so the UI can say so instead of
   *  offering a button that leads nowhere. */
  isConfigured(): boolean;
  /** Build the hand-off. Must sign/encrypt per the provider's spec. */
  createCheckout(order: PaymentOrder): Promise<Checkout>;
  /**
   * Verify and decode a callback.
   *
   * MUST reject anything whose signature does not check out — a gateway
   * callback is an untrusted HTTP request that anyone can forge, and this
   * function is the only thing standing between a forged POST and a
   * registration marked paid. Throw rather than returning a "paid" it is
   * not certain of.
   */
  verifyCallback(payload: Record<string, string>): Promise<PaymentResult>;
}

/** Thrown when a provider is asked to work without credentials. */
export class PaymentNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentNotConfiguredError";
  }
}
