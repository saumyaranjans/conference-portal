import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  formatDate,
} from "@/components/ui/Primitives";
import type { Submission } from "@/lib/types";

type Row = Submission & { tracks: { name: string } | null };

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

  const { data } = await supabase
    .from("submissions")
    .select("*, tracks(name)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const submissions = (data ?? []) as Row[];

  const countFor = (key: keyof typeof FOLDERS) =>
    submissions.filter(FOLDERS[key].match).length;

  // Rows for the currently opened folder (if any).
  const activeFolder = folder && folder in FOLDERS ? folder : null;
  const visible = activeFolder
    ? submissions.filter(FOLDERS[activeFolder as keyof typeof FOLDERS].match)
    : submissions;

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle="Your author center — track manuscripts through each stage."
        action={
          <Link href="/author/submissions/new" className="btn-primary">
            Submit New Manuscript
          </Link>
        }
      />

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
                  <Link
                    href="/author/submissions/new"
                    className="text-blue-700 hover:underline font-medium"
                  >
                    Submit New Manuscript
                  </Link>
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
            <Link href="/author/submissions/new" className="btn-primary">
              Submit New Manuscript
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Paper ID", "Title", "Track", "Status", "Version", "Updated", ""]}
        >
          {visible.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                {s.paper_id ?? "—"}
              </td>
              <td className="td font-medium text-slate-900 max-w-sm">
                {s.title || <span className="text-slate-400">Untitled</span>}
              </td>
              <td className="td text-slate-500">{s.tracks?.name ?? "—"}</td>
              <td className="td">
                <StatusBadge status={s.status} />
              </td>
              <td className="td">v{s.version}</td>
              <td className="td text-slate-500">{formatDate(s.updated_at)}</td>
              <td className="td text-right">
                <Link
                  href={`/author/submissions/${s.id}`}
                  className="text-blue-700 hover:underline text-sm font-medium"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
