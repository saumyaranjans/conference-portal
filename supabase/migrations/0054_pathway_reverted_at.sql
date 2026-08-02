-- =====================================================================
-- When a corresponding author cancels a Pathway B full paper and switches the
-- paper back to Pathway A (present on the accepted abstract), record when it
-- happened so the Pathway A views can show a short "switched from Pathway B"
-- history line. Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists pathway_reverted_at timestamptz;
