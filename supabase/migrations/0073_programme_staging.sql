-- Staged publishing and change notification for the conference programme.
--
-- Two decisions drive this migration:
--
-- 1. Edits to a published session must NOT reach the public until the Convener
--    re-publishes, yet the session must stay visible throughout — a delegate
--    looking up their slot mid-rearrangement should find the last agreed
--    version, not a gap. So the public reads a SNAPSHOT taken at publish time,
--    while the live rows carry the work in progress.
--
-- 2. Authors are told about a change only when what they were told is no longer
--    true. That needs a record of what was actually communicated, which has to
--    outlive the schedule row itself — otherwise removing a paper from the
--    programme erases the evidence that anyone was ever promised a slot.

-- ------------------------------------------------------- staged publishing --
alter table conference_sessions
  -- Everything the public page needs, frozen at publish time.
  add column if not exists published_snapshot jsonb,
  -- Set by trigger whenever the live session drifts from that snapshot.
  add column if not exists has_unpublished_changes boolean not null default false;

comment on column conference_sessions.published_snapshot is
  'The session exactly as last published. The public schedule reads this, never the live rows, so a half-finished rearrangement is never visible.';
comment on column conference_sessions.has_unpublished_changes is
  'True when the live session differs from published_snapshot. Maintained by trigger, so no edit path can forget to set it.';

-- 0072 put a notified_at on session_papers. It is superseded by
-- programme_notice_state below, which survives the row being deleted — the
-- case that matters most, since a withdrawn paper still needs telling.
alter table session_papers drop column if exists notified_at;

-- ------------------------------------------------- what authors were told --
-- One row per paper: the schedule as last communicated to its authors. Kept
-- outside session_papers deliberately, so a paper dropped from the programme
-- still shows that a slot was promised and a withdrawal notice is owed.
create table if not exists programme_notice_state (
  submission_id uuid primary key references submissions(id) on delete cascade,
  session_id uuid references conference_sessions(id) on delete set null,
  session_date date,
  time_slot text,
  mode text,
  venue text,
  notified_at timestamptz not null default now(),
  notified_by uuid references profiles(id)
);

comment on table programme_notice_state is
  'The schedule each paper''s authors were last told. Compare against the live schedule to find who needs re-notifying; a row with no matching session_papers row means the paper was dropped and a withdrawal notice is owed.';

-- ------------------------------------------------------------ dirty marking --
-- A flag maintained by application code is a flag some code path eventually
-- forgets. These triggers make drift impossible to miss regardless of which
-- action edits the programme.

create or replace function mark_session_dirty() returns trigger
language plpgsql as $$
begin
  -- Only content changes count. Publishing itself writes status, snapshot and
  -- the flag, and must not re-dirty the row it has just cleaned.
  if (
    new.title is distinct from old.title
    or new.mode is distinct from old.mode
    or new.track_id is distinct from old.track_id
    or new.session_date is distinct from old.session_date
    or new.time_slot is distinct from old.time_slot
    or new.classroom is distinct from old.classroom
    or new.academic_block is distinct from old.academic_block
    or new.meeting_link is distinct from old.meeting_link
    or new.sort_order is distinct from old.sort_order
  ) then
    new.has_unpublished_changes := true;
  end if;
  return new;
end $$;

drop trigger if exists conference_sessions_dirty on conference_sessions;
create trigger conference_sessions_dirty
  before update on conference_sessions
  for each row execute function mark_session_dirty();

-- Papers, chairs and volunteers belong to a session; changing any of them
-- changes the session the public would see.
create or replace function mark_parent_session_dirty() returns trigger
language plpgsql as $$
declare
  sid uuid := coalesce(new.session_id, old.session_id);
begin
  if sid is not null then
    update conference_sessions
      set has_unpublished_changes = true
      where id = sid and has_unpublished_changes = false;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists session_papers_dirty on session_papers;
create trigger session_papers_dirty
  after insert or update or delete on session_papers
  for each row execute function mark_parent_session_dirty();

drop trigger if exists session_chairs_dirty on session_chairs;
create trigger session_chairs_dirty
  after insert or update or delete on session_chairs
  for each row execute function mark_parent_session_dirty();

drop trigger if exists session_volunteers_dirty on session_volunteers;
create trigger session_volunteers_dirty
  after insert or update or delete on session_volunteers
  for each row execute function mark_parent_session_dirty();

-- --------------------------------------------------------------------- RLS --
alter table programme_notice_state enable row level security;

drop policy if exists programme_notice_state_staff on programme_notice_state;
create policy programme_notice_state_staff on programme_notice_state for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));
