-- Whether each listed author will attend the conference (and therefore
-- needs an attendance/presentation certificate, which requires paying the
-- registration fee).  Values: attending | not_attending
alter table submission_authors
  add column if not exists attendance text not null default '';
