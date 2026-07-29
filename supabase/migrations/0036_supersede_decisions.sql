-- =====================================================================
-- The Track Editor owns the decision. The Convener's only lever is to
-- reassign the paper — and doing so voids the previous decision and
-- starts the process afresh under the new Track Editor.
--
-- A voided decision stays on record for the Convener alone: neither the
-- author nor the incoming Track Editor should see the call that was
-- overridden.
-- =====================================================================
alter table decisions
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references profiles(id) on delete set null;

create index if not exists decisions_superseded_idx
  on decisions (submission_id) where superseded_at is null;

comment on column decisions.superseded_at is
  'Set when the Convener reassigned the paper, voiding this decision. Visible to the Convener only.';

-- Authors see only decisions that still stand.
drop policy if exists "authors read final decisions" on decisions;
create policy "authors read final decisions" on decisions
  for select using (
    is_final
    and superseded_at is null
    and exists (
      select 1 from submissions s
      where s.id = submission_id and s.author_id = auth.uid()
    )
  );

-- Track Editors likewise: the incoming chair starts clean. The Convener
-- and Editorial Office keep the full history.
drop policy if exists "staff read decisions" on decisions;
create policy "staff read decisions" on decisions
  for select using (
    (edits_submission(submission_id) and superseded_at is null)
    or has_role('chief')
    or has_role('admin')
  );

-- Only the Convener (or Editorial Office) may void a decision.
drop policy if exists "chief supersedes decisions" on decisions;
create policy "chief supersedes decisions" on decisions
  for update using (has_role('chief') or has_role('admin'))
  with check (has_role('chief') or has_role('admin'));
