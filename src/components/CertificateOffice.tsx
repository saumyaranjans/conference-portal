import Link from "next/link";

import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CertificatePreviewButton } from "@/components/CertificatePreviewButton";
import { PageHeader, StatCard, formatDate } from "@/components/ui/Primitives";
import {
  issueCertificate,
  revokeCertificate,
  updateParticipantCertificateEvidence,
  updateTrackEditorServiceEvidence,
  uploadCertificateSignature,
} from "@/lib/certificateActions";
import {
  CERTIFICATE_SIGNATORIES,
  participantEligibility,
  withSalutation,
} from "@/lib/certificates";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

function asMap(rows: any[] | null | undefined, key: string) {
  return new Map((rows ?? []).map((row) => [row[key], row]));
}

function CertificateActions({
  type,
  subjectId,
  conferenceId,
  issuance,
  eligible,
  signaturesReady,
  compact = false,
}: {
  type: "participant" | "reviewer" | "track_editor";
  subjectId: string;
  conferenceId: string;
  issuance?: any;
  eligible: boolean;
  signaturesReady: boolean;
  /** Slim inline layout (input + Issue + Preview on one row). */
  compact?: boolean;
}) {
  if (issuance) {
    return (
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Link
          href={`/api/certificates/${issuance.id}`}
          className="btn-primary"
          target="_blank"
        >
          View / Download PDF
        </Link>
        <ActionForm action={revokeCertificate} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="certificate_id" value={issuance.id} />
          <label className="text-xs text-slate-600">
            Revocation reason
            <input
              className="input mt-1 min-w-56"
              name="reason"
              required
              placeholder="Correction required"
            />
          </label>
          <SubmitButton variant="danger" className="text-xs">
            Revoke
          </SubmitButton>
        </ActionForm>
      </div>
    );
  }

  const disabled = !eligible || !signaturesReady;
  return (
    <div className={compact ? "flex flex-wrap items-end gap-2" : "mt-4 space-y-2"}>
      <ActionForm
        action={issueCertificate}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="certificate_type" value={type} />
        <input type="hidden" name="subject_id" value={subjectId} />
        <input type="hidden" name="conference_id" value={conferenceId} />
        <label className={compact ? "label text-[11px]" : "label"}>
          {!compact && "Certificate number"}
          <input
            className={`input ${compact ? "h-8 w-48 text-xs" : "mt-1"}`}
            name="certificate_number"
            placeholder="Leave blank to auto-generate"
          />
        </label>
        <SubmitButton
          disabled={disabled}
          className={compact ? "py-1.5 text-xs" : undefined}
          title={disabled ? "Complete eligibility and signatures first" : undefined}
        >
          Issue certificate
        </SubmitButton>
      </ActionForm>
      {/* Preview is available any time, with relaxed checks; it never issues. */}
      <CertificatePreviewButton type={type} subjectId={subjectId} conferenceId={conferenceId} />
    </div>
  );
}

