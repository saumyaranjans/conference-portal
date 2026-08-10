import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  formatDate,
} from "@/components/ui/Primitives";
import {
  MAX_SUBMISSIONS_PER_AUTHOR,
  isPresentable,
  versionTag,
  type Submission,
  type SubmissionStatus,
} from "@/lib/types";
import { MyCertificates } from "@/components/MyCertificates";
import { RegistrationStatus } from "@/components/RegistrationStatus";
import { CancelFullPaperButton } from "@/components/CancelFullPaperButton";
import { listMyCertificates, certificatesReleased } from "@/lib/certificateAccess";

type Row = Submission & { tracks: { name: string } | null };

/** A submission row tagged with the viewer's role on it. */
type TaggedRow = Row & { _role: "corresponding" | "coauthor" };

/** A folder's inclusion rule over the author's submissions. */
type Predicate = (s: Row) => boolean;

const isProcessing = (s: Row) =>
  s.status === "submitted" || s.status === "under_review";

/**
 * Pathway of a submission, from its (fixed) submission_type. Abstract-stage
 * submissions are Pathway A; full-paper submissions are Pathway B. The label
 * stays the same through every status, so an abstract in review and an
 * accepted abstract both read "Pathway A".
 */
const pathwayOf = (s: Row) =>
  (s as unknown as { submission_type: string }).submission_type ===
  "full_paper_presentation"
    ? {
        label: "Pathway B",
        cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
      }
    : {
        label: "Pathway A",
        cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      };

const FOLDERS: Record<string, { label: string; match: Predicate }> = {
  // New submissions
  incomplete: { label: "Incomplete Submissions", match: (s) => s.status === "draft" },
  new_processing: {
    label: "Submissions Being Processed",
    match: (s) => isProcessing(s) && s.version === 1,
  },
  // Revisions
  needing_revision: {
    label: "Submissions Needing Revision",
    match: (s) => s.status === "revisions_requested",
  },
  rev_processing: {
    label: "Revisions Being Processed",
    match: (s) => isProcessing(s) && s.version > 1,
  },
  // Completed
  accepted: { label: "Accepted", match: (s) => s.status === "accepted" },
  not_accepted: { label: "Not Accepted", match: (s) => s.status === "rejected" },
  withdrawn: { label: "Withdrawn", match: (s) => s.status === "withdrawn" },
};

const GROUPS: { title: string; keys: (keyof typeof FOLDERS)[] }[] = [
  { title: "New Submissions", keys: ["incomplete", "new_processing"] },
  { title: "Revisions", keys: ["needing_revision", "rev_processing"] },
  { title: "Completed", keys: ["accepted", "not_accepted", "withdrawn"] },
];

/** Pathway B folder labels — the same folders, with "Manuscript" wording. */
const FOLDER_LABELS_B: Record<keyof typeof FOLDERS, string> = {
  incomplete: "Incomplete Manuscripts",
  new_processing: "Manuscripts Being Processed",
  needing_revision: "Manuscripts Needing Revision",
  rev_processing: "Revisions Being Processed",
  accepted: "Accepted",
  not_accepted: "Not Accepted",
  withdrawn: "Withdrawn",
};

/**
 * The status a submission presents inside each dashboard's folders.
 *
 * Pathway A tracks every paper's ABSTRACT journey. A full-paper (Pathway B)
 * paper whose abstract has cleared review reads "accepted" here — that Accepted
 * count is exactly what gates the manuscript window. A paper still in its
 * abstract phase (or an abstract-only paper) uses its live status.
 *
 * Pathway B tracks the MANUSCRIPT journey — only full-paper papers past abstract
 * acceptance. The abstract_accepted "to submit" state lives in the Submit New
 * Manuscript window, not a folder, so it returns null here.
 *
 * Returns null when the paper does not belong in that dashboard's folders.
 */
