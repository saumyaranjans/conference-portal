-- =====================================================================
-- GIFT membership verification and discount coupons.
--
-- The published fee table has always said the 20% GIFT Society discount is
-- available "only by applying the coupon code shared by the conference
-- organizers or the GIFT Society at the time of registration check-out".
-- The portal did not work that way: profiles.glogift_member is answered by
-- the delegate at sign-up (0039) and freely editable from their own profile,
-- so once online payment opens, anyone ticking the box would take 20% off an
-- unverified claim.
--
-- This closes that. Membership is now a claim that staff VERIFY; verification
-- issues a single-use coupon and emails it; the coupon is what moves the
-- price at checkout. The self-declared flag stays as the delegate's claim —
-- it is what staff review — but it no longer discounts anything by itself.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The verification decision, on the profile.
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists glogift_membership_verified boolean not null default false,
  add column if not exists glogift_membership_verified_at timestamptz,
  add column if not exists glogift_membership_verified_by uuid
    references profiles(id) on delete set null;

comment on column profiles.glogift_membership_verified is
  'Set by the Convener or Editorial Office after checking the membership number. '
  'Distinct from glogift_member, which is the delegate''s own unverified claim.';

-- A delegate must not be able to verify themselves. profiles already carries
-- an update policy for the owner, so the guard is a trigger rather than RLS.
create or replace function protect_membership_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.glogift_membership_verified is distinct from new.glogift_membership_verified
    or old.glogift_membership_verified_at is distinct from new.glogift_membership_verified_at
    or old.glogift_membership_verified_by is distinct from new.glogift_membership_verified_by
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin')
    and not has_role('chief') then
    raise exception 'GIFT membership verification may only be changed by conference staff.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_membership on profiles;
create trigger profiles_protect_membership before update on profiles
  for each row execute function protect_membership_verification();

revoke all on function protect_membership_verification() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Coupons.
--
-- One active coupon per profile: re-verifying someone who already holds one
-- must not mint a second discount. Enforced by a partial unique index rather
-- than application code, because the issuing path is also the email path and
-- a retry there should not produce two codes.
-- ---------------------------------------------------------------------
create table if not exists registration_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,

  -- Bound to the person it was issued to. A coupon forwarded to a colleague
  -- is refused at checkout rather than silently discounting the wrong person.
  profile_id uuid not null references profiles(id) on delete cascade,

  discount_percent integer not null check (discount_percent between 1 and 100),

  status text not null default 'active'
    check (status in ('active', 'redeemed', 'revoked')),

  issued_at  timestamptz not null default now(),
  issued_by  uuid references profiles(id) on delete set null,
  -- When the coupon email actually went out. Null means it was minted but the
  -- send failed, which is the state staff need to see to re-send.
  emailed_at timestamptz,

  redeemed_at     timestamptz,
  registration_id uuid references registrations(id) on delete set null
);

create unique index if not exists registration_coupons_one_active_per_profile
  on registration_coupons (profile_id)
  where status = 'active';

create index if not exists registration_coupons_profile_idx
  on registration_coupons (profile_id);

alter table registration_coupons enable row level security;

-- A delegate may read their own coupon (so the portal can show it to them),
-- staff may read all. Nobody writes except the service role: issuing and
-- redeeming both run in server actions.
drop policy if exists "read own or staff coupons" on registration_coupons;
create policy "read own or staff coupons" on registration_coupons
  for select using (
    profile_id = auth.uid() or has_role('chief') or has_role('admin')
  );

-- ---------------------------------------------------------------------
-- Which coupon paid for which registration.
-- ---------------------------------------------------------------------
alter table registrations
  add column if not exists coupon_id uuid
    references registration_coupons(id) on delete set null;

alter table registrations
  add column if not exists coupon_code text not null default '';

comment on column registrations.coupon_code is
  'The code as typed at checkout, kept even if the coupon row is later removed.';
