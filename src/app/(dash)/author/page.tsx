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

  // The author's own (corresponding) submissions — these drive the folders.
  const { data } = await supabase
    .from("submissions")
    .select("*, tracks(name)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const submissions = (data ?? []) as Row[];

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
