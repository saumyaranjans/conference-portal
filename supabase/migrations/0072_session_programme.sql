-- The conference programme: sessions gain a lifecycle, a split on-site venue,
-- chairs, volunteers and per-presentation scoring.
--
-- Sessions already carry title/mode/track/date/slot and an ordered paper list
-- (sort_order on both tables). What was missing is everything around the
-- running of a session: who chairs it, who assists, whether the Convener has
-- approved it, whether the public may see it, and what the chairs scored.

-- ---------------------------------------------------------------- sessions --
alter table conference_sessions
  -- On-site venue is two facts, not one: which block, and which room in it.
  add column if not exists academic_block text,
  -- draft      : generated or hand-made, still being arranged
  -- approved   : the Convener has signed it off; notification emails may go out
  -- published  : visible on the public schedule page
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'approved', 'published')),
  add column if not exists approved_by uuid references profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  -- Normally five papers; the Convener may stretch a single session to six.
  add column if not exists max_papers int not null default 5
    check (max_papers between 1 and 6),
  -- Set when the allocator created the session, so a re-run can tell its own
  -- work from sessions the Convener built or edited by hand.
  add column if not exists generated_at timestamptz;

comment on column conference_sessions.status is
  'draft -> approved (Convener sign-off, emails may send) -> published (public).';
comment on column conference_sessions.max_papers is
  'Five by default; the Convener may raise a single session to six.';

-- ------------------------------------------------------------------ chairs --
-- Two to three per session, drawn only from faculty-level academics: a session
-- chair judges the work, so the pool deliberately excludes research scholars
-- and students.
create table if not exists session_chairs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references conference_sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  -- Captured per session: a chair's relevant standing differs by the session
  -- they are chairing, and the programme prints it.
  bio text,
  notified_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (session_id, profile_id)
);
create index if not exists session_chairs_session_idx on session_chairs(session_id);
create index if not exists session_chairs_profile_idx on session_chairs(profile_id);

-- -------------------------------------------------------------- volunteers --
-- Student volunteers are not necessarily portal users, so the name stands on
-- its own and the profile link is optional.
create table if not exists session_volunteers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references conference_sessions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text,
  mobile text,
  notified_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists session_volunteers_session_idx on session_volunteers(session_id);

-- ------------------------------------------------------------------ scores --
-- One score per chair per presentation, so two chairs scoring the same paper
-- are recorded separately and can be averaged rather than overwriting.
create table if not exists presentation_scores (
  id uuid primary key default gen_random_uuid(),
  session_paper_id uuid not null references session_papers(id) on delete cascade,
  chair_id uuid not null references profiles(id) on delete cascade,
  originality int check (originality between 0 and 10),
  methodology int check (methodology between 0 and 10),
  presentation int check (presentation between 0 and 10),
  qna int check (qna between 0 and 10),
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_paper_id, chair_id)
);
create index if not exists presentation_scores_paper_idx
  on presentation_scores(session_paper_id);

-- Total is derived, never stored out of step with its parts.
create or replace view presentation_score_totals as
  select
    ps.id,
    ps.session_paper_id,
    ps.chair_id,
    ps.originality,
    ps.methodology,
    ps.presentation,
    ps.qna,
    coalesce(ps.originality, 0) + coalesce(ps.methodology, 0)
      + coalesce(ps.presentation, 0) + coalesce(ps.qna, 0) as total,
    ps.comments,
    ps.submitted_at
  from presentation_scores ps;

-- ------------------------------------------------------------------- notice --
-- Which authors have been told about their slot, so re-approving a session
-- does not spam people whose details did not change.
alter table session_papers
  add column if not exists notified_at timestamptz;

-- --------------------------------------------------------------------- RLS --
alter table session_chairs enable row level security;
alter table session_volunteers enable row level security;
alter table presentation_scores enable row level security;

-- Staff manage the programme.
drop policy if exists session_chairs_staff on session_chairs;
create policy session_chairs_staff on session_chairs for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

drop policy if exists session_volunteers_staff on session_volunteers;
create policy session_volunteers_staff on session_volunteers for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- A chair reads and writes only their own scores; staff see everything.
drop policy if exists presentation_scores_staff on presentation_scores;
create policy presentation_scores_staff on presentation_scores for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

drop policy if exists presentation_scores_own on presentation_scores;
create policy presentation_scores_own on presentation_scores for all
  using (chair_id = auth.uid())
  with check (chair_id = auth.uid());

-- Published sessions are public; drafts and approved-but-unpublished are not.
-- 0070 granted the public `using (true)`, which would OR with anything added
-- here and leak the whole draft programme — so that policy is REPLACED, not
-- supplemented. Staff keep full access through their own policy above.
drop policy if exists "public read sessions" on conference_sessions;
create policy "public read sessions" on conference_sessions for select
  using (status = 'published');

drop policy if exists "public read session papers" on session_papers;
create policy "public read session papers" on session_papers for select
  using (
    exists (
      select 1 from conference_sessions cs
      where cs.id = session_papers.session_id and cs.status = 'published'
    )
  );

-- Chairs, volunteers and the running order of a published session are public;
-- scores never are.
drop policy if exists session_chairs_public_read on session_chairs;
create policy session_chairs_public_read on session_chairs for select
  using (
    exists (
      select 1 from conference_sessions cs
      where cs.id = session_chairs.session_id and cs.status = 'published'
    )
  );

drop policy if exists session_volunteers_public_read on session_volunteers;
create policy session_volunteers_public_read on session_volunteers for select
  using (
    exists (
      select 1 from conference_sessions cs
      where cs.id = session_volunteers.session_id and cs.status = 'published'
    )
  );
