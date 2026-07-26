-- =====================================================================
-- Reviewer invitations. A track chair invites an outside expert who has
-- no portal account yet: they enter the reviewer's name/designation/
-- affiliation/email, the portal mints an unguessable token, and the chair
-- pastes a generated email into their own mail client. When the invitee
-- signs up through the token link they are granted the reviewer role and
-- assigned to that specific submission (handled in acceptReviewerInvite).
--
-- The token link is read server-side with the service-role client only,
-- so this table is never exposed to anon. RLS below covers the chair's
-- own management of invitations from their submission page.
-- =====================================================================
create table if not exists reviewer_invitations (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  invited_by    uuid references profiles(id) on delete set null,
  token         text not null unique,
  full_name     text not null default '',
  designation   text not null default '',
  affiliation   text not null default '',
  email         text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'revoked')),
  accepted_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);

create index if not exists reviewer_invitations_submission_idx
  on reviewer_invitations (submission_id);
create index if not exists reviewer_invitations_email_idx
  on reviewer_invitations (lower(email));

alter table reviewer_invitations enable row level security;

-- A chair who edits the submission (or a Convener / Editorial Office) may
-- create, read and update invitations for that submission. The accept
-- flow bypasses this via the service-role client keyed by the token.
drop policy if exists "invitations readable by chair" on reviewer_invitations;
create policy "invitations readable by chair" on reviewer_invitations
  for select using (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );

drop policy if exists "invitations created by chair" on reviewer_invitations;
create policy "invitations created by chair" on reviewer_invitations
  for insert with check (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );

drop policy if exists "invitations updated by chair" on reviewer_invitations;
create policy "invitations updated by chair" on reviewer_invitations
  for update using (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  ) with check (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );
