-- =====================================================================
-- Views were the hole in row-level security.
--
-- A view runs as its owner unless told otherwise, so a view over a protected
-- table hands out exactly what the table's policies were written to withhold.
-- presentation_score_totals did that: every criterion score, the chair who
-- awarded it, their comments and the running total, readable by anyone holding
-- the publishable key. Session scores decide awards, so they must not be
-- visible before — or after — the announcement.
--
-- published_programme keeps its owner's rights on purpose: it exists to be
-- read by the public, and it already strips the joining links (0076).
-- =====================================================================

-- Respect the caller's policies rather than the owner's rights.
alter view presentation_score_totals set (security_invoker = on);

-- Nothing reads these anonymously, so do not offer them anonymously. The
-- staff screens that use them go through the service role or an authenticated
-- session, neither of which is affected.
revoke select on presentation_score_totals from anon;
revoke select on reviewer_workload from anon;
revoke select on submission_review_stats from anon;
revoke select on conference_stats from anon;

-- The one view the public genuinely needs.
grant select on published_programme to anon, authenticated;
