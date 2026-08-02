-- =====================================================================
-- Revision-stage "Response to Track Editor & Reviewer".
--
-- Abstract revision (Pathway A / abstract stage): the corresponding author
-- writes a short (<= 300 word) response, stored here. Manuscript revision
-- (Pathway B / full-paper stage): the author instead uploads a response letter
-- as a submission_files row with slot = 'response_letter' (no schema change).
-- Both appear ONLY in the revision stage.
-- Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists revision_response text;
