-- =====================================================================
-- Pathway B full-paper submission: structured multi-file upload.
--
-- After an abstract is accepted for a full_paper_presentation, the author
-- packages the manuscript one of two ways and uploads a set of named files:
--   Option A (blind-ready, separated): title_page, manuscript_anon, figures,
--     tables, appendices, supplementary, others
--   Option B (combined): title_page, manuscript_full, supplementary, others
-- Slots figures/tables/appendices/supplementary/others may hold many files;
-- title_page + the manuscript slot are required to submit.
--
-- The Track Editor sets full_paper_deadline when accepting the abstract.
-- Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists full_paper_option   text,
  add column if not exists full_paper_deadline date,
  add column if not exists full_paper_submitted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'submissions_full_paper_option_check'
  ) then
    alter table submissions
      add constraint submissions_full_paper_option_check
      check (full_paper_option is null or full_paper_option in ('A', 'B'));
  end if;
end $$;

create table if not exists submission_files (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  slot          text not null,
  file_path     text not null,
  file_name     text not null,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists submission_files_submission_idx
  on submission_files (submission_id);

alter table submission_files enable row level security;

-- Author manages the files on their own submission; editors/convener/admin read.
drop policy if exists "author manages own submission files" on submission_files;
create policy "author manages own submission files" on submission_files
  for all
  using (owns_submission(submission_id))
  with check (owns_submission(submission_id));

drop policy if exists "staff read submission files" on submission_files;
create policy "staff read submission files" on submission_files
  for select
  using (
    edits_submission(submission_id)
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.roles && array['chief','admin']::app_role[])
    )
  );
