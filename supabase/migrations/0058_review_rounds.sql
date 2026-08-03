-- =====================================================================
-- Multi-round (revision) review support.
--
-- A revision resubmission opens a new review round. The same reviewer may
-- therefore hold more than one assignment on a paper — one per round — so the
-- old "one assignment per (submission, reviewer)" rule is relaxed to include
-- the round. Each review carries its round too. `submissions.review_round`
-- tracks the currently-open round (1 on first submission, bumped on each
-- revision resubmission).
--
-- Banked-accept rule (enforced in app code): once a reviewer recommends
-- Accept in any round, that Accept is terminal for them — they are not
-- reassigned, and it counts toward the required Accepts in every later round.
-- =====================================================================
alter table assignments  add column if not exists round int not null default 1;
alter table reviews      add column if not exists round int not null default 1;
alter table submissions  add column if not exists review_round int not null default 1;

-- One assignment per reviewer PER ROUND (was: per submission).
alter table assignments drop constraint if exists assignments_submission_id_reviewer_id_key;
create unique index if not exists assignments_submission_reviewer_round_key
  on assignments (submission_id, reviewer_id, round);

-- Keep a reviewer's number stable across rounds: reuse the number they already
-- hold on this submission, otherwise take the next free one. So "Reviewer 1"
-- stays Reviewer 1 when re-invited for a later round.
create or replace function assign_reviewer_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if new.reviewer_number is null then
    perform pg_advisory_xact_lock(hashtext(new.submission_id::text));
    select reviewer_number into n
      from assignments
     where submission_id = new.submission_id
       and reviewer_id = new.reviewer_id
       and reviewer_number is not null
     limit 1;
    if n is null then
      select coalesce(max(reviewer_number), 0) + 1 into n
        from assignments
       where submission_id = new.submission_id;
    end if;
    new.reviewer_number := n;
  end if;
  return new;
end;
$$;
