-- =====================================================================
-- Website visit counter — one row per visitor session landing on the public
-- site. Inserted server-side via the service role (see /api/visit); the
-- Convener/Editorial Office read the aggregate counts in the sidebar.
-- =====================================================================
create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  path text,
  visited_at timestamptz not null default now()
);

create index if not exists site_visits_visited_at_idx on site_visits (visited_at);

alter table site_visits enable row level security;

-- Only staff read the counts; inserts come through the service role (RLS-bypass).
drop policy if exists "staff read site visits" on site_visits;
create policy "staff read site visits" on site_visits
  for select using (has_role('chief') or has_role('admin'));
