-- Similarity index and AI-content percentage, recorded from an external
-- integrity check (e.g. Turnitin / iThenticate) by the track chair,
-- Convener or Editorial Office. Null = not checked yet.
alter table submissions
  add column if not exists similarity_index int
    check (similarity_index between 0 and 100);
alter table submissions
  add column if not exists ai_percentage int
    check (ai_percentage between 0 and 100);
alter table submissions
  add column if not exists integrity_checked_at timestamptz;
