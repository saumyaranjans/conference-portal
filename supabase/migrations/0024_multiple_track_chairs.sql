-- =====================================================================
-- Multiple track chairs (track editors) per track, shared: any chair can
-- act on the track's papers, except papers they authored (conflict of
-- interest). Replaces the single tracks.editor_id as the source of truth.
-- =====================================================================
create table if not exists track_editors (
  id         uuid primary key default gen_random_uuid(),
  track_id   uuid not null references tracks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (track_id, profile_id)
);

alter table track_editors enable row level security;

drop policy if exists "track editors readable" on track_editors;
create policy "track editors readable" on track_editors
  for select using (true);

drop policy if exists "track editors managed" on track_editors;
create policy "track editors managed" on track_editors
  for all using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- Backfill existing single editors.
insert into track_editors (track_id, profile_id)
select id, editor_id from tracks where editor_id is not null
on conflict (track_id, profile_id) do nothing;

-- A user chairs a submission if they chair its track AND are not one of its
-- authors (conflict of interest).
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
    join track_editors te on te.track_id = s.track_id
    where s.id = sub_id and te.profile_id = auth.uid()
  )
  and not owns_submission(sub_id)
  and not is_coauthor(sub_id);
$$;
