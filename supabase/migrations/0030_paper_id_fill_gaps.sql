-- =====================================================================
-- Paper ID numbering: fill gaps left by deletions.
--
-- Previously a new paper always took max(paper_number)+1 within its track,
-- so a paper deleted by the Convener left a permanent hole in the sequence
-- (e.g. AIF-001, AIF-003 after AIF-002 is removed). Now the next paper takes
-- the SMALLEST unused positive number in that track, backfilling the hole
-- first; only when there are no gaps does it extend the sequence. Existing
-- Paper IDs are never changed. Per-track advisory lock still serialises it.
-- =====================================================================
create or replace function assign_paper_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tcode text;
  seq   int;
begin
  if new.status = 'submitted' and new.paper_id is null and new.track_id is not null then
    -- serialize per-track numbering
    perform pg_advisory_xact_lock(hashtext(new.track_id::text));

    select coalesce(nullif(code, ''), 'PAP') into tcode from tracks where id = new.track_id;
    if tcode is null then tcode := 'PAP'; end if;

    -- Smallest positive integer not currently used by a paper in this track.
    -- The candidate range 1..(max+1) always contains at least one free slot.
    select min(g.n) into seq
    from generate_series(
           1,
           coalesce(
             (select max(paper_number) from submissions where track_id = new.track_id),
             0
           ) + 1
         ) as g(n)
    where not exists (
      select 1
      from submissions s
      where s.track_id = new.track_id
        and s.paper_number = g.n
    );

    new.paper_number := seq;
    new.paper_id := tcode || '-' || lpad(seq::text, 3, '0');
  end if;
  return new;
end;
$$;

-- Trigger definition is unchanged; recreate defensively so this migration is
-- self-contained.
drop trigger if exists trg_assign_paper_id on submissions;
create trigger trg_assign_paper_id
  before insert or update on submissions
  for each row execute function assign_paper_id();