export async function CertificateOffice() {
  await requireRole("admin");
  const admin = createAdminClient();

  const { data: conferences } = await admin
    .from("conferences")
    .select("id, name, acronym, year")
    .order("year", { ascending: false });
  const conference = conferences?.[0];
  if (!conference) {
    return (
      <>
        <PageHeader title="Certificates" subtitle="Editorial Office issuance and verification." />
        <div className="card card-pad">Create the conference before preparing certificates.</div>
      </>
    );
  }

  const [{ data: submissions }, { data: tracks }, { data: signatures }, { data: issuances }] =
    await Promise.all([
      admin
        .from("submissions")
        .select("id, paper_id, title, status, track_id, assigned_editor_id")
        .eq("conference_id", conference.id)
        .neq("status", "draft")
        .neq("status", "rejected")
        .neq("status", "withdrawn"),
      admin.from("tracks").select("id, name, code").eq("conference_id", conference.id),
      admin.from("certificate_signatures").select("signatory_key, uploaded_at"),
      admin
        .from("certificate_issuances")
        .select(
          "id, certificate_number, certificate_type, display_name, submission_author_id, recipient_profile_id, track_editor_id, issued_at, revoked_at, revocation_reason"
        )
        .eq("conference_id", conference.id)
        .order("issued_at", { ascending: false }),
    ]);

  const submissionIds = (submissions ?? []).map((item) => item.id);
  const trackIds = (tracks ?? []).map((item) => item.id);
  const [{ data: authors }, { data: completedReviews }, { data: trackEditors }] =
    await Promise.all([
      submissionIds.length
        ? admin
            .from("submission_authors")
            .select("id, submission_id, profile_id, full_name, email, affiliation, author_order, registration_confirmed, registration_fee_paid")
            .in("submission_id", submissionIds)
            .order("author_order")
        : Promise.resolve({ data: [] as any[] }),
      admin
        .from("reviews")
        .select("id, reviewer_id, assignments!inner(status), submissions!inner(conference_id)")
        .eq("is_submitted", true)
        .eq("assignments.status", "submitted")
        .eq("submissions.conference_id", conference.id),
      trackIds.length
        ? admin
            .from("track_editors")
            .select("id, track_id, profile_id, status, accepted_at")
            .in("track_id", trackIds)
            .eq("status", "accepted")
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const authorIds = (authors ?? []).map((item) => item.id);
  const trackEditorIds = (trackEditors ?? []).map((item) => item.id);
  const reviewerIds = [...new Set((completedReviews ?? []).map((item) => item.reviewer_id))];
  const profileIds = [
    ...new Set([
      ...(authors ?? []).map((item) => item.profile_id).filter(Boolean),
      ...reviewerIds,
      ...(trackEditors ?? []).map((item) => item.profile_id),
    ]),
  ];
  const [{ data: evidence }, { data: serviceEvidence }, { data: profiles }] =
    await Promise.all([
      authorIds.length
        ? admin
            .from("participant_certificate_evidence")
            .select("*")
            .in("submission_author_id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      trackEditorIds.length
        ? admin
            .from("track_editor_service_evidence")
            .select("*")
            .in("track_editor_id", trackEditorIds)
        : Promise.resolve({ data: [] as any[] }),
      profileIds.length
        ? admin
            .from("profiles")
            .select("id, full_name, email, title, affiliation")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const submissionMap = asMap(submissions, "id");
  const trackMap = asMap(tracks, "id");
  const evidenceMap = asMap(evidence, "submission_author_id");
  const serviceMap = asMap(serviceEvidence, "track_editor_id");
  const profileMap = asMap(profiles, "id");
  const signatureMap = asMap(signatures, "signatory_key");
  const activeIssuances = (issuances ?? []).filter((item) => !item.revoked_at);
  const participantIssuanceMap = asMap(
    activeIssuances.filter((item) => item.certificate_type === "participant"),
    "submission_author_id"
  );
  const reviewerIssuanceMap = asMap(
    activeIssuances.filter((item) => item.certificate_type === "reviewer"),
    "recipient_profile_id"
  );
  const editorIssuanceMap = asMap(
    activeIssuances.filter((item) => item.certificate_type === "track_editor"),
    "track_editor_id"
  );
  const signaturesReady = CERTIFICATE_SIGNATORIES.every((item) => signatureMap.has(item.key));

  const reviewCount = new Map<string, number>();
  for (const review of completedReviews ?? []) {
    reviewCount.set(review.reviewer_id, (reviewCount.get(review.reviewer_id) ?? 0) + 1);
  }
  const reviewers = reviewerIds.map((id) => profileMap.get(id)).filter(Boolean);

  // Section scoping:
  // • Authors — only REGISTERED authors (registration confirmed or fee paid).
  // • Reviewers — already only those with ≥1 submitted review (reviewerIds).
  // • Track Editors — only those who actually HANDLED a submission (assigned).
  const registeredAuthors = (authors ?? []).filter(
    (a) => a.registration_confirmed || a.registration_fee_paid
  );
  const handledEditorIds = new Set(
    (submissions ?? []).map((s) => s.assigned_editor_id).filter(Boolean)
  );
  const handlingTrackEditors = (trackEditors ?? []).filter((te) =>
    handledEditorIds.has(te.profile_id)
  );

  const eligibleParticipants = registeredAuthors.filter((item) => {
    const row = evidenceMap.get(item.id);
    const personProfile = item.profile_id ? profileMap.get(item.profile_id) : null;
    return (
      participantEligibility(row).eligible &&
      Boolean((row?.salutation_override || personProfile?.title)?.trim())
    );
  }).length;
  const confirmedEditors = handlingTrackEditors.filter(
    (item) => serviceMap.get(item.id)?.service_confirmed
  ).length;

  return (
    <>
      <PageHeader
        title="Certificate Office"
        subtitle={`${conference.acronym} · Editorial Office verification, issuance and secure PDF downloads.`}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Eligible presenters" value={eligibleParticipants} />
        <StatCard label="Completed reviewers" value={reviewers.length} />
        <StatCard label="Confirmed Track Editors" value={confirmedEditors} />
        <StatCard label="Active certificates" value={activeIssuances.length} />
      </div>

      <section className="card card-pad mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Official signatures
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Stored privately. Certificate issuance remains disabled until all three genuine signatures are uploaded.
            </p>
          </div>
          <span className={`badge ${signaturesReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {signaturesReady ? "Signature set ready" : `${signatureMap.size}/3 uploaded`}
          </span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {CERTIFICATE_SIGNATORIES.map((signatory) => {
            const signature = signatureMap.get(signatory.key);
            return (
              <article key={signatory.key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-semibold text-slate-900 dark:text-white">{signatory.name}</p>
                <p className="text-xs text-slate-500">{signatory.role}</p>
                <p className={`mt-2 text-xs font-medium ${signature ? "text-emerald-700" : "text-amber-700"}`}>
                  {signature ? `Uploaded ${formatDate(signature.uploaded_at)}` : "Awaiting genuine signature"}
                </p>
                <ActionForm action={uploadCertificateSignature} className="mt-3 space-y-2">
                  <input type="hidden" name="signatory_key" value={signatory.key} />
                  <input
                    type="file"
                    name="signature"
                    accept="image/png,image/jpeg"
                    className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2"
                    required
                  />
                  <SubmitButton variant="secondary" className="w-full text-xs">
                    {signature ? "Replace signature" : "Upload signature"}
                  </SubmitButton>
                </ActionForm>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Authors — participant certificates
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Only registered authors appear here. Eligibility is individual — each
            named author must independently have payment, amount, attendance and
            presentation verified.
          </p>
        </div>
        <div className="space-y-3">
          {registeredAuthors.length === 0 && (
            <p className="text-sm text-slate-400">
              No registered authors yet.
            </p>
          )}
          {registeredAuthors.map((author) => {
            const submission = submissionMap.get(author.submission_id);
            const track = trackMap.get(submission?.track_id);
            const row = evidenceMap.get(author.id) ?? {};
            const status = participantEligibility(row);
            const personProfile = author.profile_id ? profileMap.get(author.profile_id) : null;
            if (!(row.salutation_override || personProfile?.title)?.trim()) {
              status.missing.push("salutation");
              status.eligible = false;
            }
            const displayName = withSalutation(
              author.full_name,
              row.salutation_override || personProfile?.title
            );
            return (
              <details key={author.id} className="card overflow-hidden">
                <summary className="cursor-pointer list-none px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{displayName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {submission?.paper_id ?? "Paper"} · {submission?.title} · {track?.name}
                      </p>
                    </div>
                    <span className={`badge ${status.eligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {status.eligible ? "Eligible" : `Missing ${status.missing.length} item${status.missing.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </summary>
                <div className="border-t border-slate-200 px-5 py-5 dark:border-slate-700">
                  <ActionForm action={updateParticipantCertificateEvidence} className="space-y-4">
                    <input type="hidden" name="submission_author_id" value={author.id} />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="label">
                        Salutation
                        <input className="input mt-1" name="salutation_override" defaultValue={row.salutation_override ?? personProfile?.title ?? ""} placeholder="Prof." />
                      </label>
                      <label className="label">
                        Amount paid
                        <input className="input mt-1" name="amount_paid" type="number" min="0" step="0.01" defaultValue={row.amount_paid ?? ""} />
                      </label>
                      <label className="label">
                        Currency
                        <select className="input mt-1" name="currency" defaultValue={row.currency ?? "INR"}>
                          <option value="INR">INR</option>
                          <option value="USD">USD</option>
                        </select>
                      </label>
                      <label className="label">
                        Payment reference
                        <input className="input mt-1" name="payment_reference" defaultValue={row.payment_reference ?? ""} />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input type="checkbox" name="registration_fee_paid" defaultChecked={row.registration_fee_paid ?? false} />
                        Registration fee paid
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input type="checkbox" name="glogift_member" defaultChecked={row.glogift_member ?? false} />
                        GIFT Society member
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input type="checkbox" name="attended_confirmed" defaultChecked={row.attended_confirmed ?? false} />
                        Attendance confirmed
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                        <input type="checkbox" name="presentation_confirmed" defaultChecked={row.presentation_confirmed ?? false} />
                        Presentation confirmed
                      </label>
                      <label className="label">
                        Presentation date
                        <input className="input mt-1" name="presentation_date" type="date" min="2027-02-25" max="2027-02-27" defaultValue={row.presentation_date ?? ""} />
                      </label>
                    </div>
                    <label className="label">
                      Editorial note
                      <textarea className="input mt-1" name="notes" rows={2} defaultValue={row.notes ?? ""} />
                    </label>
                    <SubmitButton variant="secondary">Save verification</SubmitButton>
                  </ActionForm>
                  {!status.eligible && (
                    <p className="mt-3 text-xs text-amber-700">Required: {status.missing.join(", ")}.</p>
                  )}
                  <CertificateActions
                    type="participant"
                    subjectId={author.id}
                    conferenceId={conference.id}
                    issuance={participantIssuanceMap.get(author.id)}
                    eligible={status.eligible}
                    signaturesReady={signaturesReady}
                  />
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Reviewer certificates</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Generic appreciation certificates become eligible after at least one submitted review. Attendance and payment are not required.
        </p>
        <div className="mt-4 space-y-2">
          {reviewers.map((reviewer: any) => (
            <article
              key={reviewer.id}
              className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {withSalutation(reviewer.full_name, reviewer.title)}
                  {reviewer.affiliation && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {reviewer.affiliation}
                    </span>
                  )}
                </p>
                <span className={`badge mt-1 ${reviewer.title ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {reviewer.title ? <>Service verified · {reviewCount.get(reviewer.id)} submitted review{reviewCount.get(reviewer.id) === 1 ? "" : "s"}</> : "Salutation required"}
                </span>
              </div>
              <CertificateActions
                type="reviewer"
                subjectId={reviewer.id}
                conferenceId={conference.id}
                issuance={reviewerIssuanceMap.get(reviewer.id)}
                eligible={Boolean(reviewer.title)}
                signaturesReady={signaturesReady}
                compact
              />
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Track Editor certificates</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Only Track Editors who have handled a submission appear here. Attendance
          and payment are not required — the Editorial Office confirms the
          appointed Track Editor served the track.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {handlingTrackEditors.length === 0 && (
            <p className="text-sm text-slate-400">
              No Track Editors have handled a submission yet.
            </p>
          )}
          {handlingTrackEditors.map((membership) => {
            const editor = profileMap.get(membership.profile_id);
            const track = trackMap.get(membership.track_id);
            const service = serviceMap.get(membership.id) ?? {};
            return (
              <article key={membership.id} className="card card-pad">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {withSalutation(editor?.full_name ?? "Track Editor", editor?.title)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{track?.name}</p>
                <ActionForm action={updateTrackEditorServiceEvidence} className="mt-4 space-y-3">
                  <input type="hidden" name="track_editor_id" value={membership.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="service_confirmed" defaultChecked={service.service_confirmed ?? false} />
                    Editorial Office confirms track handling
                  </label>
                  <label className="label">
                    Confirmation date
                    <input className="input mt-1" type="date" name="service_date" defaultValue={service.service_date ?? ""} />
                  </label>
                  <label className="label">
                    Editorial note
                    <textarea className="input mt-1" name="notes" rows={2} defaultValue={service.notes ?? ""} />
                  </label>
                  <SubmitButton variant="secondary">Save service confirmation</SubmitButton>
                </ActionForm>
                <CertificateActions
                  type="track_editor"
                  subjectId={membership.id}
                  conferenceId={conference.id}
                  issuance={editorIssuanceMap.get(membership.id)}
                  eligible={Boolean(service.service_confirmed && editor?.title)}
                  signaturesReady={signaturesReady}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Issuance history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {['Certificate', 'Type', 'Recipient', 'Issued', 'Status'].map((heading) => (
                  <th key={heading} className="th">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(issuances ?? []).map((issuance) => (
                <tr key={issuance.id}>
                  <td className="td font-mono text-xs">{issuance.certificate_number}</td>
                  <td className="td capitalize">{issuance.certificate_type.replace('_', ' ')}</td>
                  <td className="td">{issuance.display_name}</td>
                  <td className="td">{formatDate(issuance.issued_at)}</td>
                  <td className="td">
                    <span className={`badge ${issuance.revoked_at ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {issuance.revoked_at ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
              {!issuances?.length && (
                <tr><td className="td text-slate-500" colSpan={5}>No certificates issued yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
