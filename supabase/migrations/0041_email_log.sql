-- =====================================================================
-- A record of every email the portal sends.
--
-- Nothing was logged before, so the Convener had no way to see how much
-- mail had gone out — which also matters for the Resend allowance (100 a
-- day, 3,000 a month on the free plan).
-- =====================================================================
create table if not exists email_log (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  subject    text not null default '',
  kind       text not null default 'other',
  sent_by    uuid references profiles(id) on delete set null,
  resend_id  text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx on email_log (created_at desc);
create index if not exists email_log_kind_idx on email_log (kind);

alter table email_log enable row level security;

-- Only the Convener and Editorial Office read it; writes come from the
-- service-role client inside sendEmail, which bypasses RLS.
drop policy if exists "staff read email log" on email_log;
create policy "staff read email log" on email_log
  for select using (has_role('chief') or has_role('admin'));

comment on table email_log is
  'One row per email accepted by Resend. Powers the Convener''s sent-today and sent-total counts.';
