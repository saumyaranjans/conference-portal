-- =====================================================================
-- Reviewer invitations: Agree / Reject from the email (token-based, no
-- sign-in), mirroring the Track-Editor paper-assignment flow.
--
--   * Existing reviewer (has an account) — the invitation lives on the
--     `assignments` row. A token on that row backs the Agree/Reject links;
--     a decline captures a reason.
--   * New person (no account) — the invitation lives on
--     `reviewer_invitations` (token already present). A decline now records
--     a reason and moves the row to status 'declined'.
--
-- Safe to run more than once.
-- =====================================================================

-- ---- 1. Existing-reviewer assignments carry an invite token ----------
alter table assignments
  add column if not exists invite_token   text,
  add column if not exists decline_reason text;

create unique index if not exists assignments_invite_token_idx
  on assignments (invite_token) where invite_token is not null;

comment on column assignments.invite_token is
  'Backs the Agree/Reject links in the reviewer invitation email (existing reviewer). One-time use.';

-- ---- 2. New-person invitations can be declined with a reason ---------
alter table reviewer_invitations
  add column if not exists decline_reason text;

-- Allow 'declined' alongside the existing pending/accepted/revoked.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'reviewer_invitations_status_check'
  ) then
    alter table reviewer_invitations
      drop constraint reviewer_invitations_status_check;
  end if;
  alter table reviewer_invitations
    add constraint reviewer_invitations_status_check
    check (status in ('pending', 'accepted', 'revoked', 'declined'));
end $$;
