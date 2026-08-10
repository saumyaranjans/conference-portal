/**
 * GLOGIFT 27 registration fees (per delegate), taken from the conference
 * brochure / landing page. Early-bird applies on or before 20 December 2026;
 * from 21 December 2026 the regular fee applies. GIFT Society members receive a
 * 20% discount on the fee.
 *
 * Domestic categories are billed in INR; a Foreign Delegate is billed in USD
 * (the foreign academic rate).
 */
export const EARLY_BIRD_CUTOFF = "2026-12-20"; // inclusive — last early-bird day
export const GLOGIFT_MEMBER_DISCOUNT = 0.2;

/** The same figure as a whole number, for copy — so text cannot drift from maths. */
export const MEMBER_DISCOUNT_PERCENT = Math.round(GLOGIFT_MEMBER_DISCOUNT * 100);

type Tier = { earlyBird: number; regular: number };
type FeeRow = {
  currency: "INR" | "USD";
  earlyBird: number;
  regular: number;
  /** What the same category pays from outside India, in USD. */
  usd: Tier;
};

/**
 * Every category carries both an Indian and an international price.
 *
 * A single flat overseas rate was quoting one figure on the website and
 * charging another: the published table has always listed four different USD
 * prices, so an overseas student saw $90 and would have been billed the
 * faculty rate. The currency follows the country (see isForeignDelegate); the
 * category still decides the amount, in whichever currency applies.
 */
export const REGISTRATION_FEE_BY_CATEGORY: Record<string, FeeRow> = {
  "Faculty / Academician": {
    currency: "INR", earlyBird: 10000, regular: 11000,
    usd: { earlyBird: 300, regular: 350 },
  },
  "Industry Professional": {
    currency: "INR", earlyBird: 14000, regular: 16000,
    usd: { earlyBird: 425, regular: 450 },
  },
  "PhD / Research Scholars": {
    currency: "INR", earlyBird: 5000, regular: 6000,
    usd: { earlyBird: 150, regular: 200 },
  },
  "Student (UG/PG)": {
    currency: "INR", earlyBird: 3000, regular: 3500,
    usd: { earlyBird: 90, regular: 100 },
  },
  // Kept for records already carrying this category; priced as faculty.
  "Foreign Delegate": {
    currency: "USD", earlyBird: 300, regular: 350,
    usd: { earlyBird: 300, regular: 350 },
  },
};

/** The host country. Anyone registering from elsewhere pays the USD rate. */
export const HOME_COUNTRY = "India";

/**
 * Whether someone is billed as a foreign delegate.
 *
 * Decided by the country on their profile, not by a category they pick for
 * themselves: "Foreign Delegate" was never a description of what somebody does,
 * it overlapped every other category, and asking people to self-declare it
 * produced a field that was wrong as often as it was right.
 *
 * An unknown country is treated as domestic. The overwhelming majority of
 * registrations are Indian, and quoting rupees to someone who turns out to be
 * overseas is corrected at the desk; quoting dollars to an Indian scholar is a
 * much worse first impression.
 */
/**
 * Spellings of the host country that people actually type. The field is free
 * text, so an exact match on "India" alone would bill a delegate from Bharat or
 * INDIA. at the international rate. Erring towards "domestic" is deliberate:
 * under-charging an Indian delegate is recoverable at the desk, wrongly
 * charging one in dollars is not.
 */
const HOME_COUNTRY_ALIASES = new Set([
  "india", "bharat", "bharath", "hindustan", "republic of india",
  "india.", "indian", "in", "ind",
]);

export function isForeignDelegate(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toLowerCase().replace(/[.\s]+$/, "");
  if (!c) return false;
  return !HOME_COUNTRY_ALIASES.has(c);
}

/** The amounts that apply to a category once the country decides the currency. */
function priceOf(
  category: string | null,
  country?: string | null
): { currency: "INR" | "USD"; earlyBird: number; regular: number } | undefined {
  const row = category ? REGISTRATION_FEE_BY_CATEGORY[category] : undefined;
  if (!row) return undefined;
  return isForeignDelegate(country)
    ? { currency: "USD", earlyBird: row.usd.earlyBird, regular: row.usd.regular }
    : { currency: row.currency, earlyBird: row.earlyBird, regular: row.regular };
}

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
  at?: Date,
  /** Country from the profile. Anything other than India bills in USD. */
  country?: string | null
): RegistrationFee {
  const early = isEarlyBird(at);
  const tier = early ? "early" : "regular";
  const fee = priceOf(category, country);
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
  tier: "early" | "regular",
  /** Country from the profile. Anything other than India bills in USD. */
  country?: string | null
): { known: boolean; currency: "INR" | "USD"; base: number; discount: number; amount: number } {
  const fee = priceOf(category, country);
  if (!fee) return { known: false, currency: "INR", base: 0, discount: 0, amount: 0 };
  const base = tier === "early" ? fee.earlyBird : fee.regular;
  const discount = isMember ? Math.round(base * GLOGIFT_MEMBER_DISCOUNT) : 0;
  return { known: true, currency: fee.currency, base, discount, amount: base - discount };
}

export function formatMoney(currency: "INR" | "USD", n: number): string {
  return (currency === "INR" ? "₹" : "$") + n.toLocaleString("en-IN");
}
