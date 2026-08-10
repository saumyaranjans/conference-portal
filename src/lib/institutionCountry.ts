import { COUNTRIES } from "@/lib/types";

/** Spellings people actually use for the host country. */
const HOME_COUNTRY_ALIASES = new Set(["india", "bharat", "republic of india"]);

/**
 * Cross-checking the country someone declares against the country implied by
 * their institution.
 *
 * The institution typeahead stores what the visitor picked, and both the ROR
 * lookup and the offline list format their suggestions as
 * "Name, Country" — so the country is usually recoverable from the stored
 * string. It is not always: the curated Indian entries are plain names
 * ("Indian Institute of Management Sambalpur") or carry a city
 * ("Indian Institute of Science, Bangalore"), and anyone may type freehand.
 *
 * So this reports a mismatch only when it can name a country with confidence,
 * and stays silent otherwise. A check that guesses would flag honest entries
 * and train the Editorial Office to ignore it.
 */

const COUNTRY_LOOKUP = new Map<string, string>(
  COUNTRIES.map((c) => [c.toLowerCase(), c])
);

/** Normalise the spellings people actually use for the host country. */
function canonical(name: string): string {
  const k = name.trim().toLowerCase();
  if (HOME_COUNTRY_ALIASES.has(k)) return "India";
  return COUNTRY_LOOKUP.get(k) ?? "";
}

/**
 * The country implied by an institution string, or "" when it cannot be told.
 * Only the segment after the final comma is considered a country candidate.
 */
export function institutionCountry(institution: string | null | undefined): string {
  const s = (institution ?? "").trim();
  if (!s.includes(",")) return "";
  const tail = s.slice(s.lastIndexOf(",") + 1).trim();
  if (!tail) return "";
  return canonical(tail);
}

export type CountryCheck = {
  /** True only when both countries are known AND they disagree. */
  mismatch: boolean;
  /** The country derived from the institution ("" when undeterminable). */
  fromInstitution: string;
  declared: string;
};

export function checkCountry(
  declaredCountry: string | null | undefined,
  institution: string | null | undefined
): CountryCheck {
  const declared = canonical(declaredCountry ?? "");
  const fromInstitution = institutionCountry(institution);
  return {
    mismatch: Boolean(declared && fromInstitution && declared !== fromInstitution),
    fromInstitution,
    declared,
  };
}
