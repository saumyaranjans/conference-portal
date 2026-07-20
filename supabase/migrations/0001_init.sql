-- =====================================================================
-- Conference Submission Portal — core schema
-- Roles: author | reviewer | editor | chief | admin
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------------------------------------------------
create type app_role as enum ('author', 'reviewer', 'editor', 'chief', 'admin');

create type submission_status as enum (
  'draft',
  'submitted',
  'under_review',
  'revisions_requested',
  'accepted',
  'rejected',
  'withdrawn'
);

create type assignment_status as enum (
  'invited',
  'accepted',
  'declined',
  'submitted',
  'expired'
);

create type recommendation as enum (
  'accept',
  'minor_revision',
  'major_revision',
  'reject'
);

create type decision_kind as enum (
  'accept',
  'revisions_requested',
  'reject'
);

-- ---------- profiles -------------------------------------------------
-- One row per auth user. `roles` is an array so a person can be both an
-- editor and a reviewer, which is normal in real conferences.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  affiliation  text not null default '',
  country      text not null default '',
  bio          text not null default '',
  expertise    text[] not null default '{}',
  roles        app_role[] not null default '{author}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- conference structure -------------------------------------
create table conferences (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  acronym         text not null,
  year            int  not null,
  description     text not null default '',
  submission_deadline timestamptz,
  review_deadline     timestamptz,
  notification_date   timestamptz,
  is_open         boolean not null default true,
  created_at      timestamptz not null default now()
);

create table tracks (
  id             uuid primary key default gen_random_uuid(),
  conference_id  uuid not null references conferences(id) on delete cascade,
  name           text not null,
  description    text not null default '',
  -- the editor who owns this track; EiC assigns them
  editor_id      uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (conference_id, name)
);

-- ---------- submissions ----------------------------------------------
create table submissions (
  id             uuid primary key default gen_random_uuid(),
  conference_id  uuid not null references conferences(id) on delete cascade,
  track_id       uuid references tracks(id) on delete set null,
  -- the submitting/corresponding author
  author_id      uuid not null references profiles(id) on delete cascade,
  title          text not null,
  abstract       text not null default '',
  keywords       text[] not null default '{}',
  status         submission_status not null default 'draft',
  version        int not null default 1,
  file_path      text,           -- storage object path in the `papers` bucket
  file_name      text,
  submitted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on submissions (author_id);
create index on submissions (track_id);
create index on submissions (status);

-- co-authors (may or may not have portal accounts)
create table submission_authors (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete set null,
  full_name     text not null,
  email         text not null,
  affiliation   text not null default '',
  is_corresponding boolean not null default false,
  author_order  int not null default 1
);

create index on submission_authors (submission_id);

-- ---------- reviewer assignments -------------------------------------
create table assignments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_id   uuid not null references profiles(id) on delete cascade,
  assigned_by   uuid references profiles(id) on delete set null,
  status        assignment_status not null default 'invited',
  due_date      timestamptz,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (submission_id, reviewer_id)
);

create index on assignments (reviewer_id);
create index on assignments (submission_id);

-- ---------- reviews ---------------------------------------------------
create table reviews (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null unique references assignments(id) on delete cascade,
  submission_id     uuid not null references submissions(id) on delete cascade,
  reviewer_id       uuid not null references profiles(id) on delete cascade,
  -- 1..5 scores
  score_originality  int check (score_originality between 1 and 5),
  score_technical    int check (score_technical between 1 and 5),
  score_clarity      int check (score_clarity between 1 and 5),
  score_relevance    int check (score_relevance between 1 and 5),
  confidence         int check (confidence between 1 and 5),
  recommendation     recommendation,
  comments_to_author text not null default '',
  comments_to_editor text not null default '',  -- confidential
  is_submitted       boolean not null default false,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index on reviews (submission_id);
create index on reviews (reviewer_id);

-- ---------- decisions -------------------------------------------------
-- An editor records a recommendation; the EiC ratifies/overrides it.
create table decisions (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references submissions(id) on delete cascade,
  decided_by     uuid not null references profiles(id) on delete cascade,
  decision       decision_kind not null,
  rationale      text not null default '',
  is_final       boolean not null default false,  -- true when made/ratified by chief
  created_at     timestamptz not null default now()
);

create index on decisions (submission_id);

-- ---------- notifications ---------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on notifications (profile_id, is_read);

-- ---------- audit log --------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index on audit_log (created_at desc);

-- =====================================================================
-- Helper functions (SECURITY DEFINER so RLS policies can call them
-- without recursing into the policies on `profiles`)
-- =====================================================================
create or replace function has_role(target app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and target = any(roles) and is_active
  );
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active
      and (roles && array['editor','chief','admin']::app_role[])
  );
$$;

