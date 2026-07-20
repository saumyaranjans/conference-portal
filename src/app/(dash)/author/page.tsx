import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import type { Submission, SubmissionStatus } from "@/lib/types";

export default async function AuthorDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("submissions")
    .select("*, tracks(name)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const submissions = (data ?? []) as (Submission & {
    tracks: { name: string } | null;
  })[];

  const count = (s: SubmissionStatus) =>
    submissions.filter((x) => x.status === s).length;

  const inFlight = submissions.filter((s) =>
    ["submitted", "under_review"].includes(s.status)
  ).length;

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle="Track every paper you have submitted to the conference."
        action={
          <Link href="/author/submissions/new" className="btn-primary">
            New submission
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={submissions.length} />
        <StatCard label="In review" value={inFlight} />
        <StatCard label="Accepted" value={count("accepted")} />
        <StatCard
          label="Action needed"
          value={count("revisions_requested") + count("draft")}
          hint="Drafts and revision requests"
        />
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Start by creating your first submission."
          action={
            <Link href="/author/submissions/new" className="btn-primary">
              New submission
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Title", "Track", "Status", "Version", "Updated", ""]}
        >
          {submissions.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
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
