-- The Convener may hand a single paper to a different Track Session Chair
-- without moving the whole track — for instance when the assigned chair has a
-- conflict, or their decision was found inappropriate.
alter table submissions
  add column if not exists assigned_editor_id uuid references profiles(id) on delete set null,
  add column if not exists assigned_editor_at timestamptz,
  add column if not exists assigned_editor_by uuid references profiles(id) on delete set null;

create index if not exists submissions_assigned_editor_idx
  on submissions (assigned_editor_id);

comment on column submissions.assigned_editor_id is
  'Overrides tracks.editor_id for this paper alone; set by the Convener.';

-- Editing rights follow the override when one is set, so the newly assigned
-- chair can act and the track''s default chair no longer can.
create or replace function edits_submission(sub_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from submissions s
    join tracks t on t.id = s.track_id
    where s.id = sub_id
      and case
            when s.assigned_editor_id is not null
              then s.assigned_editor_id = auth.uid()
            else t.editor_id = auth.uid()
          end
  );
$$;
