import { createClient } from "@/lib/supabase/server";
import { confirmAuthorAttendance, markRegistrationFee } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  formatDate,
} from "@/components/ui/Primitives";
import {
  computeRegistrationFee,
  MEMBER_DISCOUNT_PERCENT,
  formatMoney,
  isEarlyBird,
  EARLY_BIRD_CUTOFF,
} from "@/lib/registrationFees";

/** Attendance register shared by the Editorial Office and Convener views. */
export async function AttendanceRegister() {
  const supabase = await createClient();

  // Every listed author on a live submission, with what they declared.
  const { data } = await supabase
    .from("submission_authors")
    .select(
      "id, full_name, email, affiliation, participant_category, profile_id, attendance, attended_confirmed, attendance_confirmed_at, registration_fee_paid, registration_fee_paid_at, author_order, submissions!inner(id, paper_id, title, status)"
    )
    .order("author_order");

  const rows = ((data ?? []) as any[]).filter(
    (r) => r.submissions && r.submissions.status !== "draft"
  );

  // GIFT Society membership + category live on the person's profile (co-authors who
  // signed up). Look them up so the fee can apply the member discount.
  const profileIds = [...new Set(rows.map((r) => r.profile_id).filter(Boolean))];
  const { data: profs } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, glogift_member, participant_category, country")
        .in("id", profileIds)
    : { data: [] as any[] };
  const profMap = new Map(
    ((profs ?? []) as any[]).map((p) => [p.id, p])
  );

  // Attach the chosen category, membership and computed registration fee.
  const now = new Date();
  const earlyBird = isEarlyBird(now);
  for (const r of rows) {
    const prof = r.profile_id ? profMap.get(r.profile_id) : null;
    r._category = r.participant_category || prof?.participant_category || null;
    r._member = Boolean(prof?.glogift_member);
    r._country = prof?.country ?? null;
    r._fee = computeRegistrationFee(r._category, r._member, now, r._country);
  }

  const attending = rows.filter((r) => r.attendance === "attending");
  const confirmed = attending.filter((r) => r.attended_confirmed);
  const feesPaid = attending.filter((r) => r.registration_fee_paid);
  const notAttending = rows.filter((r) => r.attendance === "not_attending");

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="What each author declared, and who actually attended."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Listed authors" value={rows.length} />
        <StatCard
          label="Declared attending"
          value={attending.length}
          hint="Registration fee applies"
        />
        <StatCard label="Fees paid" value={feesPaid.length} />
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
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Attending — requires registration ({attending.length})
            </h2>
            <span
              className={`badge ${
                earlyBird
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {earlyBird ? "Early-bird rates in effect" : "Regular rates in effect"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Early-bird fees apply on or before {formatDate(EARLY_BIRD_CUTOFF)};
            regular fees apply from 21 Dec 2026. GIFT Society members receive a{" "}
            {MEMBER_DISCOUNT_PERCENT}%
            discount. Fees are per delegate, based on the category chosen at
            sign-up.
          </p>
          <DataTable
            headers={[
              "Paper ID",
              "Author",
              "GIFT Society member",
              "Participant category",
              "Registration fee",
              "Attended",
            ]}
          >
            {attending.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 align-top">
                <td className="td font-mono text-xs text-slate-500 whitespace-nowrap">
                  {r.submissions.paper_id ?? "—"}
                </td>
                <td className="td">
                  <span className="font-medium text-slate-900">
                    {r.full_name}
                  </span>
                  <span className="block text-xs text-slate-500">{r.email}</span>
                  {r.affiliation && (
                    <span className="block text-xs text-slate-400">
                      {r.affiliation}
                    </span>
                  )}
                </td>

                {/* GIFT Society member box */}
                <td className="td">
                  {r._member ? (
                    <span className="badge bg-blue-100 text-blue-800">
                      GIFT Society member
                    </span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600">
                      Non-member
                    </span>
                  )}
                </td>

                {/* Participant category box */}
                <td className="td">
                  {r._category ? (
                    <span className="badge bg-violet-100 text-violet-800">
                      {r._category}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Not specified</span>
                  )}
                </td>

                {/* Registration fee box (tier + amount + paid toggle) */}
                <td className="td">
                  <div className="space-y-1.5">
                    <span
                      className={`badge ${
                        r._fee.tier === "early"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r._fee.tier === "early" ? "Early bird" : "Regular"}
                    </span>
                    {r._fee.known ? (
                      <div className="text-sm text-slate-800">
                        <span className="font-semibold">
                          {formatMoney(r._fee.currency, r._fee.amount)}
                        </span>
                        {r._fee.discount > 0 && (
                          <span className="block text-xs text-slate-400">
                            <span className="line-through">
                              {formatMoney(r._fee.currency, r._fee.base)}
                            </span>{" "}
                            − {MEMBER_DISCOUNT_PERCENT}% member (−{formatMoney(r._fee.currency, r._fee.discount)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        Category not set — fee not determined
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      {r.registration_fee_paid ? (
                        <span className="badge bg-emerald-100 text-emerald-800">
                          Paid
                          {r.registration_fee_paid_at
                            ? ` · ${formatDate(r.registration_fee_paid_at)}`
                            : ""}
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">
                          Unpaid
                        </span>
                      )}
                      <ActionForm action={markRegistrationFee}>
                        <input type="hidden" name="author_id" value={r.id} />
                        <input
                          type="hidden"
                          name="paid"
                          value={String(!r.registration_fee_paid)}
                        />
                        <SubmitButton
                          variant="secondary"
                          className="text-xs py-1 px-2"
                        >
                          {r.registration_fee_paid ? "Undo" : "Mark paid"}
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </div>
                </td>

                {/* Attendance */}
                <td className="td">
                  <div className="space-y-1.5">
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
                  </div>
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
