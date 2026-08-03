-- =====================================================================
-- Per-round retention of the blinded review copy.
--
-- Each revision round produces a fresh camera-ready / review copy. To let a
-- reviewer compare the ORIGINAL (previous round) against the REVISED (current,
-- change-marked) manuscript, we keep one blinded review copy per round instead
-- of overwriting a single file. This table records the storage path per round;
-- the file itself lives under a round-specific key in the `papers` bucket.
-- =====================================================================
create table if not exists submission_review_copies (
  submission_id uuid not null references submissions(id) on delete cascade,
  round int not null,
  path text not null,
  built_at timestamptz not null default now(),
  primary key (submission_id, round)
);

-- Staff + the author + assigned reviewers read these; all writes go through the
-- service role in server actions, so no permissive write policy is needed.
alter table submission_review_copies enable row level security;
