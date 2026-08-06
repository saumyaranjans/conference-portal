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

/* --------------------------------------------------------- thin tracks --- */

type TrackGroup = {
  trackIds: string[];
  trackCodes: string[];
  trackNames: string[];
  mode: "onsite" | "online";
  papers: AllocPaper[];
};

/** How alike two groups of papers are, by their combined topic text. */
function groupSimilarity(a: TrackGroup, b: TrackGroup): number {
  const text = (g: TrackGroup) =>
    `${g.trackNames.join(" ")} ${g.papers.map(topicText).join(" ")}`;
  return textSimilarity(text(a), text(b));
}

/**
 * Join tracks too thin to fill a session with their closest topical neighbour.
 *
 * A track that attracts two papers cannot form a session on its own, and an
 * audience is better served by one coherent session of five than by two of two.
 * Merging is deliberately conservative: only groups BELOW the minimum look for
 * a partner, the partner must be in the same mode, and the pair must still fit
 * one session — so a healthy track is never dragged into someone else's.
 *
 * Repeats while it can, so three thin tracks can converge into one session.
 */
function mergeThinTrackGroups(
  groups: TrackGroup[],
  maxPerSession: number
): TrackGroup[] {
  const out = [...groups];

  for (;;) {
    const thin = out
      .map((g, i) => ({ g, i }))
      .filter(({ g }) => g.papers.length < MIN_PAPERS_PER_SESSION);
    if (thin.length === 0) break;

    let best: { a: number; b: number; score: number } | null = null;
    for (const { g: ga, i: ia } of thin) {
      for (let ib = 0; ib < out.length; ib++) {
        if (ib === ia) continue;
        const gb = out[ib];
        if (gb.mode !== ga.mode) continue; // on-site and online never merge
        if (ga.papers.length + gb.papers.length > maxPerSession) continue;
        const score = groupSimilarity(ga, gb);
        if (!best || score > best.score) best = { a: ia, b: ib, score };
      }
    }
    if (!best) break;

    const a = out[best.a];
    const b = out[best.b];
    const merged: TrackGroup = {
      trackIds: [...new Set([...a.trackIds, ...b.trackIds])],
      trackCodes: [...new Set([...a.trackCodes, ...b.trackCodes])],
      trackNames: [...new Set([...a.trackNames, ...b.trackNames])],
      mode: a.mode,
      papers: [...a.papers, ...b.papers],
    };
    // Remove both, append the merger.
    const drop = new Set([best.a, best.b]);
    const next = out.filter((_, i) => !drop.has(i));
    next.push(merged);
    out.length = 0;
    out.push(...next);
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
  opts: { maxPerSession?: number; mergeThinTracks?: boolean } = {}
): ProgrammePlan {
  const maxPerSession = Math.min(
    Math.max(opts.maxPerSession ?? MAX_PAPERS_PER_SESSION, MIN_PAPERS_PER_SESSION),
    ABSOLUTE_MAX_PAPERS
  );
  const mergeThin = opts.mergeThinTracks ?? true;
  const notes: string[] = [];

  // Group by track + mode. On-site and online never merge: they are different
  // rooms, and a delegate attending one cannot step into the other.
  const groups = new Map<string, TrackGroup>();
  for (const p of papers) {
    const key = `${p.trackId}|${p.mode}`;
    const g = groups.get(key) ?? {
      trackIds: [p.trackId],
      trackCodes: [p.trackCode],
      trackNames: [p.trackName],
      mode: p.mode,
      papers: [],
    };
    g.papers.push(p);
    groups.set(key, g);
  }

  let working = [...groups.values()];
  if (mergeThin) {
    const before = working.length;
    working = mergeThinTrackGroups(working, maxPerSession);
    const merged = before - working.length;
    if (merged > 0) {
      notes.push(
        `${merged} thin track${merged === 1 ? "" : "s"} joined with their closest neighbour to reach a workable session size.`
      );
    }
  }

  const draft: PlannedSession[] = [];
  for (const group of working) {
    const ordered = orderByTopic(group.papers);
    const chunks = chunkEvenly(ordered, maxPerSession);
    const modeLabel = group.mode === "onsite" ? "On-site" : "Online";
    const joint = group.trackNames.length > 1;
    // Track names already contain ampersands ("Analytics, Big Data &
    // Intelligent Systems"), so joining them with another one produces an
    // unreadable run-on. A joint session is billed by its track codes and
    // carries the full names underneath.
    const label = joint
      ? `Joint Session · ${group.trackCodes.join(" · ")}`
      : group.trackNames[0];
    const codeLabel = group.trackCodes.join("+");

    chunks.forEach((chunk, i) => {
      draft.push({
        key: `${group.trackIds.join("+")}|${group.mode}|${i + 1}`,
        title: `${label} — ${modeLabel} Session ${i + 1}`,
        // The first track owns the session for filing purposes; the title
        // carries the joint billing.
        trackId: group.trackIds[0],
        trackCode: codeLabel,
        trackName: label,
        mode: group.mode,
        sessionDate: null,
        timeSlot: null,
        papers: chunk,
      });

      if (chunk.length < MIN_PAPERS_PER_SESSION) {
        notes.push(
          `${codeLabel} ${modeLabel} Session ${i + 1} holds only ${chunk.length} paper${
            chunk.length === 1 ? "" : "s"
          } — below the ${MIN_PAPERS_PER_SESSION}-paper minimum, and there is nothing close enough left to join it with.`
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
