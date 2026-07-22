-- Extend the Convener/admin delete permission to include rejected papers.
drop policy if exists "convener deletes submissions" on submissions;
create policy "convener deletes submissions" on submissions
  for delete using (
    (has_role('chief') or has_role('admin'))
    and status in ('submitted', 'withdrawn', 'rejected')
  );