function phaseFor(
  s: Row,
  pw: "A" | "B"
): { status: SubmissionStatus; version: number } | null {
  const type = (s as unknown as { submission_type: string }).submission_type;
  const stage = (s as unknown as { stage: string }).stage;
  const status = s.status;
  const abstractCleared =
    type === "full_paper_presentation" &&
    (status === "abstract_accepted" || stage === "full_paper");

  if (pw === "A") {
    // Abstract journey. Once the abstract clears, it stays "Accepted" here —
    // whatever later happens to the manuscript is Pathway B's story.
    if (abstractCleared) return { status: "accepted", version: 1 };
    return { status, version: s.version };
  }

  // Manuscript journey.
  if (type !== "full_paper_presentation") return null;
  if (status === "abstract_accepted") return null; // to-submit → in the window
  if (stage === "full_paper") return { status, version: s.version };
  return null;
}

/** True if any submission has reached the manuscript (Pathway B) phase. */
const hasManuscriptFolders = (subs: Row[]) =>
  subs.some((s) => phaseFor(s, "B") !== null);

function FolderRow({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  const linkable = count > 0;
  return (
    <div
      className={`flex items-baseline gap-2 px-4 py-2.5 rounded-lg ${
        active ? "bg-blue-50" : ""
      }`}
    >
      {linkable ? (
        <Link href={href} className="text-blue-700 hover:underline">
          {label}
        </Link>
      ) : (
        <span className="text-slate-700">{label}</span>
      )}
      <span className="text-emerald-700 text-sm font-medium">({count})</span>
    </div>
  );
}

export default async function AuthorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; pw?: string }>;
}) {
  const { folder, pw } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const admin = createAdminClient();

  // One parallel wave: the certificates box, the author's own submissions and
  // their co-author links only need profile.id — serializing them (the old
  // code) made post-login landing 3 round trips deeper than necessary.
  const [certificates, { data }, { data: coRows }, { data: registrationRow }] =
    await Promise.all([
      certificatesReleased()
        ? listMyCertificates(profile.id)
        : Promise.resolve([]),
      supabase
        .from("submissions")
        .select("*, tracks(name)")
        .eq("author_id", profile.id)
        .order("updated_at", { ascending: false }),
      admin
        .from("submission_authors")
        .select("submission_id")
        .eq("profile_id", profile.id)
        .eq("is_corresponding", false),
      // Newest first: a delegate who abandoned a payment and started again has
      // more than one row, and the latest is the one they are working on.
      admin
        .from("registrations")
        .select("status, currency, amount, total_amount, paid_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const registration = (registrationRow as any) ?? null;

  const submissions = (data ?? []) as Row[];

  // Pathway B: the manuscripts this corresponding author must submit. Every
  // accepted Pathway B abstract enters the manuscript phase; the author uploads
  // one full paper per accepted abstract (dynamic 1–N across scenarios). Because
  // `submissions` is scoped to author_id = profile.id, this list only ever holds
  // papers where the viewer is the corresponding author — co-authors, whose
  // papers live in `coAuthored`, never see this section (they see All
  // Submissions only). Each entry is "completed" once its full paper is
  // submitted, so the author can proceed to the next.
  // Each accepted abstract and its post-acceptance next step. A Pathway B
  // abstract (full_paper_presentation) still owes a full paper → it gets a
  // Submit button. A Pathway A abstract (present on the abstract only) has
  // nothing to submit → it is view-only, but the author can still open and read
  // its info here.
  const acceptedAbstracts = submissions
    .filter((s) => {
      const type = (s as unknown as { submission_type: string }).submission_type;
      const stage = (s as unknown as { stage: string }).stage;
      if (
        type === "full_paper_presentation" &&
        (s.status === "abstract_accepted" || stage === "full_paper")
      )
        return true; // Pathway B — at the manuscript stage
      if (type !== "full_paper_presentation" && s.status === "accepted")
        return true; // Pathway A — accepted abstract, present only
      return false;
    })
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((s) => {
      const type = (s as unknown as { submission_type: string }).submission_type;
      const stage = (s as unknown as { stage: string }).stage;
      const submittedAt = (s as unknown as { full_paper_submitted_at: string | null })
        .full_paper_submitted_at;
      const isB = type === "full_paper_presentation";
      const revision = stage === "full_paper" && s.status === "revisions_requested";
      return {
        id: s.id,
        paper_id: s.paper_id,
        title: s.title,
        pathway: (isB ? "B" : "A") as "A" | "B",
        done: isB ? !!submittedAt && !revision : false,
        revision: isB ? revision : false,
      };
    });
  const bAbstracts = acceptedAbstracts.filter((m) => m.pathway === "B");
  const manuscriptsDone = bAbstracts.filter((m) => m.done).length;
  // The window is the manuscript-decision hub, shown once the author holds at
  // least one accepted Pathway B abstract.
  const showAcceptedWindow = bAbstracts.length > 0;

  // Submissions where the signed-in user is a linked co-author (view only).
  // The submission_authors read policy doesn't cover co-authors, so we look up
  // the user's OWN co-author rows with the admin client (fetched in the wave
  // above), strictly scoped to their profile_id, then read the linked
  // submissions.
  const coIds = Array.from(
    new Set((coRows ?? []).map((r) => r.submission_id as string))
  ).filter((sid) => !submissions.some((s) => s.id === sid));

  let coAuthored: Row[] = [];
  if (coIds.length) {
    const { data: coSubs } = await admin
      .from("submissions")
      .select("*, tracks(name)")
      .in("id", coIds)
      .order("updated_at", { ascending: false });
    coAuthored = (coSubs ?? []) as Row[];
  }

  // Whether to offer registration at all. Counts both roles, because a
  // co-author registers against a paper exactly as the corresponding author
  // does — and matches what /registration will actually list, so the prompt
  // never leads to an empty page.
  const hasAcceptance = [...submissions, ...coAuthored].some((s) =>
    isPresentable(s.status)
  );

  // The 2-submission rule counts both roles: papers you submit and papers you
  // co-author. Withdrawn submissions free a slot.
  const ownedActive = submissions.filter((s) => s.status !== "withdrawn").length;
  const coActive = coAuthored.filter((s) => s.status !== "withdrawn").length;
  const activeCount = ownedActive + coActive;
  const atLimit = activeCount >= MAX_SUBMISSIONS_PER_AUTHOR;

  // Pathway A tracks every paper's abstract journey; Pathway B tracks the
  // manuscript journey of full-paper papers past abstract acceptance. A paper
  // can appear in both — see phaseFor().
  const showPathwayB = hasManuscriptFolders(submissions) || bAbstracts.length > 0;

  // Every row carries the viewer's role on that submission, shown as a column.
  const ownedTagged: TaggedRow[] = submissions.map((s) => ({
    ...s,
    _role: "corresponding",
  }));
  const coTagged: TaggedRow[] = coAuthored.map((s) => ({
    ...s,
    _role: "coauthor",
  }));

  // Rows for the currently opened folder (if any). Folders are about the
  // author's own submissions; the full "All submissions" view also lists the
  // papers they co-author.
  const activeFolder = folder && folder in FOLDERS ? folder : null;
  const activePw = pw === "A" || pw === "B" ? pw : null;
  // A folder is opened within a pathway; match on that pathway's phase status so
  // e.g. a Pathway B paper whose abstract cleared appears under Pathway A →
  // Accepted, and its manuscript under Pathway B.
  const visible: TaggedRow[] =
    activeFolder && activePw
      ? ownedTagged.filter((s) => {
          const p = phaseFor(s, activePw);
          return (
            p !== null &&
            FOLDERS[activeFolder as keyof typeof FOLDERS].match({
              status: p.status,
              version: p.version,
            } as Row)
          );
        })
      : [...ownedTagged, ...coTagged].sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
  const activeFolderLabel = activeFolder
    ? activePw === "B"
      ? FOLDER_LABELS_B[activeFolder as keyof typeof FOLDERS]
      : FOLDERS[activeFolder as keyof typeof FOLDERS].label
    : "All submissions";

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle={`Your author center — ${activeCount} of ${MAX_SUBMISSIONS_PER_AUTHOR} submissions used.`}
        action={
          atLimit ? (
            <span
              className="btn-secondary opacity-60 cursor-not-allowed"
              title={`Limit of ${MAX_SUBMISSIONS_PER_AUTHOR} submissions reached`}
            >
              Submit New Abstract
            </span>
          ) : (
            <Link href="/author/submissions/new" className="btn-primary">
              Submit New Abstract
            </Link>
          )
        }
      />

      <RegistrationStatus registration={registration} accepted={hasAcceptance} />

      {/* -------- Accepted abstracts — next step (corresponding author) ------
          Shown once the author holds an accepted Pathway B abstract. Pathway B
          abstracts get a Submit button; Pathway A abstracts are view-only.
          Co-authors never reach this branch (their papers are in `coAuthored`).
          ------------------------------------------------------------------- */}
      {showAcceptedWindow && (
        <div
          id="submit-manuscript"
          className="card mb-8 border-teal-200 scroll-mt-6"
        >
          <div className="px-5 py-3 border-b border-teal-100 bg-teal-50/70 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-teal-900">
                Your accepted abstracts
              </h2>
              <p className="text-xs text-teal-700/80">
                Submit a full paper for each Pathway B abstract; a Pathway A
                abstract is presented on its own — nothing to submit.
              </p>
            </div>
            <span className="text-sm font-medium text-teal-700 whitespace-nowrap">
              {manuscriptsDone} of {bAbstracts.length} manuscript
              {bAbstracts.length === 1 ? "" : "s"} submitted
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {acceptedAbstracts.map((m, i) => (
              <div
                key={m.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    Paper {i + 1}
                    {m.paper_id ? ` · ${m.paper_id}` : ""}
                    <span
                      className={`ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        m.pathway === "B"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Pathway {m.pathway}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {m.title || "Untitled submission"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {m.pathway === "A" ? (
                    // Pathway A: present on the accepted abstract — no submit.
                    <>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Abstract &amp; Presentation
                      </span>
                      <Link
                        href={`/author/submissions/${m.id}`}
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        View abstract
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        {m.done ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Completed
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              {m.revision ? "Revision requested" : "To submit"}
                            </span>
                            <Link
                              href={`/author/submissions/${m.id}`}
                              className="btn-primary"
                            >
                              {m.revision ? "Submit revision" : "Submit manuscript"}
                            </Link>
                          </>
                        )}
                      </div>
                      {/* Switch to Pathway A → revert to an accepted abstract.
                          Only before the manuscript is ever submitted — once it
                          is under review (or in revision) it can no longer be
                          self-cancelled. Double-confirmed; notifies all authors
                          + CCs the Track Editor and Convener. */}
                      {!m.done && !m.revision && (
                        <CancelFullPaperButton submissionId={m.id} />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MyCertificates certificates={certificates} types={["participant"]} />

      <div
        className={`card card-pad mb-8 ${
          atLimit ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
        }`}
      >
        <p
          className={`text-sm ${atLimit ? "text-amber-900" : "text-blue-900"}`}
        >
          <strong>Submission rule:</strong> each author may hold a maximum of{" "}
          {MAX_SUBMISSIONS_PER_AUTHOR} submissions, counting papers you submit
          and papers you co-author.{" "}
          {atLimit
            ? "You have reached the limit — withdraw a submission to free a slot."
            : `You have ${MAX_SUBMISSIONS_PER_AUTHOR - activeCount} remaining.`}
        </p>
      </div>

      {/* Above All Submissions sits the dashboard for the author's current
          stage: Pathway B once they've reached the manuscript phase (an accepted
          abstract), otherwise the Pathway A abstract dashboard. */}
      <div className="mb-10">
        <PathwayDashboard
          submissions={submissions}
          pathway={showPathwayB ? "B" : "A"}
          atLimit={atLimit}
          activeFolder={activeFolder}
          activePw={activePw}
        />
      </div>

      {/* -------- Table for the opened folder (or everything) -------- */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {activeFolderLabel}
        </h2>
        {activeFolder && (
          <Link href="/author" className="text-sm text-blue-700 hover:underline">
            Show all
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing in this folder"
          description="Submissions matching this stage will appear here."
          action={
            atLimit ? undefined : (
              <Link href="/author/submissions/new" className="btn-primary">
                Submit New Abstract
              </Link>
            )
          }
        />
      ) : (
        <DataTable
          headers={["Paper ID", "Title", "Track", "Role", "Status", "Version", "Updated", ""]}
        >
          {visible.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                {s.paper_id ?? "—"}
              </td>
              <td className="td font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                <div>
                  {s.title || <span className="text-slate-400">Untitled</span>}
                </div>
                <span
                  className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${pathwayOf(s).cls}`}
                >
                  {pathwayOf(s).label}
                </span>
                {(s as unknown as { pathway_reverted_at: string | null })
                  .pathway_reverted_at && (
                  <span className="mt-1 block text-[11px] text-slate-400">
                    ↩ Switched from Pathway B on{" "}
                    {formatDate(
                      (s as unknown as { pathway_reverted_at: string })
                        .pathway_reverted_at
                    )}
                  </span>
                )}
              </td>
              <td className="td text-slate-500">{s.tracks?.name ?? "—"}</td>
              <td className="td whitespace-nowrap">
                {s._role === "corresponding" ? (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    Corresponding Author
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                    Co-Author
                  </span>
                )}
              </td>
              <td className="td">
                <StatusBadge
                  status={s.status}
                  submissionType={
                    (s as unknown as { submission_type: string }).submission_type
                  }
                  stage={(s as unknown as { stage: string }).stage}
                  version={s.version}
                />
              </td>
              <td className="td">{versionTag(s.version)}</td>
              <td className="td text-slate-500">{formatDate(s.updated_at)}</td>
              <td className="td text-right">
                <Link
                  href={`/author/submissions/${s.id}`}
                  className="text-blue-700 hover:underline text-sm font-medium dark:text-blue-300"
                >
                  {s._role === "corresponding" ? "Open" : "View"}
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {/* Once the author has reached Pathway B, the earlier Pathway A abstract
          dashboard drops below All Submissions (Pathway B is shown above). Before
          that, Pathway A is the above-table dashboard, so nothing goes here. */}
      {showPathwayB && (
        <div className="mt-10">
          <PathwayDashboard
            submissions={submissions}
            pathway="A"
            atLimit={atLimit}
            activeFolder={activeFolder}
            activePw={activePw}
          />
        </div>
      )}
    </>
  );
}

/**
 * One pathway's folder view. Pathway A uses the abstract wording and the
 * "Submit New Abstract" entry; Pathway B swaps in the manuscript wording and a
 * "Submit New Manuscript" link that jumps to the top window. Folder links carry
 * `&pw=` so the All-Submissions table filters to the same pathway.
 */
function PathwayDashboard({
  submissions,
  pathway,
  atLimit,
  activeFolder,
  activePw,
}: {
  submissions: Row[];
  pathway: "A" | "B";
  atLimit: boolean;
  activeFolder: string | null;
  activePw: string | null;
}) {
  const heading =
    pathway === "B"
      ? "Pathway B — Manuscript Submissions"
      : "Pathway A — Abstract Submissions";
  const headCls = pathway === "B" ? "text-violet-700" : "text-emerald-700";
  const labelFor = (key: keyof typeof FOLDERS) =>
    pathway === "B" ? FOLDER_LABELS_B[key] : FOLDERS[key].label;
  // Count against this pathway's phase status, so a full-paper paper is counted
  // by its abstract in Pathway A and by its manuscript in Pathway B.
  const countFor = (key: keyof typeof FOLDERS) =>
    submissions.filter((s) => {
      const p = phaseFor(s, pathway);
      return (
        p !== null &&
        FOLDERS[key].match({ status: p.status, version: p.version } as Row)
      );
    }).length;

  return (
    <section className="mb-10">
      <h2
        className={`mb-3 text-sm font-semibold uppercase tracking-wide ${headCls}`}
      >
        {heading}
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {GROUPS.map((group) => (
          <div key={group.title} className="card">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{group.title}</h3>
            </div>
            <div className="py-2">
              {group.title === "New Submissions" && (
                <div className="px-4 py-2.5">
                  {pathway === "A" ? (
                    atLimit ? (
                      <span className="text-slate-400 font-medium cursor-not-allowed">
                        Submit New Abstract
                      </span>
                    ) : (
                      <Link
                        href="/author/submissions/new"
                        className="text-blue-700 hover:underline font-medium"
                      >
                        Submit New Abstract
                      </Link>
                    )
                  ) : (
                    <Link
                      href="/author#submit-manuscript"
                      className="text-blue-700 hover:underline font-medium"
                    >
                      Submit Manuscript
                    </Link>
                  )}
                </div>
              )}
              {group.keys.map((key) => (
                <FolderRow
                  key={key}
                  label={labelFor(key)}
                  count={countFor(key)}
                  href={`/author?folder=${key}&pw=${pathway}`}
                  active={activeFolder === key && activePw === pathway}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
