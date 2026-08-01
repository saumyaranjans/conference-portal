-- =====================================================================
-- The reviewer-invitation notification is now created in the application
-- (sendReviewerInvite), where the one-time invite_token is known, so it can
-- link to the token-backed Accept/Decline page — which works even before the
-- invitee holds the reviewer role. The old trigger also posted a notification
-- linking to /reviewer, which a first-time reviewer cannot reach. Drop that
-- notification from the trigger; keep only its status transition.
--
-- Safe to run more than once.
-- =====================================================================

create or replace function on_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Move the paper into review the moment the first reviewer is assigned.
  update submissions
     set status = 'under_review', updated_at = now()
   where id = new.submission_id and status = 'submitted';

  return new;
end;
$$;
