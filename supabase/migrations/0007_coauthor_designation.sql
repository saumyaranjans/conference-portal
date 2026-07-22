-- Add a designation / participant category to co-authors.
alter table submission_authors
  add column if not exists designation text not null default '';