-- Does the current user edit the track this submission belongs to?
create or replace function edits_submission(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from submissions s
    join tracks t on t.id = s.track_id
    where s.id = sub_id and t.editor_id = auth.uid()
  );
$$;

-- Is the current user an assigned reviewer on this submission?
create or replace function reviews_submission(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from assignments
    where submission_id = sub_id
      and reviewer_id = auth.uid()
      and status in ('invited','accepted','submitted')
  );
$$;

-- =====================================================================
-- Auto-provision a profile whenever an auth user is created
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, affiliation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'affiliation', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Workflow automation — this is what makes the dashboards interconnect
-- =====================================================================

-- 1. When an editor assigns a reviewer, notify that reviewer.
create or replace function on_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sub_title text;
begin
  select title into sub_title from submissions where id = new.submission_id;

  insert into notifications (profile_id, title, body, link)
  values (
    new.reviewer_id,
    'New review invitation',
    'You have been invited to review: ' || coalesce(sub_title, 'a submission'),
    '/reviewer'
  );

  -- Move the paper into review the moment the first reviewer is assigned.
  update submissions
     set status = 'under_review', updated_at = now()
   where id = new.submission_id and status = 'submitted';

  return new;
end;
$$;

create trigger trg_assignment_created
  after insert on assignments
  for each row execute function on_assignment_created();

-- 2. When a reviewer submits a review, flip the assignment and tell the editor.
create or replace function on_review_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ed_id uuid;
  sub_title text;
