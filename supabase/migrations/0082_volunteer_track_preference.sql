-- Track preference on a volunteer offer.
--
-- Someone offering to review or to chair says WHICH track they can serve, and
-- the Convener sees that when deciding. Accepting an editor offer that names a
-- track now also seats them on it, so "accepted" and "chairs that track" stop
-- being two separate manual steps.
--
-- Nullable throughout: offers made before this migration have no track, and an
-- offer without one is still a valid offer. `on delete set null` so retiring a
-- track never deletes the person's standing offer.

alter table volunteer_requests
  add column if not exists preferred_track_id uuid
    references tracks(id) on delete set null;

comment on column volunteer_requests.preferred_track_id is
  'The track this person offered to serve. For an editor offer, accepting seats them on it via track_editors. For a reviewer offer it records expertise: reviewers are assigned per paper, not bound to a track.';

create index if not exists volunteer_requests_track_idx
  on volunteer_requests (preferred_track_id);

-- The password signup path creates these rows from auth metadata in a trigger,
-- so the trigger has to carry the track through as well. Body reproduced from
-- 0077 with only the two volunteer inserts changed.
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
  category text := coalesce(m->>'participant_category', '');
  done timestamptz := case
    when coalesce(m->>'signup_complete','') = 'true' then now() else null end;
begin
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
    category, coalesce(m->>'orcid',''),
    is_member,
    case when is_member then coalesce(m->>'glogift_membership_no','') else '' end,
    done
  ) on conflict (id) do nothing;

  if category = 'Faculty / Academician' then
    if coalesce(m->>'volunteer_reviewer','') = 'true' then
      insert into volunteer_requests (profile_id, role, preferred_track_id)
      values (
        new.id, 'reviewer',
        nullif(m->>'volunteer_reviewer_track','')::uuid
      ) on conflict (profile_id, role) do nothing;
    end if;
    if coalesce(m->>'volunteer_editor','') = 'true' then
      insert into volunteer_requests (profile_id, role, preferred_track_id)
      values (
        new.id, 'editor',
        nullif(m->>'volunteer_editor_track','')::uuid
      ) on conflict (profile_id, role) do nothing;
    end if;
  end if;

  return new;
end $function$;
