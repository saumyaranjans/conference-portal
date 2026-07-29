-- Track chair can nudge a reviewer who has missed their deadline, extending
-- the due date by however many days they judge reasonable. We record when the
-- last nudge went out so the dashboard can show it and avoid pestering.
alter table assignments
  add column if not exists last_reminded_at timestamptz,
  add column if not exists reminder_count int not null default 0;

comment on column assignments.last_reminded_at is
  'When the track chair last emailed this reviewer a deadline reminder.';
