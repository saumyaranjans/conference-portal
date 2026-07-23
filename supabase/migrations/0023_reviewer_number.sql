-- =====================================================================
-- Give each reviewer a stable number within a submission (Reviewer 1,
-- Reviewer 2, ...). Assigned on invite and never reshuffled, so removing
-- one assignment does not renumber the others.
-- =====================================================================
alter table assignments
  add column if not exists reviewer_number int;

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
    select coalesce(max(reviewer_number), 0) + 1 into n
      from assignments
     where submission_id = new.submission_id;
    new.reviewer_number := n;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_reviewer_number on assignments;
create trigger trg_assign_reviewer_number
  before insert on assignments
  for each row execute function assign_reviewer_number();

-- Number any assignments that already exist, in invite order.
with ranked as (
  select id,
         row_number() over (partition by submission_id order by created_at) as rn
    from assignments
   where reviewer_number is null
)
update assignments a
   set reviewer_number = ranked.rn
  from ranked
 where a.id = ranked.id;
