/**
 * When abstract submission is open.
 *
 * The site advertises a closing date, but until now only the manual `is_open`
 * toggle actually stopped anything: `submission_deadline` was stored, shown in
 * the admin screen, and read by nothing. That leaves the conference relying on
 * somebody flipping a switch at the right minute on the right evening, and
 * quietly accepting late papers whenever that slips.
 *
 * The deadline is a calendar date, and a date means the whole of that day in
 * the conference's own timezone: a paper filed at 23:30 IST on the closing date
 * is on time. IST is fixed at UTC+5:30 with no daylight saving, so the offset
 * is a constant rather than a lookup.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type SubmissionWindow = {
  is_open: boolean;
  submission_deadline: string | null;
};

/**
 * The instant a deadline date stops accepting papers: midnight at the END of
 * that day, IST. Returns null when no deadline is set, meaning "no cutoff".
 */
export function deadlineInstant(deadline: string | null): Date | null {
  if (!deadline) return null;
  // Accept both "2026-11-23" and a full timestamp, taking the date part.
  const day = deadline.slice(0, 10);
  const midnightUtc = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(midnightUtc)) return null;
  // End of that IST day = next midnight IST = day+1 00:00 IST = day 18:30 UTC.
  return new Date(midnightUtc + 86400000 - IST_OFFSET_MS);
}

/** True when the deadline has passed. False when there is no deadline. */
export function deadlinePassed(
  deadline: string | null,
  now: Date = new Date()
): boolean {
  const closes = deadlineInstant(deadline);
  return closes !== null && now.getTime() >= closes.getTime();
}

/** A conference accepts new abstracts only if it is open AND within the date. */
export function acceptingAbstracts(
  conference: SubmissionWindow,
  now: Date = new Date()
): boolean {
  if (!conference.is_open) return false;
  return !deadlinePassed(conference.submission_deadline, now);
}

/** "23 November 2026" — for telling an author exactly what they missed. */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "";
  const d = new Date(`${deadline.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return deadline;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The message an author sees when they arrive after the cutoff. */
export function closedMessage(conference: SubmissionWindow): string {
  if (conference.submission_deadline && deadlinePassed(conference.submission_deadline)) {
    return `Abstract submission closed on ${formatDeadline(
      conference.submission_deadline
    )}. The portal is no longer accepting new abstracts.`;
  }
  return "Submissions are closed. No conference is currently accepting papers.";
}
