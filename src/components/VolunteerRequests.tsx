import { createAdminClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { decideVolunteerRequest } from "@/lib/volunteerActions";
import { PageHeader, Section, StatCard } from "@/components/ui/Primitives";
import { VOLUNTEER_ROLE_INFO, type VolunteerRole } from "@/lib/types";

/**
 * Offers to serve, awaiting the Convener's decision.
 *
 * Accepting is the only thing that grants reviewer or editor access, so this
 * screen is the gate between "I am willing" and "I can see other people's
 * papers". Read with the service client because the Convener needs to see the
 * volunteer's full profile to judge the offer.
 */

type Row = {
  id: string;
  role: VolunteerRole;
  status: "pending" | "accepted" | "declined";
  requested_at: string;
  decided_at: string | null;
  decision_note: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    title: string | null;
    designation: string | null;
    institution: string | null;
    country: string | null;
    participant_category: string | null;
    orcid: string | null;
    roles: string[] | null;
  } | null;
};

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: VolunteerRole }) {
  const isEditor = role === "editor";
  return (
    <span
      className={`badge ${
        isEditor
          ? "bg-amber-100 text-amber-800"
          : "bg-indigo-100 text-indigo-700"
      }`}
    >
      {VOLUNTEER_ROLE_INFO[role].label}
    </span>
  );
}

function Person({ p }: { p: Row["profiles"] }) {
  if (!p) return <span className="text-slate-400">Account removed</span>;
  const name = [p.title, p.full_name].filter(Boolean).join(" ");
  return (
    <div className="min-w-0">
      <p className="font-medium text-slate-900 dark:text-white">{name}</p>
      <p className="text-xs text-slate-500">{p.email}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        {[p.designation, p.institution, p.country].filter(Boolean).join(" · ") ||
          "No affiliation recorded"}
      </p>
      {p.orcid && (
        <p className="text-xs text-slate-400">ORCID {p.orcid}</p>
      )}
    </div>
  );
}

export async function VolunteerRequests({ basePath }: { basePath: string }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("volunteer_requests")
    // The foreign key must be named: this table points at profiles twice
    // (the volunteer, and the Convener who decided), so an unqualified join is
    // ambiguous and PostgREST refuses it outright.
    .select(
      "id, role, status, requested_at, decided_at, decision_note, profiles!volunteer_requests_profile_id_fkey(full_name, email, title, designation, institution, country, participant_category, orcid, roles)"
    )
    .order("requested_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Row[]) ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");
  const accepted = rows.filter((r) => r.status === "accepted");

  return (
    <>
      <PageHeader
        title="Reviewer & Track Editor Requests"
        subtitle="Faculty who offered to serve when they registered. Accepting grants the role and adds them to the list you allocate from."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting decision" value={pending.length} />
        <StatCard
          label="Reviewers accepted"
          value={accepted.filter((r) => r.role === "reviewer").length}
        />
        <StatCard
          label="Track Editors accepted"
          value={accepted.filter((r) => r.role === "editor").length}
        />
        <StatCard label="Offers in total" value={rows.length} />
      </div>

      <Section title={`Awaiting your decision (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing waiting. Offers appear here as faculty register.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="card card-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Person p={r.profiles} />
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RoleBadge role={r.role} />
                    <span className="text-xs text-slate-400">
                      offered {when(r.requested_at)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  {VOLUNTEER_ROLE_INFO[r.role].summary}
                </p>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <ActionForm
                    action={decideVolunteerRequest}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <input
                      name="decision_note"
                      placeholder="Note to them (optional)"
                      className="input w-56 max-w-full text-xs"
                    />
                    <SubmitButton variant="primary" className="text-xs">
                      Accept
                    </SubmitButton>
                  </ActionForm>

                  <ActionForm
                    action={decideVolunteerRequest}
                    confirm={`Decline this offer to serve as ${VOLUNTEER_ROLE_INFO[r.role].label}? They will be notified and no access is granted.`}
                  >
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="declined" />
                    <SubmitButton variant="secondary" className="text-xs">
                      Decline
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Already decided (${decided.length})`}>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-400">No decisions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Decision</th>
                  <th className="py-2 pr-3">On</th>
                  <th className="py-2">Reverse</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.profiles?.full_name ?? "—"}
                      </span>
                      <br />
                      <span className="text-xs text-slate-500">
                        {r.profiles?.institution}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <RoleBadge role={r.role} />
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`badge ${
                          r.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.status === "accepted" ? "Accepted" : "Declined"}
                      </span>
                      {r.decision_note && (
                        <p className="mt-1 text-xs text-slate-400">
                          {r.decision_note}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      {when(r.decided_at)}
                    </td>
                    <td className="py-2">
                      {/* A mistaken decision is correctable without leaving
                          the page: reversing an acceptance removes the role. */}
                      <ActionForm
                        action={decideVolunteerRequest}
                        confirm={
                          r.status === "accepted"
                            ? `Withdraw ${VOLUNTEER_ROLE_INFO[r.role].label} access from ${r.profiles?.full_name ?? "this person"}?`
                            : `Accept this offer after all? They will gain ${VOLUNTEER_ROLE_INFO[r.role].label} access.`
                        }
                      >
                        <input type="hidden" name="request_id" value={r.id} />
                        <input
                          type="hidden"
                          name="decision"
                          value={r.status === "accepted" ? "declined" : "accepted"}
                        />
                        <SubmitButton
                          variant="secondary"
                          className="!px-2 !py-1 text-[11px]"
                        >
                          {r.status === "accepted" ? "Withdraw" : "Accept"}
                        </SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="mt-6 text-xs text-slate-400">
        Accepted volunteers appear in{" "}
        <a href={`${basePath}/reviewers`} className="text-blue-700 hover:underline">
          Reviewer Management
        </a>{" "}
        and{" "}
        <a
          href={`${basePath}/track-editors`}
          className="text-blue-700 hover:underline"
        >
          Track Editor Management
        </a>
        , where papers and tracks are allocated as usual.
      </p>
    </>
  );
}
