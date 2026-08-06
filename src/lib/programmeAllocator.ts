import { textSimilarity } from "@/lib/types";

/**
 * Builds the conference programme: which accepted papers sit in which session,
 * on which day, in which slot.
 *
 * Kept as a pure function over plain data — no database, no I/O — so the
 * arrangement can be produced, inspected and re-produced deterministically. The
 * caller fetches, calls this, shows the Convener the result, and only writes
 * once it is approved.
 */

export const PROGRAMME_DAYS = ["2027-02-25", "2027-02-26", "2027-02-27"] as const;
export const PROGRAMME_SLOTS = [
  "10:00 – 11:30",
  "12:00 – 13:30",
  "14:30 – 16:00",
  "16:30 – 18:00",
] as const;

/** A session normally holds three to five papers. */
export const MIN_PAPERS_PER_SESSION = 3;
export const MAX_PAPERS_PER_SESSION = 5;
/** The Convener may stretch a single session to six in a special case. */
export const ABSOLUTE_MAX_PAPERS = 6;

export type AllocPaper = {
  submissionId: string;
  paperId: string;
  title: string;
  keywords: string[];
  trackId: string;
  trackCode: string;
  trackName: string;
  mode: "onsite" | "online";
  /** Everyone on the paper — corresponding and co-authors alike. A conflict is
   *  about a person being in two rooms at once, so authorship role is
   *  irrelevant here; presence is what counts. */
  personKeys: string[];
};

export type PlannedSession = {
  key: string;
  title: string;
  trackId: string;
  trackCode: string;
  trackName: string;
  mode: "onsite" | "online";
  sessionDate: string | null;
  timeSlot: string | null;
  papers: AllocPaper[];
  /** Why this session could not be placed, when it could not. */
  warning?: string;
};

export type ProgrammePlan = {
  sessions: PlannedSession[];
  unplaced: PlannedSession[];
  notes: string[];
};

/* ------------------------------------------------------------------ text --- */

/** What a paper is "about", for grouping. Keywords carry the most signal, so
 *  they are weighted by repetition; the title fills in when keywords are thin. */
function topicText(p: AllocPaper): string {
  const kw = p.keywords.filter(Boolean).join(" ");
  return `${kw} ${kw} ${p.title}`.toLowerCase();
}

/**
 * Order papers so neighbours are about similar things: start from the paper
 * least like the others (so outliers open rather than break a run), then keep
 * taking whichever unplaced paper is closest to the one just placed.
 *
 * A greedy chain rather than true clustering — with a few dozen papers per
 * track the difference is invisible, and this stays explainable to a Convener
 * asking why two papers ended up together.
 */
