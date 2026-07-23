-- =====================================================================
-- Publication opportunities shown in the sidebar (journals / special
-- issues where selected papers may be considered). Managed by the
-- Editorial Office / Convener, readable by everyone signed in.
-- =====================================================================
create table if not exists publication_opportunities (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  publisher   text not null default '',
  description text not null default '',
  url         text not null default '',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table publication_opportunities enable row level security;

drop policy if exists "opportunities readable" on publication_opportunities;
create policy "opportunities readable" on publication_opportunities
  for select using (true);

drop policy if exists "opportunities managed" on publication_opportunities;
create policy "opportunities managed" on publication_opportunities
  for all using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- A starting entry the organisers can edit or replace.
insert into publication_opportunities (title, publisher, description, url, sort_order)
select
  'Global Journal of Flexible Systems Management',
  'Springer',
  'Selected papers may be considered for the journal of the Global Institute of Flexible Systems Management.',
  'https://link.springer.com/journal/40171',
  1
where not exists (select 1 from publication_opportunities);
