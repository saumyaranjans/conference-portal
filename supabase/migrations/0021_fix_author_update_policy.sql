-- =====================================================================
-- Fix: authors could not submit or withdraw their own papers.
--
-- "authors edit own drafts" had no WITH CHECK, so Postgres reused the
-- USING clause for the new row. Submitting sets status = 'submitted',
-- which failed that check -> "new row violates row-level security policy".
--
-- Split into two intents:
--   * edit a draft / revision, and move it to submitted or withdrawn
--   * withdraw a paper that is already submitted or under review
-- =====================================================================
drop policy if exists "authors edit own drafts" on submissions;

create policy "authors edit own drafts" on submissions
  for update
  using (
    author_id = auth.uid()
    and status in ('draft', 'revisions_requested')
  )
  with check (
    author_id = auth.uid()
    and status in ('draft', 'revisions_requested', 'submitted', 'withdrawn')
  );

drop policy if exists "authors withdraw own submissions" on submissions;

create policy "authors withdraw own submissions" on submissions
  for update
  using (
    author_id = auth.uid()
    and status in ('submitted', 'under_review')
  )
  with check (
    author_id = auth.uid()
    and status = 'withdrawn'
  );
