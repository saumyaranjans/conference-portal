-- =====================================================================
-- Pathway B: the author chooses which publishing outlet(s) their full paper
-- should be considered for (journals / book / conference proceedings). They
-- may pick several. Stored as an array of publication_opportunities ids.
-- Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists requested_outlet_ids uuid[] not null default '{}';
