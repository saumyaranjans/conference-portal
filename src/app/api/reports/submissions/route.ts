import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { statusLabel, type SubmissionStatus } from "@/lib/types";

/** CSV export of every submission — organisers (chief/admin) only. */
export async function GET() {
  const profile = await getProfile();
  const allowed =
    profile &&
    (profile.roles.includes("admin") || profile.roles.includes("chief"));
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "paper_id, title, status, submission_type, stage, version, submitted_at, tracks(name, code), profiles!submissions_author_id_fkey(full_name, email, institution)"
    )
    .neq("status", "draft")
    .order("paper_id", { ascending: true });

  const rows = (subs ?? []) as any[];

  // pull review stats in one go
  const { data: statsRows } = await supabase
    .from("submission_review_stats")
    .select("submission_id, completed_count, assigned_count, avg_score");
  // note: stats keyed by submission_id, but we didn't select it above; refetch ids
  const { data: withIds } = await supabase
    .from("submissions")
    .select("id, paper_id")
    .neq("status", "draft");
  const idByPaper = new Map(
    ((withIds ?? []) as any[]).map((r) => [r.paper_id, r.id])
  );
  const statById = new Map(
    ((statsRows ?? []) as any[]).map((r) => [r.submission_id, r])
  );

  const header = [
    "Paper ID",
    "Title",
    "Track",
    "Track Code",
    "Author",
    "Institution",
    "Status",
    "Version",
    "Reviews Complete",
    "Reviews Assigned",
    "Avg Score",
    "Submitted",
  ];

  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    // Excel, Numbers and some CSV viewers execute cells beginning with these
    // characters as formulas. Treat all user-supplied cells as literal text.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    const st = statById.get(idByPaper.get(r.paper_id));
    lines.push(
      [
        r.paper_id ?? "",
        r.title,
        r.tracks?.name ?? "",
        r.tracks?.code ?? "",
        r.profiles?.full_name ?? "",
        r.profiles?.institution ?? "",
        statusLabel(r.status as SubmissionStatus, r.submission_type, r.stage),
        r.version,
        st?.completed_count ?? 0,
        st?.assigned_count ?? 0,
        st?.avg_score ?? "",
        r.submitted_at ? new Date(r.submitted_at).toISOString().slice(0, 10) : "",
      ]
        .map(esc)
        .join(",")
    );
  }

  const csv = lines.join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions-${stamp}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
