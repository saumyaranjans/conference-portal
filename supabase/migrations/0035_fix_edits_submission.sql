-- =====================================================================
-- Repair edits_submission.
--
-- 0024 made track chairs a many-to-many (track_editors) and barred authors
-- and co-authors from acting on their own paper. 0034 added the Convener's
-- per-paper override but rebuilt the function from the pre-0024 single
-- tracks.editor_id, dropping both of those rules: chairs added after 0024
-- lost access to their track's papers, and an author who also chairs the
-- track could edit their own submission again.
--
-- This restores 0024's logic and keeps the override on top.
-- =====================================================================
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
    where s.id = sub_id
      and case
            -- The Convener handed this one paper to a specific chair.
            when s.assigned_editor_id is not null
              then s.assigned_editor_id = auth.uid()
            -- Otherwise any chair of the paper's track may act.
            else exists (
              select 1
              from track_editors te
              where te.track_id = s.track_id
                and te.profile_id = auth.uid()
            )
          end
  )
  -- Conflict of interest: never your own paper, however you are assigned.
  and not owns_submission(sub_id)
  and not is_coauthor(sub_id);
$$;
