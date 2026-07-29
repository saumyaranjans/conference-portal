-- =====================================================================
-- GLOGIFT membership, asked at sign-up.
--
-- Everyone already registered gets NO by default — the column default does
-- that for existing rows — and can update it from their profile later.
-- =====================================================================
alter table profiles
  add column if not exists glogift_member boolean not null default false,
  add column if not exists glogift_membership_no text not null default '';

comment on column profiles.glogift_member is
  'Answer to "Are you a GLOGIFT member?" at sign-up. Existing accounts default to false.';

-- Carry the answer through from the sign-up form's metadata.
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
  is_member boolean := coalesce((m->>'glogift_member')::boolean, false);
begin
  if fullname = '' then
    fullname := trim(both ' ' from (fn || ' ' || ln));
  end if;

  insert into profiles (
    id, email, full_name, first_name, last_name, title, gender, mobile,
    affiliation, institution, department, country, designation,
    participant_category, orcid, glogift_member, glogift_membership_no
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
    coalesce(m->>'orcid', ''),
    is_member,
    case when is_member then coalesce(m->>'glogift_membership_no', '') else '' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
