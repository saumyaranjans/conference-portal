-- Manual payment confirmation.
--
-- A bank can take the money and the portal still not hear about it: the
-- callback is lost, the delegate closes the tab mid-redirect, the signature
-- fails to verify, or the gateway reports an amount that disagrees with ours
-- and the callback deliberately refuses to settle it. In every one of those
-- cases the delegate HAS paid and the portal says they have not.
--
-- The Convener resolves it by checking the bank's own record and confirming by
-- hand. That is an override of an automated decision, so it is recorded as one:
-- who confirmed it, when, against which bank reference, and why. A paid
-- registration should never be indistinguishable from one the gateway settled
-- on its own.

alter table registrations
  add column if not exists manual_confirmed_by uuid references profiles(id) on delete set null,
  add column if not exists manual_confirmed_at timestamptz,
  -- The bank's own reference (UTR / RRN / transaction id) the Convener checked
  -- against. Required by the action, so a confirmation always cites evidence.
  add column if not exists bank_reference text not null default '',
  add column if not exists manual_note text not null default '';

comment on column registrations.manual_confirmed_by is
  'Convener/Editorial Office profile who confirmed this payment by hand after checking the bank record. Null for a registration the gateway settled itself.';
comment on column registrations.bank_reference is
  'The bank reference (UTR/RRN/transaction id) cited when confirming by hand.';

-- Finding the ones that need attention: paid at the bank, pending here.
create index if not exists registrations_status_created_idx
  on registrations (status, created_at desc);
