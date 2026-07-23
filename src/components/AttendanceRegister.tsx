import { createClient } from "@/lib/supabase/server";
import { confirmAuthorAttendance } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";

/** Attendance register shared by the Editorial Office and Convener views. */
export async function AttendanceRegister() {
  const supabase = await createClient();

  // Every listed author on a live submission, with what they declared.
  const { data } = await supabase
    .from("submission_authors")
    .select(
      "id, full_name, email, affiliation, attendance, attended_confirmed, attendance_confirmed_at, author_order, submissions!inner(id, paper_id, title, status)"
    )
    .order("author_order");

  const rows = ((data ?? []) as any[]).filter(
    (r) => r.submissions && r.submissions.status !== "draft"
  );

  const attending = rows.filter((r) => r.attendance === "attending");
  const confirmed = attending.filter((r) => r.attended_confirmed);
  const notAttending = rows.filter((r) => r.attendance === "not_attending");

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="What each author declared, and who actually attended."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Listed authors" value={rows.length} />
        <StatCard
          label="Declared attending"
          value={attending.length}
          hint="Registration fee applies"
        />
        <StatCard label="Verified attended" value={confirmed.length} />
        <StatCard label="Not attending" value={notAttending.length} />
      </div>

      {attending.length === 0 ? (
        <EmptyState
          title="No authors have declared attendance yet"
          description="Authors choose this when they submit an abstract."
        />
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Attending — requires registration ({attending.length})
          </h2>
          <DataTable
            headers={["Paper ID", "Author", "Affiliation", "Verified", ""]}
          >
            {attending.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                  {r.submissions.paper_id ?? "—"}
                </td>
                <td className="td">
                  <span className="font-medium text-slate-900">
                    {r.full_name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {r.email}
                  </span>
                </td>
                <td className="td text-slate-500 max-w-xs">{r.affiliation}</td>
                <td className="td">
                  {r.attended_confirmed ? (
                    <span className="badge bg-emerald-100 text-emerald-800">
                      Attended
                      {r.attendance_confirmed_at
                        ? ` · ${formatDate(r.attendance_confirmed_at)}`
                        : ""}
                    </span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600">
                      Not verified
                    </span>
                  )}
                </td>
                <td className="td text-right">
                  <ActionForm action={confirmAuthorAttendance}>
                    <input type="hidden" name="author_id" value={r.id} />
                    <input
                      type="hidden"
                      name="confirmed"
                      value={String(!r.attended_confirmed)}
                    />
                    <SubmitButton
                      variant="secondary"
                      className="text-xs py-1 px-2"
                    >
                      {r.attended_confirmed ? "Undo" : "Mark attended"}
                    </SubmitButton>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {notAttending.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Not attending ({notAttending.length})
          </h2>
          <DataTable headers={["Paper ID", "Author", "Affiliation"]}>
            {notAttending.map((r) => (
              <tr key={r.id}>
                <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                  {r.submissions.paper_id ?? "—"}
                </td>
                <td className="td">
                  <span className="font-medium text-slate-900">
                    {r.full_name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {r.email}
                  </span>
                </td>
                <td className="td text-slate-500 max-w-xs">{r.affiliation}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </>
  );
}
