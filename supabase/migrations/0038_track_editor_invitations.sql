-- =====================================================================
-- Inviting a Track Editor who has no account yet.
--
-- The Convener types their name, designation, affiliation and email; the
-- portal mints a token and emails a sign-up link. Completing sign-up from
-- that link pre-fills those details, grants the editor role and makes them
-- a Track Editor for the invited track — the same shape as the reviewer
-- invitations in 0029.
-- =====================================================================
create table if not exists track_editor_invitations (
  id           uuid primary key default gen_random_uuid(),
  track_id     uuid not null references tracks(id) on delete cascade,
  invited_by   uuid references profiles(id) on delete set null,
  token        text not null unique,
  full_name    text not null,
  designation  text not null default '',
  affiliation  text not null default '',
  email        text not null,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'revoked')),
  accepted_by  uuid references profiles(id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists track_editor_invitations_track_idx
  on track_editor_invitations (track_id);
create index if not exists track_editor_invitations_email_idx
  on track_editor_invitations (lower(email));

alter table track_editor_invitations enable row level security;

-- Never exposed to anon: the sign-up page reads it with the service key.
drop policy if exists "chief manages track editor invitations"
  on track_editor_invitations;
create policy "chief manages track editor invitations"
  on track_editor_invitations
  for all using (has_role('chief') or has_role('admin'))
  with check (has_role('chief') or has_role('admin'));

comment on table track_editor_invitations is
  'Pending invitations for people not yet on the portal to serve as Track Editor.';
