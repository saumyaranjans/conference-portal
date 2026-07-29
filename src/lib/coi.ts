/**
 * Conflict-of-interest matching, shared by the server actions and the pages
 * that build "who may handle this paper" lists. Mirrors the rule enforced in
 * the database by edits_submission(): an author never acts on their own paper.
 */

/** Loose comparison key — case, spacing and punctuation are noise here. */
export function coiKey(v?: string | null): string {
  return (v ?? "")
    .toLowerCase()
    .replace(/[.,()&'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type CoiPerson = {
  full_name?: string | null;
  email?: string | null;
  affiliation?: string | null;
};

/**
 * True when this person is an author of the paper — matched by email, or by
 * name and affiliation together, which catches an author who signed up under
 * a second address.
 */
export function isAuthorOf(person: CoiPerson, authors: CoiPerson[]): boolean {
  const email = coiKey(person.email);
  const name = coiKey(person.full_name);
  const affil = coiKey(person.affiliation);

  return authors.some((a) => {
    if (email && email === coiKey(a.email)) return true;
    return Boolean(
      name && affil && name === coiKey(a.full_name) && affil === coiKey(a.affiliation)
    );
  });
}
