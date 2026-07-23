-- Author declarations captured at submission time.
alter table submissions
  add column if not exists declared_original boolean not null default false;
alter table submissions
  add column if not exists declared_ai_assistance boolean not null default false;
alter table submissions
  add column if not exists declared_consent_publication boolean not null default false;
