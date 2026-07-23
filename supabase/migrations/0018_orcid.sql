-- Capture the participant's ORCID iD.
alter table profiles
  add column if not exists orcid text not null default '';

-- Recreate the sign-up handler so ORCID lands on the profile too.
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
    participant_category, orcid
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
    coalesce(m->>'participant_category', ''),
    coalesce(m->>'orcid', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
