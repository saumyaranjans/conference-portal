-- Allow an author to upload and submit the full paper once their abstract
-- is accepted (status = abstract_accepted -> submitted).
drop policy if exists "authors submit full paper" on submissions;
create policy "authors submit full paper" on submissions
  for update
  using (author_id = auth.uid() and status = 'abstract_accepted')
  with check (
    author_id = auth.uid()
    and status in ('abstract_accepted', 'submitted')
  );
