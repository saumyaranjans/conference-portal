-- =====================================================================
-- Rule: an author may hold at most 2 submissions (withdrawn ones don't
-- count, so withdrawing frees a slot). Enforced in the database so it
-- cannot be bypassed by any client.
-- =====================================================================
create or replace function enforce_submission_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  select count(*) into cnt
    from submissions
   where author_id = new.author_id
     and status <> 'withdrawn';

  if cnt >= 2 then
    raise exception
      'Submission limit reached: each author may hold at most 2 submissions.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_submission_cap on submissions;
create trigger trg_submission_cap
  before insert on submissions
  for each row execute function enforce_submission_cap();
