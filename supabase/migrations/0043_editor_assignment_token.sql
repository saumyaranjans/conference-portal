-- Per-paper Track Editor assignment: a secret token backing the Agree / Reject
-- links in the assignment email (so the editor can respond without signing in),
-- and the reason captured when a Track Editor rejects an assigned paper.

alter table submissions
  add column if not exists editor_assignment_token text,
  add column if not exists editor_reject_reason text;

comment on column submissions.editor_assignment_token is
  'Secret token for the Track Editor Agree/Reject email links; cleared once used.';
comment on column submissions.editor_reject_reason is
  'Reason a Track Editor gave when rejecting this assignment (most recent).';

create index if not exists submissions_editor_assignment_token_idx
  on submissions (editor_assignment_token)
  where editor_assignment_token is not null;
