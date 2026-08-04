-- =====================================================================
-- Record WHICH fee a delegate paid (Early Bird vs Regular) on the Author
-- Management "Participation desk". The displayed fee stays timeline-driven
-- (early-bird through 20 Dec 2026, regular after); this column just captures
-- what was actually collected, independent of when it is recorded.
-- =====================================================================

alter table submission_authors
  add column if not exists registration_fee_tier text
    check (registration_fee_tier in ('early', 'regular'));

-- Keep the new flag tamper-resistant like the other organiser fields.
create or replace function protect_submission_author_office_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.attended_confirmed is distinct from new.attended_confirmed
    or old.attendance_confirmed_at is distinct from new.attendance_confirmed_at
    or old.attendance_confirmed_by is distinct from new.attendance_confirmed_by
    or old.registration_confirmed is distinct from new.registration_confirmed
    or old.registration_confirmed_at is distinct from new.registration_confirmed_at
    or old.registration_confirmed_by is distinct from new.registration_confirmed_by
    or old.registration_fee_paid is distinct from new.registration_fee_paid
    or old.registration_fee_paid_at is distinct from new.registration_fee_paid_at
    or old.registration_fee_paid_by is distinct from new.registration_fee_paid_by
    or old.registration_fee_tier is distinct from new.registration_fee_tier
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin')
    and not has_role('chief') then
    raise exception 'Organiser verification fields may only be changed by conference staff.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function protect_submission_author_office_fields()
  from public, anon, authenticated;
