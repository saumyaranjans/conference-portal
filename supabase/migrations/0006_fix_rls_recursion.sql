-- =====================================================================
-- Fix: infinite recursion between the RLS policies on `submissions` and
-- `submission_authors`.
--
-- The submissions "co-authors" policy selected from submission_authors,
-- whose read policy selected from submissions, whose policies selected
-- from submission_authors again -> Postgres aborts with 42P17. Any user
-- who does not match an earlier short-circuiting policy (i.e. every plain
-- author / reviewer / track editor) hit a 500 on every submissions query.
--
-- The break: move the cross-table checks into SECURITY DEFINER helpers,
-- which run as the table owner and therefore bypass RLS, so evaluating
-- one policy never re-enters the other table's policies.
-- =====================================================================

create or replace function owns_submission(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from submissions
    where id = sub_id and author_id = auth.uid()
  );
$$;

create or replace function is_coauthor(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from submission_authors
    where submission_id = sub_id and profile_id = auth.uid()
  );
$$;

-- ---- submissions: co-author read via the helper (no direct sub_authors) --
drop policy if exists "co-authors see submissions" on submissions;
create policy "co-authors see submissions" on submissions
  for select using (is_coauthor(id));

-- ---- submission_authors: check submissions via helpers, not RLS ---------
drop policy if exists "read submission authors" on submission_authors;
create policy "read submission authors" on submission_authors
  for select using (
    owns_submission(submission_id)
    or edits_submission(submission_id)
    or has_role('chief')
    or has_role('admin')
  );

drop policy if exists "manage own submission authors" on submission_authors;
create policy "manage own submission authors" on submission_authors
  for all using (owns_submission(submission_id))
  with check (owns_submission(submission_id));
