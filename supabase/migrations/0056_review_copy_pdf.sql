-- =====================================================================
-- Blinded review copy. buildCameraReady now produces TWO PDFs from the same
-- uploaded files: the full camera-ready (cover WITH author names, for the
-- author / Track Editor / Convener) and a blinded review copy (identical cover
-- but WITHOUT the author list, for single-blind reviewers). This stores the
-- blinded copy's path. Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists full_paper_review_pdf_path text;
