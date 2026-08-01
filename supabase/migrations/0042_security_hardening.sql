-- =====================================================================
-- Security hardening: expiring invitations, constrained uploads and
-- removal of public RPC access to internal trigger/maintenance functions.
-- =====================================================================

-- Invitation links are bearer credentials. Limit their lifetime so an old
-- forwarded email cannot grant privileges indefinitely.
alter table reviewer_invitations
  add column if not exists expires_at timestamptz not null
  default (now() + interval '14 days');

alter table track_editor_invitations
  add column if not exists expires_at timestamptz not null
  default (now() + interval '14 days');

alter table track_editors
  add column if not exists invite_expires_at timestamptz
  default (now() + interval '14 days');

update track_editors
set invite_expires_at = coalesce(invited_at, now()) + interval '14 days'
where token is not null and invite_expires_at is null;

create index if not exists reviewer_invitations_pending_expiry_idx
  on reviewer_invitations (expires_at) where status = 'pending';
create index if not exists track_editor_invitations_pending_expiry_idx
  on track_editor_invitations (expires_at) where status = 'pending';

-- Enforce the same upload rules on the storage service, not just in the UI.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[]
where id = 'papers';

drop policy if exists "authors delete own papers" on storage.objects;
create policy "authors delete own papers" on storage.objects
  for delete using (
    bucket_id = 'papers'
    and exists (
      select 1 from submissions s
      where s.author_id = auth.uid()
        and s.id::text = (storage.foldername(name))[1]
    )
  );

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. These are
-- internal trigger/maintenance functions, not application RPC endpoints.
revoke all on function handle_new_user() from public, anon, authenticated;
revoke all on function on_assignment_created() from public, anon, authenticated;
revoke all on function on_review_submitted() from public, anon, authenticated;
revoke all on function on_decision_created() from public, anon, authenticated;
revoke all on function on_submission_submitted() from public, anon, authenticated;
revoke all on function assign_paper_id() from public, anon, authenticated;
revoke all on function enforce_submission_cap() from public, anon, authenticated;
revoke all on function prevent_accepted_withdrawal() from public, anon, authenticated;
revoke all on function assign_reviewer_number() from public, anon, authenticated;
revoke all on function enforce_chair_track_cap() from public, anon, authenticated;
revoke all on function resync_paper_ids_for_track(uuid) from public, anon, authenticated;
revoke all on function on_track_code_changed() from public, anon, authenticated;

comment on column reviewer_invitations.expires_at is
  'Bearer invitation expires 14 days after creation.';
comment on column track_editor_invitations.expires_at is
  'Bearer invitation expires 14 days after creation.';
comment on column track_editors.invite_expires_at is
  'Track-chair acceptance token expiry; accepted membership is unaffected.';
