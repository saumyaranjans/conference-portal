-- =====================================================================
-- Withdrawal rules:
--   * An author may withdraw only an incomplete (draft) abstract.
--   * Once the abstract is submitted, only the Convener (or admin) may
--     withdraw it — authors can still edit/resubmit a revision.
-- =====================================================================

-- Authors may edit a draft or a requested revision and move it to
-- submitted, but may NOT withdraw from those states.
drop policy if exists "authors edit own drafts" on submissions;
create policy "authors edit own drafts" on submissions
  for update
  using (
    author_id = auth.uid()
    and status in ('draft', 'revisions_requested')
  )
  with check (
    author_id = auth.uid()
    and status in ('draft', 'revisions_requested', 'submitted')
  );

-- Authors may withdraw only while the abstract is still a draft.
drop policy if exists "authors withdraw own submissions" on submissions;
drop policy if exists "authors withdraw own drafts" on submissions;
create policy "authors withdraw own drafts" on submissions
  for update
  using (author_id = auth.uid() and status = 'draft')
  with check (author_id = auth.uid() and status = 'withdrawn');
