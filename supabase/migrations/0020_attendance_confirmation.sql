-- =====================================================================
-- Let the Editorial Office / Convener verify who actually attended.
-- `attendance` is what the author declared; `attended_confirmed` is what
-- the organisers verified at the conference.
-- =====================================================================
alter table submission_authors
  add column if not exists attended_confirmed boolean not null default false;
alter table submission_authors
  add column if not exists attendance_confirmed_at timestamptz;
alter table submission_authors
  add column if not exists attendance_confirmed_by uuid
    references profiles(id) on delete set null;

-- Organisers may update author rows (to record verified attendance).
drop policy if exists "office confirms attendance" on submission_authors;
create policy "office confirms attendance" on submission_authors
  for update using (has_role('chief') or has_role('admin'))
  with check (has_role('chief') or has_role('admin'));
