-- Completes the integrity-check record started in 0028. That migration added
-- the two scores but nothing to say who recorded them, where the provider's
-- report lives, or which tool produced them — so the columns were never usable
-- from the app. This adds the provenance a research-integrity record needs.
alter table submissions
  add column if not exists integrity_report_path text;
alter table submissions
  add column if not exists integrity_checked_by uuid references profiles(id);
alter table submissions
  add column if not exists integrity_notes text;
-- Which tool produced the scores. 'manual' = a person ran the check in the
-- provider's own interface and typed the result in; a machine-read provider
-- (e.g. 'turnitin') can be recorded here later without a schema change.
alter table submissions
  add column if not exists integrity_provider text not null default 'manual';

comment on column submissions.integrity_report_path is
  'Storage path in the private "papers" bucket to the provider''s similarity/AI report PDF.';
comment on column submissions.integrity_provider is
  'Tool that produced the scores: manual | turnitin | ithenticate.';
