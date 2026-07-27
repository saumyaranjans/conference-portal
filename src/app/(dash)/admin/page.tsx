import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  DataTable,
  PageHeader,
  Section,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import { SubmissionAnalytics } from "@/components/SubmissionAnalytics";
import type { Profile } from "@/lib/types";

export default async function AdminDashboard() {
  await requireRole("admin");
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: confStats }, { data: profiles }, { data: subs }, { data: audit }] =
    await Promise.all([
      supabase.from("conference_stats").select("*"),
      supabase.from("profiles").select("*"),
      supabase
        .from("submissions")
        .select(
          "stage, status, submission_type, participation_mode, tracks(name, code)"
        )
        .neq("status", "draft"),
      admin
        .from("audit_log")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const totals = ((confStats ?? []) as any[])[0] ?? {};
  const users = (profiles ?? []) as Profile[];

  const roleCount = (role: string) =>
    users.filter((u) => u.roles.includes(role as any)).length;

  return (
    <>
      <PageHeader
        title="Editorial Office"
        subtitle="System-wide health, users, and the audit trail."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/announcements" className="btn-primary">
              New announcement
            </Link>
            <a href="/api/reports/submissions" className="btn-secondary">
              Export submissions CSV
            </a>
          </div>
        }
      />

      <Section title="Submission analytics">
        <SubmissionAnalytics rows={(subs ?? []) as any} showChoices />
      </Section>

      <Section title="Users">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total users" value={users.length} href="/admin/users" />
          <StatCard label="Authors" value={roleCount("author")} />
          <StatCard label="Reviewers" value={roleCount("reviewer")} />
          <StatCard label="Track Editors" value={roleCount("editor")} />
          <StatCard label="Conveners" value={roleCount("chief")} />
        </div>
        {users.filter((u) => !u.is_active).length > 0 && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-4">
            {users.filter((u) => !u.is_active).length} deactivated account(s).{" "}
            <Link href="/admin/users" className="underline">
              Manage users
            </Link>
          </p>
        )}
      </Section>

      <Section title="Recent activity">
        <DataTable headers={["When", "Actor", "Action", "Entity"]}>
          {((audit ?? []) as any[]).map((a) => (
            <tr key={a.id}>
              <td className="td text-slate-500 whitespace-nowrap">
                {new Date(a.created_at).toLocaleString()}
              </td>
              <td className="td">
                {a.profiles?.full_name || a.profiles?.email || "system"}
              </td>
              <td className="td font-mono text-xs">{a.action}</td>
              <td className="td text-slate-500">{a.entity}</td>
            </tr>
          ))}
          {((audit ?? []) as any[]).length === 0 && (
            <tr>
              <td className="td text-slate-500" colSpan={4}>
                No activity recorded yet.
              </td>
            </tr>
          )}
        </DataTable>
      </Section>
    </>
  );
}
