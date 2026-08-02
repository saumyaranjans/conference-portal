-- =====================================================================
-- Manuscript decision "sent_back": the Track Editor returns a full paper to the
-- author to restart the submission from scratch — used when the corresponding
-- author has not followed the submission guidelines. The accepted abstract
-- stands; the manuscript goes back to abstract_accepted / full_paper so the
-- author re-packages and re-submits. (The action also clears the submitted /
-- built state and removes reviewer assignments — a fresh round.)
--
-- `decisions.decision` is the `decision_kind` enum, so the value must be added
-- to it, then the status-mapping trigger taught to handle it. (ADD VALUE is not
-- used within this migration's own statements, so it is transaction-safe here.)
-- =====================================================================

alter type decision_kind add value if not exists 'sent_back';

create or replace function public.on_decision_created()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
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
  elsif new.decision = 'sent_back' then
    new_status := 'abstract_accepted';
    new_stage := 'full_paper';
  else
    if sub.stage = 'abstract' and sub.submission_type = 'full_paper_presentation' then
      new_status := 'abstract_accepted';
      new_stage := 'full_paper';
    else
      new_status := 'accepted';
    end if;
  end if;

  update submissions
     set status = new_status, stage = new_stage, updated_at = now()
   where id = new.submission_id;

  insert into notifications (profile_id, title, body, link)
  values (
    auth_id,
    'Decision on your submission',
    'A decision was recorded on: ' || coalesce(sub.title, 'your submission'),
    '/author/submissions/' || new.submission_id
  );

  return new;
end;
$fn$;
