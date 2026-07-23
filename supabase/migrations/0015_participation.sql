-- Capture the author's intended level of participation on each submission.
--   submission_type    : abstract_presentation | full_paper_presentation
--   participation_mode : virtual | onsite
alter table submissions
  add column if not exists submission_type text not null default '';
alter table submissions
  add column if not exists participation_mode text not null default '';
