-- =====================================================================
-- Conference-wide full-paper deadline (Pathway B). This is the hard ceiling:
-- a Track Editor's per-paper full_paper_deadline may not be later than this,
-- and an author cannot submit a full paper after it.
-- Safe to run more than once.
-- =====================================================================

alter table conferences
  add column if not exists full_paper_deadline date;
