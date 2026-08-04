-- =====================================================================
-- Lightweight reviewer certificates, driven from Reviewer Management.
-- A staff-triggered "Certificate of Appreciation (Reviewer)" per reviewer,
-- gated only on the reviewer having at least one completed (submitted) review.
-- Parallel to participation_certificates; separate from the governed office.
-- =====================================================================

create table if not exists reviewer_certificates (
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

alter table reviewer_certificates enable row level security;

drop policy if exists "staff manage reviewer certificates" on reviewer_certificates;
create policy "staff manage reviewer certificates"
  on reviewer_certificates for all
  using (has_role('admin') or has_role('chief'))
  with check (has_role('admin') or has_role('chief'));

drop policy if exists "reviewer reads own certificate" on reviewer_certificates;
create policy "reviewer reads own certificate"
  on reviewer_certificates for select
  using (recipient_profile_id = auth.uid());

comment on table reviewer_certificates is
  'Staff-generated reviewer certificate, surfaced on the reviewer dashboard.';
