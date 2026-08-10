-- =====================================================================
-- Delegate registration and payment.
--
-- Until now "registered" and "fee paid" existed only as staff toggles on
-- submission_authors (0031 / 0064 / 0065): the Editorial Office ticked a box
-- once money arrived by some out-of-band route. This adds the delegate's own
-- side of that — a registration they create themselves and pay for through a
-- payment gateway — while leaving the staff register untouched, so the desk
-- can still record a payment that came in by cheque or NEFT.
--
-- Money rules that shape the schema:
--   * Amounts are SNAPSHOT onto the registration row, never recomputed on
--     read. A delegate who registers on 20 Dec pays the early-bird fee even
--     if the Editorial Office opens the record in January.
--   * Nothing here is writable by the delegate. There are deliberately no
--     insert/update policies for `authenticated`; every write goes through a
--     server action holding the service-role key, which computes the amount
--     from the profile. A client that POSTs "amount: 1" has nowhere to put it.
--   * A gateway may call back more than once for the same payment. order_id
--     is unique and the callback is written idempotently.
-- =====================================================================

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  conference_id uuid references conferences(id) on delete set null,
  -- The paper this delegate is registering for, when they have one. Null for
  -- an attendee who is not presenting.
  submission_id uuid references submissions(id) on delete set null,

  -- Snapshot of the inputs the fee was computed from, so a later change to a
  -- profile's category or country cannot silently rewrite what was charged.
  participant_category text not null default '',
  country              text not null default '',
  is_member            boolean not null default false,

  fee_tier text not null check (fee_tier in ('early', 'regular')),
  currency text not null check (currency in ('INR', 'USD')),
  -- Whole currency units (rupees / dollars), matching registrationFees.ts.
  base_amount     integer not null check (base_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  amount          integer not null check (amount >= 0),

  participation_mode text check (participation_mode in ('virtual', 'onsite')),

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),

  -- The refund policy is a no-refund policy, so consent to it is part of the
  -- record rather than a line of page copy. Not nullable: a registration row
  -- cannot exist without the delegate having accepted. The version pins WHICH
  -- wording they accepted (see lib/refundPolicy.ts), so a later revision to
  -- the clauses cannot be read back onto an older consent.
  refund_policy_accepted_at timestamptz not null default now(),
  refund_policy_version     text not null default '',

  paid_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One PAID registration per person. Pending and failed attempts may pile up
-- (a delegate who abandons the gateway and comes back should not be blocked),
-- but a second successful payment cannot land.
create unique index if not exists registrations_one_paid_per_profile
  on registrations (profile_id)
  where status = 'paid';

create index if not exists registrations_profile_idx on registrations (profile_id);
create index if not exists registrations_status_idx  on registrations (status);

-- ---------------------------------------------------------------------
-- One row per attempt to pay a registration through a gateway.
-- ---------------------------------------------------------------------
create table if not exists payment_orders (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,

  -- Our reference, handed to the gateway and echoed back. Unique so a
  -- duplicate callback updates the same row instead of creating a second.
  order_id text not null unique,
  provider text not null,

  amount   integer not null check (amount >= 0),
  currency text not null check (currency in ('INR', 'USD')),

  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'failed', 'cancelled')),

  -- The gateway's own transaction id, once it gives us one.
  provider_ref text,
  -- Whatever the gateway sent back, kept verbatim for reconciliation with the
  -- bank's settlement report. Never read for control flow.
  provider_payload jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists payment_orders_registration_idx
  on payment_orders (registration_id);

-- ---------------------------------------------------------------------
-- RLS: read-only for the people they concern, writable only by the service
-- role (server actions) and conference staff.
-- ---------------------------------------------------------------------
alter table registrations  enable row level security;
alter table payment_orders enable row level security;

drop policy if exists "delegates read own registration" on registrations;
create policy "delegates read own registration" on registrations
  for select using (
    profile_id = auth.uid() or has_role('chief') or has_role('admin')
  );

drop policy if exists "delegates read own payment orders" on payment_orders;
create policy "delegates read own payment orders" on payment_orders
  for select using (
    exists (
      select 1 from registrations r
      where r.id = payment_orders.registration_id
        and (r.profile_id = auth.uid() or has_role('chief') or has_role('admin'))
    )
  );

-- Staff may correct a registration by hand (a payment that arrived by NEFT,
-- a duplicate to cancel). Delegates get no write policy at all.
drop policy if exists "staff manage registrations" on registrations;
create policy "staff manage registrations" on registrations
  for update using (has_role('chief') or has_role('admin'))
  with check (has_role('chief') or has_role('admin'));

-- ---------------------------------------------------------------------
-- Keep updated_at honest.
-- ---------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists registrations_touch on registrations;
create trigger registrations_touch before update on registrations
  for each row execute function touch_updated_at();

drop trigger if exists payment_orders_touch on payment_orders;
create trigger payment_orders_touch before update on payment_orders
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------
-- A paid registration stamps paid_at once and keeps it.
-- ---------------------------------------------------------------------
create or replace function stamp_registration_paid()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_stamp_paid on registrations;
create trigger registrations_stamp_paid before update on registrations
  for each row execute function stamp_registration_paid();
