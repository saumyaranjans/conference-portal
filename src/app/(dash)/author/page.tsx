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
import { MAX_SUBMISSIONS_PER_AUTHOR, versionTag, type Submission } from "@/lib/types";
import { MyCertificates } from "@/components/MyCertificates";
import { listMyCertificates, certificatesReleased } from "@/lib/certificateAccess";

type Row = Submission & { tracks: { name: string } | null };

/** A submission row tagged with the viewer's role on it. */
type TaggedRow = Row & { _role: "corresponding" | "coauthor" };

/** A folder's inclusion rule over the author's submissions. */
type Predicate = (s: Row) => boolean;

const isProcessing = (s: Row) =>
  s.status === "submitted" || s.status === "under_review";

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
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const certificates = certificatesReleased()
    ? await listMyCertificates(profile.id)
    : [];

  // The author's own (corresponding) submissions — these drive the folders.
  const { data } = await supabase
    .from("submissions")
    .select("*, tracks(name)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const submissions = (data ?? []) as Row[];

  // Pathway B: the manuscripts this corresponding author must submit. Every
  // accepted Pathway B abstract enters the manuscript phase; the author uploads
  // one full paper per accepted abstract (dynamic 1–N across scenarios). Because
  // `submissions` is scoped to author_id = profile.id, this list only ever holds
  // papers where the viewer is the corresponding author — co-authors, whose
  // papers live in `coAuthored`, never see this section (they see All
  // Submissions only). Each entry is "completed" once its full paper is
  // submitted, so the author can proceed to the next.
  const manuscripts = submissions
    .filter(
      (s) =>
        (s as unknown as { submission_type: string }).submission_type ===
          "full_paper_presentation" &&
        (s.status === "abstract_accepted" ||
          (s as unknown as { stage: string }).stage === "full_paper")
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((s) => {
      const submittedAt = (s as unknown as { full_paper_submitted_at: string | null })
        .full_paper_submitted_at;
      const stage = (s as unknown as { stage: string }).stage;
      const revision = stage === "full_paper" && s.status === "revisions_requested";
      return {
        id: s.id,
        paper_id: s.paper_id,
        title: s.title,
        done: !!submittedAt && !revision,
        revision,
      };
    });
  const manuscriptsDone = manuscripts.filter((m) => m.done).length;

  // Submissions where the signed-in user is a linked co-author (view only).
  // The submission_authors read policy doesn't cover co-authors, so we look up
  // the user's OWN co-author rows with the admin client, strictly scoped to
  // their profile_id, then read the linked submissions.
  const admin = createAdminClient();
  const { data: coRows } = await admin
    .from("submission_authors")
    .select("submission_id")
    .eq("profile_id", profile.id)
    .eq("is_corresponding", false);
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

  // The 2-submission rule counts both roles: papers you submit and papers you
  // co-author. Withdrawn submissions free a slot.
  const ownedActive = submissions.filter((s) => s.status !== "withdrawn").length;
  const coActive = coAuthored.filter((s) => s.status !== "withdrawn").length;
  const activeCount = ownedActive + coActive;
  const atLimit = activeCount >= MAX_SUBMISSIONS_PER_AUTHOR;

  const countFor = (key: keyof typeof FOLDERS) =>
    submissions.filter(FOLDERS[key].match).length;

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
  const visible: TaggedRow[] = activeFolder
    ? ownedTagged.filter((s) =>
        FOLDERS[activeFolder as keyof typeof FOLDERS].match(s)
      )
    : [...ownedTagged, ...coTagged].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

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

      {/* -------- Submit New Manuscript (Pathway B, corresponding author) ----
          Appears first, only when accepted Pathway B abstracts exist. Co-authors
          never reach this branch (their papers are in `coAuthored`). ---------- */}
      {manuscripts.length > 0 && (
        <div className="card mb-8 border-teal-200">
          <div className="px-5 py-3 border-b border-teal-100 bg-teal-50/70 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-teal-900">Submit New Manuscript</h2>
            <span className="text-sm font-medium text-teal-700">
              {manuscriptsDone} of {manuscripts.length} completed
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {manuscripts.map((m, i) => (
              <div
                key={m.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    Manuscript {i + 1}
                    {m.paper_id ? ` · Paper ${m.paper_id}` : ""}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {m.title || "Untitled submission"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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

      {/* -------- Folder groups -------- */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {GROUPS.map((group) => (
          <div key={group.title} className="card">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{group.title}</h2>
            </div>
            <div className="py-2">
              {group.title === "New Submissions" && (
                <div className="px-4 py-2.5">
                  {atLimit ? (
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
                  )}
                </div>
              )}
              {group.keys.map((key) => (
                <FolderRow
                  key={key}
                  label={FOLDERS[key].label}
                  count={countFor(key)}
                  href={`/author?folder=${key}`}
                  active={activeFolder === key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* -------- Table for the opened folder (or everything) -------- */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {activeFolder ? FOLDERS[activeFolder as keyof typeof FOLDERS].label : "All submissions"}
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
                {s.title || <span className="text-slate-400">Untitled</span>}
              </td>
              <td className="td text-slate-500">{s.tracks?.name ?? "—"}</td>
              <td className="td whitespace-nowrap">
                {s._role === "corresponding" ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    Corresponding Author
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                    Co-Author
                  </span>
                )}
              </td>
              <td className="td">
                <StatusBadge status={s.status} />
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
    </>
  );
}
