-- =====================================================================
-- Registration fee tracking, recorded in the Editorial Office register
-- alongside attendance confirmation. Mirrors the attended_confirmed columns
-- on submission_authors (0020) — one flag per listed author.
-- =====================================================================
alter table submission_authors
  add column if not exists registration_fee_paid boolean not null default false;
alter table submission_authors
  add column if not exists registration_fee_paid_at timestamptz;
alter table submission_authors
  add column if not exists registration_fee_paid_by uuid references profiles(id);
