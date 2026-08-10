-- =====================================================================
-- Volunteering to review or to chair a track.
--
-- Faculty may offer, at registration, to serve as a Reviewer, as a Track
-- Editor, or both. An offer is not an appointment: the Convener decides, and
-- only on acceptance is the role granted and the person added to the pool the
-- Convener allocates from. Until then they hold no extra access at all.
--
-- Two independent rows rather than one with two booleans, because the two
-- offers are decided separately — a Convener may want someone as a reviewer
-- but not yet as a track chair, and each decision carries its own date and
-- decider.
-- =====================================================================

create table if not exists volunteer_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  -- Mirrors app_role, but only these two may be volunteered for.
  role text not null check (role in ('reviewer', 'editor')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  requested_at timestamptz not null default now(),
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text not null default '',
  -- One standing offer per role per person; re-offering updates the same row.
  unique (profile_id, role)
);

create index if not exists volunteer_requests_status_idx
  on volunteer_requests (status, requested_at);

alter table volunteer_requests enable row level security;

drop policy if exists "staff manage volunteer requests" on volunteer_requests;
create policy "staff manage volunteer requests" on volunteer_requests
  for all using (has_role('admin') or has_role('chief'));

-- A volunteer may see the state of their own offer, and nothing else.
drop policy if exists "own volunteer requests" on volunteer_requests;
create policy "own volunteer requests" on volunteer_requests
  for select using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- Registration records the offer. Only faculty are eligible, and the check
-- lives here as well as in the form so a hand-crafted signup cannot bypass it.
-- ---------------------------------------------------------------------
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
      insert into volunteer_requests (profile_id, role)
      values (new.id, 'reviewer') on conflict (profile_id, role) do nothing;
    end if;
    if coalesce(m->>'volunteer_editor','') = 'true' then
      insert into volunteer_requests (profile_id, role)
      values (new.id, 'editor') on conflict (profile_id, role) do nothing;
    end if;
  end if;

  return new;
end $function$;
