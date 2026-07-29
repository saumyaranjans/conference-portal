-- =====================================================================
-- Track chairs: invited, then assigned paper by paper.
--
-- Three rules:
--   1. A chair is INVITED to a track and must accept before they chair it.
--   2. Chairing a track shows them nothing. A chair sees a paper only when
--      the Convener assigns that specific paper to them.
--   3. Nobody may chair more than two tracks.
--
-- Supersedes the earlier 0035 draft, which still granted access by track
-- membership. Safe to run more than once.
-- =====================================================================

-- ---- 1. Invitations live on track_editors itself --------------------
alter table track_editors
  add column if not exists status text not null default 'accepted',
  add column if not exists token text,
  add column if not exists invited_by uuid references profiles(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'track_editors_status_check'
  ) then
    alter table track_editors
      add constraint track_editors_status_check
      check (status in ('invited', 'accepted'));
  end if;
end $$;

create unique index if not exists track_editors_token_idx
  on track_editors (token) where token is not null;

comment on column track_editors.status is
  'invited = asked to chair this track; accepted = they agreed and now chair it.';

-- ---- 3. At most two tracks per chair --------------------------------
create or replace function enforce_chair_track_cap()
returns trigger
language plpgsql
as $$
declare
  held int;
begin
  if new.status <> 'accepted' then
    return new;
  end if;

  select count(*) into held
  from track_editors
  where profile_id = new.profile_id
    and status = 'accepted'
    and track_id <> new.track_id;

  if held >= 2 then
    raise exception
      'A track chair may chair at most two tracks (this person already chairs %).', held
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists trg_chair_track_cap on track_editors;
create trigger trg_chair_track_cap
  before insert or update on track_editors
  for each row execute function enforce_chair_track_cap();

-- ---- 2. Access follows the per-paper assignment alone ----------------
-- Chairing the track is no longer enough: the Convener must hand over the
-- specific paper. Authors never act on their own submission, however assigned.
create or replace function edits_submission(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from submissions s
    where s.id = sub_id
      and s.assigned_editor_id is not null
      and s.assigned_editor_id = auth.uid()
  )
  and not owns_submission(sub_id)
  and not is_coauthor(sub_id);
$$;
