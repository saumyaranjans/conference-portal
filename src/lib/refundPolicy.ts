/**
 * GLOGIFT 27 registration refund policy.
 *
 * Kept as data rather than page copy for one reason: the delegate has to tick
 * a box saying they accept this, and what they accepted is written to their
 * registration row. If the wording lived in JSX it could be edited without
 * anyone noticing that consent recorded last month was consent to something
 * else. Everything the delegate reads — the registration page, the confirmation
 * — renders from here.
 *
 * Change POLICY_VERSION whenever a clause changes, so older registrations stay
 * attributable to the text that was actually shown.
 */

// 2027.2 — the conference-kit clause named on-site registrations only, which
// read as though online delegates were exempt. It now says both outright.
// Bumped rather than edited in place: consent already recorded against 2027.1
// was consent to the narrower wording, and must stay attributable to it.
export const REFUND_POLICY_VERSION = "2027.2";

/** The one circumstance in which money goes back. */
export const REFUND_EXCEPTION =
  "A refund is made only if the organisers cancel the conference on the " +
  "scheduled dates (25–27 February 2027) due to unforeseen circumstances.";

export const REFUND_POLICY_CLAUSES: string[] = [
  "Registration fees, once paid, cannot be refunded.",
  "A no-show will be treated as absent. No participation certificate will be issued.",
  "A no-show forfeits the conference kit, for both online and on-site registrations.",
  REFUND_EXCEPTION,
];

/** The sentence the delegate ticks. Deliberately short — the clauses above are
 *  displayed in full immediately next to it, so this is a confirmation that
 *  they were read, not a substitute for reading them. */
export const REFUND_POLICY_CONSENT =
  "I have read and accept the no-refund policy above.";

export const REFUND_POLICY_HEADING = "Refund policy";
