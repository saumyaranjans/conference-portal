-- =====================================================================
-- Paper IDs follow their track's code.
--
-- assign_paper_id() stamps `paper_id` once, at first submission, from the
-- track code of that moment. Rename the track afterwards and the stored ID
-- keeps the old prefix — INV-001 sitting in a track now coded STR.
--
-- This makes the code the single source of truth: change tracks.code and
-- every paper in that track is renumbered to match, keeping its number.
-- =====================================================================
create or replace function resync_paper_ids_for_track(t_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  tcode   text;
  changed int;
begin
  select coalesce(nullif(code, ''), 'PAP') into tcode from tracks where id = t_id;
  if tcode is null then
    return 0;
  end if;

  with fixed as (
    update submissions
    set paper_id = tcode || '-' || lpad(paper_number::text, 3, '0')
    where track_id = t_id
      and paper_number is not null
      and paper_id is distinct from tcode || '-' || lpad(paper_number::text, 3, '0')
    returning 1
  )
  select count(*) into changed from fixed;

  return changed;
end;
$$;

comment on function resync_paper_ids_for_track(uuid) is
  'Rewrites every stored paper_id in a track to match the track''s current code, preserving each paper number.';

-- Renaming a code now cascades to the papers automatically.
create or replace function on_track_code_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is distinct from old.code then
    perform resync_paper_ids_for_track(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_track_code_changed on tracks;
create trigger trg_track_code_changed
  after update of code on tracks
  for each row execute function on_track_code_changed();

-- One-off: bring every existing paper in line with its track's code today,
-- catching renames that happened before this trigger existed.
do $$
declare
  t record;
  n int;
begin
  for t in select id, code from tracks loop
    n := resync_paper_ids_for_track(t.id);
    if n > 0 then
      raise notice 'track %: % paper id(s) renumbered', t.code, n;
    end if;
  end loop;
end $$;
