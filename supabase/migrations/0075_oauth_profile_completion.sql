-- =====================================================================
-- Google / Microsoft sign-in.
--
-- Signing in with a provider yields an email and usually a display name, and
-- nothing else. The portal needs institution, participant category and GIFT
-- membership before a person can act as an author, so an OAuth account starts
-- INCOMPLETE and is sent through a short form to finish.
--
-- Completion is recorded explicitly rather than inferred from whether the
-- fields look filled: "GIFT member: no" and "never asked" are both a false
-- boolean, and guessing between them would either nag people who already
-- answered or wave through people who never did.
--
-- Email + password signup is unchanged. That form collects everything up
-- front, so it marks itself complete via a signup_complete metadata flag.
-- =====================================================================

alter table profiles add column if not exists profile_completed_at timestamptz;

-- Every account that exists today registered through the full form.
update profiles set profile_completed_at = now() where profile_completed_at is null;

-- Recreated to (a) honour signup_complete and (b) understand the name shapes
-- OAuth providers send: Google supplies given_name/family_name, Azure often
-- only a single "name".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fn text := coalesce(m->>'first_name', m->>'given_name', '');
  ln text := coalesce(m->>'last_name', m->>'family_name', '');
  fullname text := coalesce(nullif(m->>'full_name',''), nullif(m->>'name',''), '');
  is_member boolean := coalesce((m->>'glogift_member')::boolean, false);
  done timestamptz := case
    when coalesce(m->>'signup_complete','') = 'true' then now() else null end;
begin
  -- Fill whichever half of the name the provider left out.
  if fullname = '' then
    fullname := trim(both ' ' from (fn || ' ' || ln));
  end if;
  if fn = '' and fullname <> '' then
    fn := split_part(fullname, ' ', 1);
    ln := trim(both ' ' from substr(fullname, length(split_part(fullname,' ',1)) + 1));
  end if;

  insert into profiles (
    id, email, full_name, first_name, last_name, title, gender, mobile,
    affiliation, institution, department, country, designation,
    participant_category, orcid, glogift_member, glogift_membership_no,
    profile_completed_at
  ) values (
    new.id, new.email, fullname, fn, ln,
    coalesce(m->>'title',''), coalesce(m->>'gender',''), coalesce(m->>'mobile',''),
    coalesce(nullif(m->>'institution',''), m->>'affiliation',''),
    coalesce(m->>'institution',''), coalesce(m->>'department',''),
    coalesce(m->>'country',''), coalesce(m->>'designation',''),
    coalesce(m->>'participant_category',''), coalesce(m->>'orcid',''),
    is_member,
    case when is_member then coalesce(m->>'glogift_membership_no','') else '' end,
    done
  ) on conflict (id) do nothing;
  return new;
end $function$;
