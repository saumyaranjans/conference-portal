-- =====================================================================
-- Two-stage editorial engine.
--   stage:              abstract | full_paper
--   suggested_outlet_id: chosen after final acceptance
--
-- Track chairs finalize decisions at both stages (Convener can override).
-- The status a decision produces depends on the stage and the author's
-- chosen submission type.
-- =====================================================================
alter table submissions
  add column if not exists stage text not null default 'abstract';
alter table submissions
  add column if not exists suggested_outlet_id uuid
    references publication_opportunities(id) on delete set null;

-- Any completed abstract acceptance so far keeps the old meaning of final.

-- Track chairs may now record final decisions (not just recommendations).
drop policy if exists "editors record recommendations" on decisions;
create policy "editors record decisions" on decisions
  for insert with check (
    edits_submission(submission_id) or has_role('chief') or has_role('admin')
  );

-- ---------------------------------------------------------------------
-- Rewritten decision handler: stage-aware status transitions + notify.
-- ---------------------------------------------------------------------
create or replace function on_decision_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sub        submissions%rowtype;
  auth_id    uuid;
  new_status submission_status;
  new_stage  text;
begin
  select * into sub from submissions where id = new.submission_id;
  auth_id := sub.author_id;
  new_stage := sub.stage;

  if new.decision = 'reject' then
    new_status := 'rejected';
  elsif new.decision in ('minor_revision', 'major_revision') then
    new_status := 'revisions_requested';
  else
    -- accept
    if sub.stage = 'abstract'
       and sub.submission_type = 'full_paper_presentation' then
      -- Abstract cleared; invite the full paper.
      new_status := 'abstract_accepted';
      new_stage := 'full_paper';
    else
      -- Abstract-only, or full-paper stage: this is final acceptance.
      new_status := 'accepted';
    end if;
  end if;

  update submissions
     set status = new_status,
         stage = new_stage,
         updated_at = now()
   where id = new.submission_id;

  -- Notify the author of every recorded decision.
  insert into notifications (profile_id, title, body, link)
  values (
    auth_id,
    'Decision on your submission',
    'A decision was recorded on: ' || coalesce(sub.title, 'your submission'),
    '/author/submissions/' || new.submission_id
  );

  return new;
end;
$$;
