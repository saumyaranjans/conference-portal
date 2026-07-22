-- =====================================================================
-- Split the single "designation" into two fields:
--   * designation         — free text (job title, e.g. Professor)
--   * participant_category — fixed dropdown (Faculty / Academician, ...)
-- Historically `designation` held the category, so reclassify existing
-- values into participant_category and leave designation blank to refill.
-- =====================================================================
alter table profiles
  add column if not exists participant_category text not null default '';
alter table submission_authors
  add column if not exists participant_category text not null default '';

update profiles
   set participant_category = designation, designation = ''
 where designation <> '' and participant_category = '';

update submission_authors
   set participant_category = designation, designation = ''
 where designation <> '' and participant_category = '';

-- Recreate the sign-up handler so both fields land on the profile.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fn text := coalesce(m->>'first_name', '');
  ln text := coalesce(m->>'last_name', '');
  fullname text := coalesce(m->>'full_name', '');
begin
  if fullname = '' then
    fullname := trim(both ' ' from (fn || ' ' || ln));
  end if;

  insert into profiles (
    id, email, full_name, first_name, last_name, title, gender, mobile,
    affiliation, institution, department, country, designation,
    participant_category
  )
  values (
    new.id,
    new.email,
    fullname,
    fn,
    ln,
    coalesce(m->>'title', ''),
    coalesce(m->>'gender', ''),
    coalesce(m->>'mobile', ''),
    coalesce(nullif(m->>'institution', ''), m->>'affiliation', ''),
    coalesce(m->>'institution', ''),
    coalesce(m->>'department', ''),
    coalesce(m->>'country', ''),
    coalesce(m->>'designation', ''),
    coalesce(m->>'participant_category', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
