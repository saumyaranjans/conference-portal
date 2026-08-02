-- =====================================================================
-- Align the conference full-paper (Pathway B) submission deadline with the
-- public timeline on the landing page: 8 December 2026. The per-paper deadline
-- a Track Editor sets at abstract acceptance is still capped by this date.
-- Safe to run more than once.
-- =====================================================================

update conferences
   set full_paper_deadline = date '2026-12-08'
 where full_paper_deadline is distinct from date '2026-12-08';
