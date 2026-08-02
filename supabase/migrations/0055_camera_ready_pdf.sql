-- =====================================================================
-- Pathway B camera-ready build. Before a full paper can be submitted, the
-- corresponding author compiles all uploaded files (except the Title Page) into
-- one PDF behind a generated, author-named cover page, previews it, and only
-- then may submit. The built PDF is stored in the papers bucket.
-- Safe to run more than once.
-- =====================================================================

alter table submissions
  add column if not exists full_paper_pdf_path     text,
  add column if not exists full_paper_pdf_built_at timestamptz;