begin
  if new.is_submitted and not coalesce(old.is_submitted, false) then
    update assignments
       set status = 'submitted', responded_at = now()
     where id = new.assignment_id;

    select t.editor_id, s.title into ed_id, sub_title
      from submissions s
      left join tracks t on t.id = s.track_id
     where s.id = new.submission_id;

    if ed_id is not null then
      insert into notifications (profile_id, title, body, link)
      values (
        ed_id,
        'Review received',
        'A review was submitted for: ' || coalesce(sub_title, 'a submission'),
        '/editor/submissions/' || new.submission_id
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_review_submitted
  after update on reviews
  for each row execute function on_review_submitted();

-- 3. When a decision is recorded, update the paper and notify the right people.
create or replace function on_decision_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_id uuid;
  sub_title text;
  chief_id uuid;
begin
  select author_id, title into auth_id, sub_title
    from submissions where id = new.submission_id;

  if new.is_final then
    -- Chief's word is final: the paper's status moves.
    update submissions
       set status = case new.decision
                      when 'accept' then 'accepted'::submission_status
                      when 'reject' then 'rejected'::submission_status
                      else 'revisions_requested'::submission_status
                    end,
           updated_at = now()
     where id = new.submission_id;

    insert into notifications (profile_id, title, body, link)
    values (
      auth_id,
      'Decision on your submission',
      'A final decision was made on: ' || coalesce(sub_title, 'your submission'),
      '/author/submissions/' || new.submission_id
    );
  else
    -- Editor recommendation: escalate to every Editor-in-Chief.
    for chief_id in
      select id from profiles where 'chief' = any(roles) and is_active
    loop
      insert into notifications (profile_id, title, body, link)
      values (
        chief_id,
        'Editor recommendation awaiting ratification',
        'An editor recommended a decision on: ' || coalesce(sub_title, 'a submission'),
        '/chief/submissions/' || new.submission_id
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_decision_created
  after insert on decisions
  for each row execute function on_decision_created();

-- 4. Notify the track editor when a paper is submitted to their track.
create or replace function on_submission_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare ed_id uuid;
begin
  if new.status = 'submitted' and coalesce(old.status, 'draft') = 'draft' then
    select editor_id into ed_id from tracks where id = new.track_id;
    if ed_id is not null then
      insert into notifications (profile_id, title, body, link)
      values (
        ed_id,
        'New submission in your track',
        new.title,
        '/editor/submissions/' || new.id
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_submission_submitted
  after update on submissions
  for each row execute function on_submission_submitted();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles           enable row level security;
alter table conferences        enable row level security;
alter table tracks             enable row level security;
alter table submissions        enable row level security;
alter table submission_authors enable row level security;
alter table assignments        enable row level security;
alter table reviews            enable row level security;
alter table decisions          enable row level security;
alter table notifications      enable row level security;
alter table audit_log          enable row level security;

-- profiles ------------------------------------------------------------
create policy "own profile readable" on profiles
  for select using (id = auth.uid());
create policy "staff read all profiles" on profiles
  for select using (is_staff());
create policy "own profile updatable" on profiles
  for update using (id = auth.uid());
create policy "admin manages profiles" on profiles
  for all using (has_role('admin')) with check (has_role('admin'));

-- conferences / tracks are public reads, admin/chief writes -----------
create policy "conferences readable" on conferences
  for select using (true);
create policy "conferences managed" on conferences
  for all using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

create policy "tracks readable" on tracks
  for select using (true);
create policy "tracks managed" on tracks
  for all using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- submissions ----------------------------------------------------------
create policy "authors see own submissions" on submissions
  for select using (author_id = auth.uid());
create policy "co-authors see submissions" on submissions
  for select using (
    exists (select 1 from submission_authors sa
             where sa.submission_id = submissions.id and sa.profile_id = auth.uid())
  );
create policy "reviewers see assigned submissions" on submissions
  for select using (reviews_submission(id));
create policy "track editors see their submissions" on submissions
  for select using (edits_submission(id));
create policy "chief and admin see all submissions" on submissions
  for select using (has_role('chief') or has_role('admin'));

create policy "authors create submissions" on submissions
  for insert with check (author_id = auth.uid());
create policy "authors edit own drafts" on submissions
  for update using (
    author_id = auth.uid()
    and status in ('draft', 'revisions_requested')
  );
create policy "staff update submissions" on submissions
  for update using (edits_submission(id) or has_role('chief') or has_role('admin'));
create policy "authors delete own drafts" on submissions
  for delete using (author_id = auth.uid() and status = 'draft');

-- submission_authors ---------------------------------------------------
create policy "read submission authors" on submission_authors
  for select using (
    exists (select 1 from submissions s where s.id = submission_id
              and (s.author_id = auth.uid()
                   or edits_submission(s.id)
                   or has_role('chief') or has_role('admin')))
  );
create policy "manage own submission authors" on submission_authors
  for all using (
    exists (select 1 from submissions s
             where s.id = submission_id and s.author_id = auth.uid())
  )
  with check (
    exists (select 1 from submissions s
             where s.id = submission_id and s.author_id = auth.uid())
  );

-- assignments ----------------------------------------------------------
create policy "reviewers see own assignments" on assignments
  for select using (reviewer_id = auth.uid());
create policy "editors see track assignments" on assignments
  for select using (edits_submission(submission_id) or has_role('chief') or has_role('admin'));
create policy "editors create assignments" on assignments
  for insert with check (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );
create policy "reviewers respond to assignments" on assignments
  for update using (reviewer_id = auth.uid());
create policy "editors update assignments" on assignments
  for update using (edits_submission(submission_id) or has_role('chief') or has_role('admin'));
create policy "editors delete assignments" on assignments
  for delete using (edits_submission(submission_id) or has_role('chief') or has_role('admin'));

-- reviews ---------------------------------------------------------------
create policy "reviewers manage own reviews" on reviews
  for all using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "editors read reviews" on reviews
  for select using (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );
-- Authors only ever see SUBMITTED reviews, and the API layer strips the
-- confidential comments_to_editor column before it reaches them.
create policy "authors read submitted reviews" on reviews
  for select using (
    is_submitted
    and exists (select 1 from submissions s
                 where s.id = submission_id and s.author_id = auth.uid())
  );

-- decisions --------------------------------------------------------------
create policy "authors read final decisions" on decisions
  for select using (
    is_final
    and exists (select 1 from submissions s
                 where s.id = submission_id and s.author_id = auth.uid())
  );
create policy "staff read decisions" on decisions
  for select using (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );
create policy "editors record recommendations" on decisions
  for insert with check (
    (edits_submission(submission_id) and not is_final)
    or ((has_role('chief') or has_role('admin')))
  );

-- notifications -----------------------------------------------------------
create policy "own notifications" on notifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- audit log ---------------------------------------------------------------
create policy "admin reads audit log" on audit_log
  for select using (has_role('admin'));

-- =====================================================================
-- Storage bucket for paper files
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('papers', 'papers', false)
on conflict (id) do nothing;

-- Files are stored at: papers/<submission_id>/<filename>
create policy "authors upload own papers" on storage.objects
  for insert with check (
    bucket_id = 'papers'
    and exists (
      select 1 from submissions s
      where s.author_id = auth.uid()
        and s.id::text = (storage.foldername(name))[1]
    )
  );

create policy "read papers if permitted" on storage.objects
  for select using (
    bucket_id = 'papers'
    and exists (
      select 1 from submissions s
      where s.id::text = (storage.foldername(name))[1]
        and (s.author_id = auth.uid()
             or reviews_submission(s.id)
             or edits_submission(s.id)
             or has_role('chief') or has_role('admin'))
    )
  );

create policy "authors replace own papers" on storage.objects
  for update using (
    bucket_id = 'papers'
    and exists (
      select 1 from submissions s
      where s.author_id = auth.uid()
        and s.id::text = (storage.foldername(name))[1]
    )
  );
