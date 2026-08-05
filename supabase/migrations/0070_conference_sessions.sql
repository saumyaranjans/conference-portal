-- =====================================================================
-- Event Management: conference sessions (on-site or online), each holding a
-- set of accepted papers. On-site sessions carry a classroom number; online
-- sessions carry a meeting link. Managed by the Convener / Editorial Office;
-- surfaced on the public Conference Schedule.
-- =====================================================================

create table if not exists conference_sessions (
  id             uuid primary key default gen_random_uuid(),
  conference_id  uuid not null references conferences(id) on delete cascade,
  title          text not null,
  mode           text not null check (mode in ('onsite','online')),
  track_id       uuid references tracks(id) on delete set null,
  session_date   date,
  time_slot      text,
  classroom      text,      -- on-site room number
  meeting_link   text,      -- online joining link
  sort_order     integer not null default 0,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists session_papers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references conference_sessions(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (session_id, submission_id)
);

create index if not exists idx_conf_sessions_conf on conference_sessions(conference_id);
create index if not exists idx_session_papers_session on session_papers(session_id);

alter table conference_sessions enable row level security;
alter table session_papers enable row level security;

-- Staff (Convener / Editorial Office) manage everything.
drop policy if exists "staff manage sessions" on conference_sessions;
create policy "staff manage sessions" on conference_sessions for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

drop policy if exists "staff manage session papers" on session_papers;
create policy "staff manage session papers" on session_papers for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- The Conference Schedule is public — anyone may read sessions and their papers.
drop policy if exists "public read sessions" on conference_sessions;
create policy "public read sessions" on conference_sessions for select using (true);

drop policy if exists "public read session papers" on session_papers;
create policy "public read session papers" on session_papers for select using (true);

comment on table conference_sessions is
  'Event Management: on-site (classroom) or online (meeting link) sessions holding accepted papers.';

select 'ok' as done;
