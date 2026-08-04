/**
 * GLOGIFT 2027 registration fees (per delegate), taken from the conference
 * brochure / landing page. Early-bird applies on or before 20 December 2026;
 * from 21 December 2026 the regular fee applies. GLOGIFT members receive a 15%
 * discount on the fee.
 *
 * Domestic categories are billed in INR; a Foreign Delegate is billed in USD
 * (the foreign academic rate).
 */
export const EARLY_BIRD_CUTOFF = "2026-12-20"; // inclusive — last early-bird day
export const GLOGIFT_MEMBER_DISCOUNT = 0.15;

type FeeRow = { currency: "INR" | "USD"; earlyBird: number; regular: number };

export const REGISTRATION_FEE_BY_CATEGORY: Record<string, FeeRow> = {
  "Faculty / Academician": { currency: "INR", earlyBird: 10000, regular: 11500 },
  "Industry Professional": { currency: "INR", earlyBird: 14000, regular: 16000 },
  "Research Scholar / PhD": { currency: "INR", earlyBird: 5000, regular: 6000 },
  "Student (UG/PG)": { currency: "INR", earlyBird: 3000, regular: 3500 },
  "Foreign Delegate": { currency: "USD", earlyBird: 350, regular: 375 },
};

export type RegistrationFee = {
  category: string | null;
  /** false when the category has no fee mapping (fee unknown). */
  known: boolean;
  tier: "early" | "regular";
  currency: "INR" | "USD";
  /** Fee before any member discount. */
  base: number;
  isMember: boolean;
  /** Amount discounted for a GLOGIFT member (0 otherwise). */
  discount: number;
  /** Amount actually payable. */
  amount: number;
};

/** Early bird through the end of 20 Dec 2026 (IST); regular from 21 Dec 2026. */
export function isEarlyBird(at?: Date): boolean {
  const now = at ?? new Date();
  return now.getTime() <= new Date(`${EARLY_BIRD_CUTOFF}T23:59:59+05:30`).getTime();
}

export function computeRegistrationFee(
  category: string | null,
  isMember: boolean,
  at?: Date
): RegistrationFee {
  const early = isEarlyBird(at);
  const tier = early ? "early" : "regular";
  const fee = category ? REGISTRATION_FEE_BY_CATEGORY[category] : undefined;
  if (!fee) {
    return { category, known: false, tier, currency: "INR", base: 0, isMember, discount: 0, amount: 0 };
  }
  const base = early ? fee.earlyBird : fee.regular;
  const discount = isMember ? Math.round(base * GLOGIFT_MEMBER_DISCOUNT) : 0;
  return { category, known: true, tier, currency: fee.currency, base, isMember, discount, amount: base - discount };
}

/** Fee for a SPECIFIC tier (regardless of today's date) — used when staff
 *  record which fee a delegate actually paid (Early Bird vs Regular). */
export function feeForTier(
  category: string | null,
  isMember: boolean,
  tier: "early" | "regular"
): { known: boolean; currency: "INR" | "USD"; base: number; discount: number; amount: number } {
  const fee = category ? REGISTRATION_FEE_BY_CATEGORY[category] : undefined;
  if (!fee) return { known: false, currency: "INR", base: 0, discount: 0, amount: 0 };
  const base = tier === "early" ? fee.earlyBird : fee.regular;
  const discount = isMember ? Math.round(base * GLOGIFT_MEMBER_DISCOUNT) : 0;
  return { known: true, currency: fee.currency, base, discount, amount: base - discount };
}

export function formatMoney(currency: "INR" | "USD", n: number): string {
  return (currency === "INR" ? "₹" : "$") + n.toLocaleString("en-IN");
}
