-- Add a mobile number to authors (co-authors and corresponding author).
alter table submission_authors
  add column if not exists mobile text not null default '';
