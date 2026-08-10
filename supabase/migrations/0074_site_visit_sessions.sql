-- =====================================================================
-- Make visit analytics reflect what visitors actually do.
--
-- Until now a browser session inserted exactly one row — the first page it
-- landed on — so the table could answer "how many people came" but not "what
-- did they read". Recording every page a session opens answers both, provided
-- we can tell the two apart: hence session_id, which groups a session's rows.
-- Sessions are counted as distinct session_id values, page views as rows.
--
-- Rows written before this migration have a null session_id. They each
-- represent one session that recorded one page, so the dashboard counts a null
-- session_id as a session in its own right rather than lumping them together.
--
-- referrer records where the visitor came from, which is the one question the
-- geography maps cannot answer — a traffic spike is only actionable if you know
-- which announcement or link produced it.
-- =====================================================================

alter table site_visits add column if not exists session_id text;
alter table site_visits add column if not exists referrer text;

create index if not exists site_visits_session_id_idx on site_visits (session_id);
create index if not exists site_visits_path_idx on site_visits (path);
