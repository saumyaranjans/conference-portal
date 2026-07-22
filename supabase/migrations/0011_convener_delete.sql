-- =====================================================================
-- Allow the Convener (chief) and admin to delete a submitted or withdrawn
-- paper. Accepted / under-review / draft papers are not deletable here.
-- Child rows (authors, assignments, reviews, decisions) cascade away via
-- their foreign keys.
-- =====================================================================
drop policy if exists "convener deletes submissions" on submissions;
create policy "convener deletes submissions" on submissions
  for delete using (
    (has_role('chief') or has_role('admin'))
    and status in ('submitted', 'withdrawn')
  );
