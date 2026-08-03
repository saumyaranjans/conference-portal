-- =====================================================================
-- Lightweight participation certificates, driven from Author Management.
--
-- This is a simpler, staff-triggered path than the governed certificate
-- office (certificate_issuances). The Convener / Editorial Office marks a
-- person attended and registered, then generates a participation certificate
-- per paper. Once generated, the author sees a "Download Participation
-- Certificate" button on that paper's page; before then, nothing is shown.
-- One certificate per submission_author (i.e. per person per paper).
-- =====================================================================

create table if not exists participation_certificates (
  id                    uuid primary key default gen_random_uuid(),
  submission_author_id  uuid not null unique
                          references submission_authors(id) on delete cascade,
  certificate_number    text not null unique,
  display_name          text not null,
  paper_title           text not null default '',
  track_name            text not null default '',
  pdf_object_path       text not null,
  pdf_sha256            text not null
    check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  generated_by          uuid references profiles(id) on delete set null,
  generated_at          timestamptz not null default now()
);

alter table participation_certificates enable row level security;

-- The Convener and Editorial Office manage (generate / clear) certificates.
drop policy if exists "staff manage participation certificates"
  on participation_certificates;
create policy "staff manage participation certificates"
  on participation_certificates for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

-- An author may see the row for a paper they are listed on (so their
-- dashboard can surface the download button). The PDF bytes are only served
-- through the authenticated API route, never from storage directly.
drop policy if exists "authors read their own participation certificate"
  on participation_certificates;
create policy "authors read their own participation certificate"
  on participation_certificates for select
  using (
    exists (
      select 1 from submission_authors sa
      where sa.id = participation_certificates.submission_author_id
        and sa.profile_id = auth.uid()
    )
  );

comment on table participation_certificates is
  'Staff-generated participation certificate per submission_author, surfaced on the author dashboard.';
