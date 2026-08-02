-- =====================================================================
-- Pathway B: when an abstract is accepted, snapshot its Title / Abstract /
-- Keywords as the "Stage 1 accepted version". At the manuscript stage the
-- author may revise the Title and Abstract, but the revision must stay at
-- least 70% similar to this snapshot (enforced in the app).
-- Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists stage1_title    text,
  add column if not exists stage1_abstract text,
  add column if not exists stage1_keywords text[];
