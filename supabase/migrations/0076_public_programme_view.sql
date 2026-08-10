-- =====================================================================
-- The public conference programme.
--
-- Publishing froze a jsonb snapshot of each session (0073) but nothing ever
-- read it, so the schedule page showed a static outline no matter what the
-- Convener published. This exposes the snapshot — minus the parts the public
-- has no business seeing.
--
-- Specifically the joining link. The old "public read sessions" policy made
-- every column of every published session world-readable through the anon key,
-- meeting_link included, so an online session could be found and joined by
-- anyone who asked the API for it. Academic sessions get disrupted this way.
-- Links now reach registered participants by email instead.
--
-- Dropping those policies costs nothing today: every existing reader of these
-- tables goes through the service role, which bypasses RLS regardless. The
-- view is the single public surface, and it exposes only what belongs on a
-- printed programme.
-- =====================================================================

drop policy if exists "public read sessions" on conference_sessions;
drop policy if exists "public read session papers" on session_papers;
drop policy if exists "session_chairs_public_read" on session_chairs;
drop policy if exists "session_volunteers_public_read" on session_volunteers;

-- The snapshot already contains papers, authors and chairs, so the public page
-- needs no access to the underlying tables at all.
create or replace view published_programme as
select
  id,
  title,
  mode,
  session_date,
  time_slot,
  academic_block,
  classroom,
  sort_order,
  published_at,
  -- Everything except the joining link.
  published_snapshot - 'meetingLink' as snapshot
from conference_sessions
where status = 'published'
  and published_snapshot is not null;

-- Runs as the owner, so it sees published rows without the base table needing
-- a public policy of its own.
alter view published_programme set (security_invoker = off);

grant select on published_programme to anon, authenticated;
