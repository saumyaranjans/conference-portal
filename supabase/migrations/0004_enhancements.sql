-- =====================================================================
-- Enhancements from the CMPRP requirements doc:
--   * track codes + human-readable Paper IDs (AIF-001, stable across
--     revision rounds)
--   * richer registration fields + 5 participant categories
--   * camera-ready submission for accepted papers
--   * reseed with the real 2027 management conference
-- =====================================================================

-- ---------- track codes ----------------------------------------------
alter table tracks add column if not exists code text not null default '';
-- one code per conference
create unique index if not exists tracks_conf_code_uniq
  on tracks (conference_id, code) where code <> '';

-- ---------- richer profile fields ------------------------------------
alter table profiles add column if not exists title       text not null default '';
alter table profiles add column if not exists first_name  text not null default '';
alter table profiles add column if not exists last_name   text not null default '';
alter table profiles add column if not exists gender      text not null default '';
alter table profiles add column if not exists mobile      text not null default '';
alter table profiles add column if not exists institution text not null default '';
alter table profiles add column if not exists department  text not null default '';
-- (country + designation + affiliation already exist)

-- ---------- Paper ID + camera-ready on submissions -------------------
alter table submissions add column if not exists paper_id     text;
alter table submissions add column if not exists paper_number int;
alter table submissions add column if not exists camera_ready_file_path text;
alter table submissions add column if not exists camera_ready_file_name text;
alter table submissions add column if not exists camera_ready_at        timestamptz;

create unique index if not exists submissions_paper_id_uniq
  on submissions (paper_id) where paper_id is not null;

-- Assign a human-readable Paper ID the first time a paper is submitted.
-- The ID is <TRACK CODE>-<zero-padded sequence within the track> and
-- never changes afterwards, even across revision rounds.
create or replace function assign_paper_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tcode text;
  seq   int;
begin
  if new.status = 'submitted' and new.paper_id is null and new.track_id is not null then
    -- serialize per-track numbering
    perform pg_advisory_xact_lock(hashtext(new.track_id::text));

    select coalesce(nullif(code, ''), 'PAP') into tcode from tracks where id = new.track_id;
    if tcode is null then tcode := 'PAP'; end if;

    select coalesce(max(paper_number), 0) + 1 into seq
      from submissions where track_id = new.track_id;

    new.paper_number := seq;
    new.paper_id := tcode || '-' || lpad(seq::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_paper_id on submissions;
create trigger trg_assign_paper_id
  before insert or update on submissions
  for each row execute function assign_paper_id();

-- ---------- update sign-up handler for the new fields ----------------
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
    affiliation, institution, department, country, designation
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
    coalesce(m->>'designation', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =====================================================================
-- Reseed: replace the placeholder CS conference with the real event.
-- Safe because there are no submissions yet.
-- =====================================================================
do $$
declare
  conf_id uuid;
  ed_id   uuid;
begin
  -- reuse the existing conference row if present, else create one
  select id into conf_id from conferences order by created_at limit 1;

  if conf_id is null then
    insert into conferences (name, acronym, year, description, is_open)
    values ('AI-Driven Solutions in Management Conference', 'AIDSM', 2027,
            'Annual peer-reviewed conference on AI-driven solutions in management, IIM Sambalpur.',
            true)
    returning id into conf_id;
  else
    update conferences
       set name = 'AI-Driven Solutions in Management Conference',
           acronym = 'AIDSM',
           year = 2027,
           description = 'Annual peer-reviewed conference on AI-driven solutions in management, IIM Sambalpur.',
           is_open = true
     where id = conf_id;
  end if;

  -- replace tracks
  delete from tracks where conference_id = conf_id;

  insert into tracks (conference_id, name, code, description) values
    (conf_id, 'AI in Finance',               'AIF', 'Applications of AI across financial services and decision-making.'),
    (conf_id, 'Operations & Supply Chain',   'OPS', 'AI in operations, logistics and supply-chain management.'),
    (conf_id, 'Digital Transformation',      'DIG', 'Organisational and strategic digital transformation.'),
    (conf_id, 'Sustainable Finance',         'SUS', 'Sustainability, ESG and responsible finance.'),
    (conf_id, 'FinTech',                     'FIN', 'Financial technology, payments and platforms.'),
    (conf_id, 'Governance & Ethics',         'ETH', 'AI governance, ethics and policy in management.'),
    (conf_id, 'Analytics',                   'ANA', 'Business analytics, data science and applied ML.'),
    (conf_id, 'Human Capital',               'HCM', 'People analytics, HR and organisational behaviour.'),
    (conf_id, 'Innovation',                  'INV', 'Innovation management and entrepreneurship.'),
    (conf_id, 'Inclusive Growth',            'INC', 'Inclusive growth, development and social impact.');

  -- keep the walkthrough working: make the portal owner editor of AI in Finance
  select id into ed_id from profiles where email = 'saumyaranjans@iimsambalpur.ac.in';
  if ed_id is not null then
    update tracks set editor_id = ed_id where conference_id = conf_id and code = 'AIF';
  end if;
end $$;
