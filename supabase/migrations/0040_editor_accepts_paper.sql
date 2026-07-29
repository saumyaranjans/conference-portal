-- =====================================================================
-- A Track Editor accepts each paper, not just the track.
--
-- Being handed a paper by the Convener is an offer: it appears in the Track
-- Queue marked as awaiting acceptance, and the editor takes it on (or hands
-- it back) explicitly. Mirrors how reviewers accept an assignment.
-- =====================================================================
alter table submissions
  add column if not exists editor_accepted_at timestamptz;

comment on column submissions.editor_accepted_at is
  'When the assigned Track Editor accepted this paper. Null means the assignment is still an unanswered offer.';