function orderByTopic(papers: AllocPaper[]): AllocPaper[] {
  if (papers.length <= 2) return [...papers];

  const text = new Map(papers.map((p) => [p.submissionId, topicText(p)]));
  const sim = (a: AllocPaper, b: AllocPaper) =>
    textSimilarity(text.get(a.submissionId) ?? "", text.get(b.submissionId) ?? "");

  // Seed with the paper whose average similarity to the rest is lowest.
  let seed = papers[0];
  let worst = Infinity;
  for (const p of papers) {
    const avg =
      papers.reduce((acc, q) => (q === p ? acc : acc + sim(p, q)), 0) /
      Math.max(1, papers.length - 1);
    if (avg < worst) {
      worst = avg;
      seed = p;
    }
  }

  const ordered: AllocPaper[] = [seed];
  const remaining = papers.filter((p) => p !== seed);
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < remaining.length; i++) {
      const s = sim(last, remaining[i]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/**
 * Split an ordered run into session-sized pieces, evenly.
 *
 * Chunking greedily at the maximum would leave the tail short — eleven papers
 * would give 5, 5, 1 — so the count is decided first and the papers shared out
 * as evenly as it allows. Eleven becomes 4, 4, 3.
 */
function chunkEvenly(papers: AllocPaper[], maxPerSession: number): AllocPaper[][] {
  const n = papers.length;
  if (n === 0) return [];
  if (n <= maxPerSession) return [papers];

  const count = Math.ceil(n / maxPerSession);
  const base = Math.floor(n / count);
  let extra = n % count;

  const out: AllocPaper[][] = [];
  let i = 0;
  for (let s = 0; s < count; s++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    out.push(papers.slice(i, i + size));
    i += size;
  }
  return out;
}

/* ------------------------------------------------------------ scheduling --- */

type SlotKey = string;
const slotKey = (day: string, slot: string): SlotKey => `${day}|${slot}`;

/**
 * Place sessions into day/slot pairs so that nobody has to be in two rooms at
 * once.
 *
 * The constraint is on DISTINCT SESSIONS sharing a day and slot: two papers by
 * the same person inside ONE session are fine — same room, they simply present
 * twice — while the same person in two sessions at the same time is impossible
 * however the tracks are arranged.
 *
 * Sessions are placed largest-first, since a session with many authors is the
 * hardest to fit and should get first pick of the grid.
 */
function placeSessions(
  sessions: PlannedSession[],
  slots: SlotKey[]
): { placed: PlannedSession[]; unplaced: PlannedSession[] } {
  // Who is already committed in each slot, and how loaded each slot is.
  const peopleInSlot = new Map<SlotKey, Set<string>>();
  const loadInSlot = new Map<SlotKey, number>();
  for (const s of slots) {
    peopleInSlot.set(s, new Set());
    loadInSlot.set(s, 0);
  }

  const order = [...sessions].sort(
    (a, b) => sessionPeople(b).size - sessionPeople(a).size
  );

  const placed: PlannedSession[] = [];
  const unplaced: PlannedSession[] = [];

  for (const session of order) {
    const people = sessionPeople(session);

    // Prefer the emptiest slot that nobody in this session is already booked
    // into, so the programme spreads rather than piling onto day one.
    const candidates = slots
      .filter((s) => {
        const taken = peopleInSlot.get(s)!;
        for (const person of people) if (taken.has(person)) return false;
        return true;
      })
      .sort((a, b) => (loadInSlot.get(a) ?? 0) - (loadInSlot.get(b) ?? 0));

    const chosen = candidates[0];
    if (!chosen) {
      unplaced.push({
        ...session,
        warning:
          "No day and slot leaves every author free — an author here is already presenting in every slot. Move a paper or add a slot.",
      });
      continue;
    }

    const [day, slot] = chosen.split("|");
    const taken = peopleInSlot.get(chosen)!;
    for (const person of people) taken.add(person);
    loadInSlot.set(chosen, (loadInSlot.get(chosen) ?? 0) + 1);

    placed.push({ ...session, sessionDate: day, timeSlot: slot });
  }

  return { placed, unplaced };
}

function sessionPeople(s: PlannedSession): Set<string> {
  const set = new Set<string>();
  for (const p of s.papers) for (const k of p.personKeys) set.add(k);
  return set;
}

/* ---------------------------------------------------------------- public --- */

/**
 * Produce a full programme from the eligible papers.
 *
 * Papers are grouped by track and mode — an on-site and an online session are
 * different rooms and cannot be merged — then ordered by topic, cut into
 * sessions, and placed on the grid.
 */
export function buildProgramme(
  papers: AllocPaper[],
  opts: { maxPerSession?: number } = {}
): ProgrammePlan {
  const maxPerSession = Math.min(
    Math.max(opts.maxPerSession ?? MAX_PAPERS_PER_SESSION, MIN_PAPERS_PER_SESSION),
    ABSOLUTE_MAX_PAPERS
  );
  const notes: string[] = [];

  // Group by track + mode.
  const groups = new Map<string, AllocPaper[]>();
  for (const p of papers) {
    const key = `${p.trackId}|${p.mode}`;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }

  const draft: PlannedSession[] = [];
  for (const [, group] of groups) {
    const ordered = orderByTopic(group);
    const chunks = chunkEvenly(ordered, maxPerSession);
    const first = group[0];

    chunks.forEach((chunk, i) => {
      const modeLabel = first.mode === "onsite" ? "On-site" : "Online";
      draft.push({
        key: `${first.trackId}|${first.mode}|${i + 1}`,
        title: `${first.trackName} — ${modeLabel} Session ${i + 1}`,
        trackId: first.trackId,
        trackCode: first.trackCode,
        trackName: first.trackName,
        mode: first.mode,
        sessionDate: null,
        timeSlot: null,
        papers: chunk,
      });

      if (chunk.length < MIN_PAPERS_PER_SESSION) {
        notes.push(
          `${first.trackCode} ${modeLabel} Session ${i + 1} holds only ${chunk.length} paper${
            chunk.length === 1 ? "" : "s"
          } — below the ${MIN_PAPERS_PER_SESSION}-paper minimum, because that is all the track has.`
        );
      }
    });
  }

  const slots: SlotKey[] = [];
  for (const day of PROGRAMME_DAYS)
    for (const slot of PROGRAMME_SLOTS) slots.push(slotKey(day, slot));

  const { placed, unplaced } = placeSessions(draft, slots);

  placed.sort(
    (a, b) =>
      (a.sessionDate ?? "").localeCompare(b.sessionDate ?? "") ||
      PROGRAMME_SLOTS.indexOf(a.timeSlot as any) -
        PROGRAMME_SLOTS.indexOf(b.timeSlot as any) ||
      a.trackCode.localeCompare(b.trackCode)
  );

  if (unplaced.length) {
    notes.push(
      `${unplaced.length} session${unplaced.length === 1 ? "" : "s"} could not be placed without clashing with an author's other presentation.`
    );
  }

  return { sessions: placed, unplaced, notes };
}

/**
 * Every clash in a proposed programme: a person appearing in two different
 * sessions that share a day and slot.
 *
 * Run over the Convener's hand-edited arrangement too, not just the generated
 * one — the point is to catch a clash however it arose.
 */
export function findConflicts(
  sessions: {
    id?: string;
    title: string;
    sessionDate: string | null;
    timeSlot: string | null;
    papers: { paperId: string; personKeys: string[]; personNames?: string[] }[];
  }[]
): { person: string; slot: string; sessions: string[]; papers: string[] }[] {
  const bySlot = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!s.sessionDate || !s.timeSlot) continue;
    const key = slotKey(s.sessionDate, s.timeSlot);
    bySlot.set(key, [...(bySlot.get(key) ?? []), s]);
  }

  const clashes: {
    person: string;
    slot: string;
    sessions: string[];
    papers: string[];
  }[] = [];

  for (const [key, group] of bySlot) {
    if (group.length < 2) continue; // one room, no clash possible
    const seen = new Map<string, { sessions: Set<string>; papers: Set<string> }>();
    for (const s of group) {
      for (const p of s.papers) {
        for (const person of p.personKeys) {
          const rec = seen.get(person) ?? { sessions: new Set(), papers: new Set() };
          rec.sessions.add(s.title);
          rec.papers.add(p.paperId);
          seen.set(person, rec);
        }
      }
    }
    for (const [person, rec] of seen) {
      // Two papers inside ONE session is not a clash — same room.
      if (rec.sessions.size > 1) {
        clashes.push({
          person,
          slot: key.replace("|", " · "),
          sessions: [...rec.sessions],
          papers: [...rec.papers],
        });
      }
    }
  }
  return clashes;
}
