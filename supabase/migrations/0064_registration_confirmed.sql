-- =====================================================================
-- Split "registered" from "fee paid" on submission_authors.
--
-- Author Management now has three staff toggles: attended, registered
-- (enrolled for the event) and paid (fee actually received). Attendance and
-- payment already had columns (attended_confirmed, registration_fee_paid);
-- this adds the registration flag. Certificate generation gates on attended +
-- paid; "registered" is an informational status.
-- =====================================================================

alter table submission_authors
  add column if not exists registration_confirmed boolean not null default false,
  add column if not exists registration_confirmed_at timestamptz,
  add column if not exists registration_confirmed_by
    uuid references profiles(id) on delete set null;

-- Keep the new organiser flag tamper-resistant like the others: only
-- conference staff (admin / chief) or the service role may change it.
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
