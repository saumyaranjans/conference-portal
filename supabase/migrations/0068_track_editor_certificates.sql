-- =====================================================================
-- Lightweight track-editor certificates, driven from Track Editor
-- Management. A staff-triggered "Certificate of Appreciation (Track
-- Editor)" per editor, gated on the editor having taken at least one
-- final decision. Parallel to reviewer_certificates.
-- =====================================================================

create table if not exists track_editor_certificates (
  id                   uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null unique
                         references profiles(id) on delete cascade,
  certificate_number   text not null unique,
  display_name         text not null,
  pdf_object_path      text not null,
  pdf_sha256           text not null
    check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  generated_by         uuid references profiles(id) on delete set null,
  generated_at         timestamptz not null default now()
);

alter table track_editor_certificates enable row level security;

drop policy if exists "staff manage track editor certificates" on track_editor_certificates;
create policy "staff manage track editor certificates"
  on track_editor_certificates for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

drop policy if exists "track editor reads own certificate" on track_editor_certificates;
create policy "track editor reads own certificate"
  on track_editor_certificates for select
  using (recipient_profile_id = auth.uid());

comment on table track_editor_certificates is
  'Staff-generated track-editor certificate, surfaced on the editor dashboard.';
