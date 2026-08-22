import { createAdminClient } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import {
  assignVolunteerTrack,
  decideVolunteerRequest,
} from "@/lib/volunteerActions";
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

/**
 * The track embed only resolves once migration 0082 adds preferred_track_id;
 * before that PostgREST cannot see a relationship and rejects the whole query.
 * Rather than gate the page on a migration, the query is retried without the
 * embed — the track simply does not show until 0082 is applied.
 */
const TRACK_EMBED = "tracks(code, name), ";

type Row = {
  id: string;
  role: VolunteerRole;
  status: "pending" | "accepted" | "declined";
  requested_at: string;
  decided_at: string | null;
  decision_note: string;
  /** The track they offered to serve. Null on offers made before 0082. */
  tracks: { code: string | null; name: string } | { code: string | null; name: string }[] | null;
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

  // The foreign key must be named: this table points at profiles twice (the
  // volunteer, and the Convener who decided), so an unqualified join is
  // ambiguous and PostgREST refuses it outright.
  const columns = (withTrack: boolean) =>
    `id, role, status, requested_at, decided_at, decision_note, ${
      withTrack ? TRACK_EMBED : ""
    }profiles!volunteer_requests_profile_id_fkey(full_name, email, title, designation, institution, country, participant_category, orcid, roles)`;

  const load = (withTrack: boolean) =>
    admin
      .from("volunteer_requests")
      .select(columns(withTrack))
      .order("requested_at", { ascending: false });

  const { data: trackList } = await admin
    .from("tracks")
    .select("id, code, name")
    .order("code");
  const tracks = (trackList ?? []) as { id: string; code: string | null; name: string }[];

  let { data, error } = await load(true);
  // Whether the database can hold a track at all. Assigning one is only
  // offered when it can — a picker that cannot store its answer is worse than
  // no picker, because it reads as a job done.
  let trackColumnReady = true;
  if (error) {
    // Almost certainly 0082 not yet applied. Retry without the track rather
    // than render an empty queue and leave offers looking as though they
    // vanished.
    console.error("[volunteers] track embed failed: %s", error.message);
    trackColumnReady = false;
    ({ data, error } = await load(false));
    if (error) console.error("[volunteers] load failed: %s", error.message);
  }

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

                {/* Which track they asked for. For an editor this is what
                    accepting will seat them on, so it belongs in front of the
                    person deciding. */}
                {(() => {
                  const t = Array.isArray(r.tracks) ? r.tracks[0] : r.tracks;
                  if (!t?.name) return null;
                  return (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">
                        {r.role === "editor" ? "Track requested: " : "Expertise: "}
                      </span>
                      {t.code ? `${t.code} - ` : ""}
                      {t.name}
                      {r.role === "editor" && (
                        <span className="text-slate-400">
                          {" "}(accepting seats them on this track)
                        </span>
                      )}
                    </p>
                  );
                })()}

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <ActionForm
                    action={decideVolunteerRequest}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    {/* No track named at sign-up — let the Convener settle it
                        here, before the welcome email goes out saying which
                        track they are on. Accepting first and seating later
                        would send that email with the line missing. */}
                    {!(Array.isArray(r.tracks) ? r.tracks[0] : r.tracks)?.name && (
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-medium text-slate-500">
                          {r.role === "editor" ? "Assign track" : "Track (expertise)"}
                        </span>
                        <select
                          name="track_id"
                          defaultValue=""
                          className="input w-56 max-w-full text-xs"
                        >
                          <option value="">Not assigned</option>
                          {tracks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.code ? `${t.code} - ` : ""}
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
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
                  <th className="py-2 pr-3">Track</th>
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
                    {/* The track the offer was recorded against. An offer made
                        without one used to stay trackless for good: nothing
                        displayed it and nothing could set it. Show it, and
                        offer the picker when it is missing. */}
                    <td className="py-2 pr-3">
                      {(() => {
                        const t = Array.isArray(r.tracks) ? r.tracks[0] : r.tracks;
                        if (t?.name) {
                          return (
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {t.code ? `${t.code} - ` : ""}
                              {t.name}
                            </span>
                          );
                        }
                        // No column to write to yet (migration 0082): say so
                        // rather than offer a control that cannot save.
                        if (!trackColumnReady) {
                          return (
                            <span className="text-xs text-slate-400">
                              Not available yet
                            </span>
                          );
                        }
                        return (
                          <ActionForm
                            action={assignVolunteerTrack}
                            className="flex flex-wrap items-center gap-1"
                          >
                            <input type="hidden" name="request_id" value={r.id} />
                            <select
                              name="track_id"
                              defaultValue=""
                              aria-label={`Assign a track to ${r.profiles?.full_name ?? "this volunteer"}`}
                              className="input w-44 max-w-full text-xs"
                            >
                              <option value="">Not assigned</option>
                              {tracks.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.code ? `${t.code} - ` : ""}
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <SubmitButton
                              variant="secondary"
                              className="!px-2 !py-1 text-[11px]"
                            >
                              Assign
                            </SubmitButton>
                          </ActionForm>
                        );
                      })()}
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
