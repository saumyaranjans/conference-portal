-- =====================================================================
-- Rule: once a paper is accepted (final decision by the Convener, after
-- reviewer and track-editor approval) it can no longer be withdrawn.
-- Enforced in the database so no client can bypass it.
-- =====================================================================
create or replace function prevent_accepted_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'withdrawn' and old.status = 'accepted' then
    raise exception 'An accepted paper cannot be withdrawn.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_accepted_withdrawal on submissions;
create trigger trg_prevent_accepted_withdrawal
  before update on submissions
  for each row execute function prevent_accepted_withdrawal();
