-- =====================================================================
-- Staff-recorded ACTUAL participation mode, when a delegate later asks to
-- switch On-site <-> Virtual. The originally reported mode stays on
-- submissions.participation_mode (shown as the "Intentions"); this override
-- drives the "Actual (as on today)" view and is only set when it differs.
-- =====================================================================

alter table submission_authors
  add column if not exists participation_mode_actual text
    check (participation_mode_actual in ('onsite', 'virtual'));

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
    or old.participation_mode_actual is distinct from new.participation_mode_actual
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
