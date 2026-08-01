-- =====================================================================
-- Editorial Office certificate management.
--
-- Certificate evidence is deliberately kept off submission_authors. Authors
-- can edit rows belonging to their own paper, while the evidence below must be
-- controlled exclusively by the Editorial Office (admin role).
-- =====================================================================

create table if not exists participant_certificate_evidence (
  id                    uuid primary key default gen_random_uuid(),
  submission_author_id  uuid not null unique
                          references submission_authors(id) on delete cascade,
  salutation_override   text not null default '',
  glogift_member        boolean not null default false,
  registration_fee_paid boolean not null default false,
  amount_paid           numeric(12,2),
  currency              text not null default 'INR',
  payment_reference     text not null default '',
  paid_at               timestamptz,
  attended_confirmed    boolean not null default false,
  presentation_confirmed boolean not null default false,
  presentation_date     date,
  notes                 text not null default '',
  verified_by           uuid references profiles(id) on delete set null,
  verified_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint participant_certificate_amount_check
    check (amount_paid is null or amount_paid >= 0),
  constraint participant_certificate_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint participant_certificate_payment_check
    check (
      not registration_fee_paid
      or (amount_paid is not null and amount_paid > 0 and paid_at is not null)
    ),
  constraint participant_certificate_presentation_check
    check (not presentation_confirmed or presentation_date is not null)
);

create table if not exists track_editor_service_evidence (
  id               uuid primary key default gen_random_uuid(),
  track_editor_id  uuid not null unique
                     references track_editors(id) on delete cascade,
  service_confirmed boolean not null default false,
  service_date      date,
  notes             text not null default '',
  verified_by       uuid references profiles(id) on delete set null,
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists certificate_signatures (
  signatory_key text primary key
    check (signatory_key in ('mahadeo-prasad-jaiswal', 'seema-gupta', 'saumyaranjan-sahoo')),
  object_path   text not null,
  mime_type     text not null
    check (mime_type in ('image/png', 'image/jpeg')),
  file_sha256   text not null,
  uploaded_by   uuid references profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create table if not exists certificate_issuances (
  id                    uuid primary key default gen_random_uuid(),
  certificate_number    text not null unique,
  certificate_type      text not null
    check (certificate_type in ('participant', 'reviewer', 'track_editor')),
  conference_id         uuid not null references conferences(id) on delete restrict,
  recipient_profile_id  uuid references profiles(id) on delete restrict,
  submission_author_id  uuid references submission_authors(id) on delete restrict,
  track_editor_id       uuid references track_editors(id) on delete restrict,
  display_name          text not null,
  data_snapshot         jsonb not null default '{}'::jsonb,
  signature_snapshot    jsonb not null default '{}'::jsonb,
  template_version      integer not null default 1,
  pdf_object_path       text not null,
  pdf_sha256            text not null
    check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
  issued_by             uuid not null references profiles(id) on delete restrict,
  issued_at             timestamptz not null default now(),
  revoked_by            uuid references profiles(id) on delete set null,
  revoked_at            timestamptz,
  revocation_reason     text not null default '',
  constraint certificate_subject_check check (
    (certificate_type = 'participant' and submission_author_id is not null)
    or (certificate_type = 'reviewer' and recipient_profile_id is not null)
    or (certificate_type = 'track_editor' and track_editor_id is not null)
  )
);

create unique index if not exists one_active_participant_certificate
  on certificate_issuances (conference_id, submission_author_id)
  where certificate_type = 'participant' and revoked_at is null;

create unique index if not exists one_active_reviewer_certificate
  on certificate_issuances (conference_id, recipient_profile_id)
  where certificate_type = 'reviewer' and revoked_at is null;

create unique index if not exists one_active_track_editor_certificate
  on certificate_issuances (conference_id, track_editor_id)
  where certificate_type = 'track_editor' and revoked_at is null;

alter table participant_certificate_evidence enable row level security;
alter table track_editor_service_evidence enable row level security;
alter table certificate_signatures enable row level security;
alter table certificate_issuances enable row level security;

drop policy if exists "editorial office manages participant certificate evidence"
  on participant_certificate_evidence;
create policy "editorial office manages participant certificate evidence"
  on participant_certificate_evidence for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists "editorial office manages track editor service evidence"
  on track_editor_service_evidence;
create policy "editorial office manages track editor service evidence"
  on track_editor_service_evidence for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists "editorial office manages certificate signatures"
  on certificate_signatures;
create policy "editorial office manages certificate signatures"
  on certificate_signatures for all
  using (has_role('admin')) with check (has_role('admin'));

drop policy if exists "editorial office manages certificate issuances"
  on certificate_issuances;
drop policy if exists "editorial office reads certificate issuances"
  on certificate_issuances;
create policy "editorial office reads certificate issuances"
  on certificate_issuances for select
  using (has_role('admin'));

drop policy if exists "editorial office issues certificates"
  on certificate_issuances;
create policy "editorial office issues certificates"
  on certificate_issuances for insert
  with check (has_role('admin'));

drop policy if exists "editorial office revokes certificates"
  on certificate_issuances;
create policy "editorial office revokes certificates"
  on certificate_issuances for update
  using (has_role('admin')) with check (has_role('admin'));

create or replace function preserve_certificate_issuance_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.certificate_number is distinct from new.certificate_number
    or old.certificate_type is distinct from new.certificate_type
    or old.conference_id is distinct from new.conference_id
    or old.recipient_profile_id is distinct from new.recipient_profile_id
    or old.submission_author_id is distinct from new.submission_author_id
    or old.track_editor_id is distinct from new.track_editor_id
    or old.display_name is distinct from new.display_name
    or old.data_snapshot is distinct from new.data_snapshot
    or old.signature_snapshot is distinct from new.signature_snapshot
    or old.template_version is distinct from new.template_version
    or old.pdf_object_path is distinct from new.pdf_object_path
    or old.pdf_sha256 is distinct from new.pdf_sha256
    or old.issued_by is distinct from new.issued_by
    or old.issued_at is distinct from new.issued_at then
    raise exception 'An issued certificate snapshot is immutable; revoke and reissue.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_preserve_certificate_issuance_snapshot
  on certificate_issuances;
create trigger trg_preserve_certificate_issuance_snapshot
  before update on certificate_issuances
  for each row execute function preserve_certificate_issuance_snapshot();

create or replace function validate_certificate_issuance_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence_id uuid;
  signature_row record;
  signature_count integer := 0;
  snapshot_item jsonb;
begin
  if new.display_name = '' then
    raise exception 'A certificate recipient name is required.'
      using errcode = '23514';
  end if;

  if new.certificate_type = 'participant' then
    select evidence.id into evidence_id
      from participant_certificate_evidence evidence
      join submission_authors author_row
        on author_row.id = evidence.submission_author_id
      join submissions submission
        on submission.id = author_row.submission_id
     where author_row.id = new.submission_author_id
       and submission.conference_id = new.conference_id
       and submission.status not in ('draft', 'rejected', 'withdrawn')
       and evidence.registration_fee_paid
       and evidence.amount_paid > 0
       and evidence.attended_confirmed
       and evidence.presentation_confirmed
       and evidence.presentation_date is not null
     for share of evidence;
    if evidence_id is null then
      raise exception 'Participant certificate eligibility is incomplete.'
        using errcode = '23514';
    end if;
  elsif new.certificate_type = 'reviewer' then
    if not exists (
      select 1
        from reviews review
        join assignments assignment on assignment.id = review.assignment_id
        join submissions submission on submission.id = review.submission_id
       where review.reviewer_id = new.recipient_profile_id
         and assignment.reviewer_id = review.reviewer_id
         and assignment.submission_id = review.submission_id
         and assignment.status = 'submitted'
         and review.is_submitted
         and submission.conference_id = new.conference_id
    ) then
      raise exception 'A completed review is required.'
        using errcode = '23514';
    end if;
  elsif new.certificate_type = 'track_editor' then
    select service.id into evidence_id
      from track_editor_service_evidence service
      join track_editors membership on membership.id = service.track_editor_id
      join tracks track on track.id = membership.track_id
     where membership.id = new.track_editor_id
       and membership.status = 'accepted'
       and track.conference_id = new.conference_id
       and service.service_confirmed
     for share of service;
    if evidence_id is null then
      raise exception 'Track Editor service confirmation is required.'
        using errcode = '23514';
    end if;
  end if;

  for signature_row in
    select signatory_key, object_path, mime_type, file_sha256
      from certificate_signatures
     order by signatory_key
     for share
  loop
    snapshot_item := new.signature_snapshot -> signature_row.signatory_key;
    if snapshot_item is null
      or snapshot_item ->> 'object_path' is distinct from signature_row.object_path
      or snapshot_item ->> 'mime_type' is distinct from signature_row.mime_type
      or snapshot_item ->> 'file_sha256' is distinct from signature_row.file_sha256 then
      raise exception 'The certificate signature snapshot is not current.'
        using errcode = '23514';
    end if;
    signature_count := signature_count + 1;
  end loop;
  if signature_count <> 3 then
    raise exception 'All three official signatures are required.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_certificate_issuance_eligibility
  on certificate_issuances;
create trigger trg_validate_certificate_issuance_eligibility
  before insert on certificate_issuances
  for each row execute function validate_certificate_issuance_eligibility();

create or replace function revoke_certificates_after_evidence_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  participant_id uuid;
  editor_membership_id uuid;
begin
  if tg_table_name = 'participant_certificate_evidence' then
    participant_id := case when tg_op = 'DELETE'
      then old.submission_author_id else new.submission_author_id end;
    update certificate_issuances
       set revoked_at = now(),
           revoked_by = auth.uid(),
           revocation_reason = 'Participant verification changed; reissue required.'
     where submission_author_id = participant_id
       and revoked_at is null;
  elsif tg_table_name = 'track_editor_service_evidence' then
    editor_membership_id := case when tg_op = 'DELETE'
      then old.track_editor_id else new.track_editor_id end;
    update certificate_issuances
       set revoked_at = now(),
           revoked_by = auth.uid(),
           revocation_reason = 'Track Editor service verification changed; reissue required.'
     where track_editor_id = editor_membership_id
       and revoked_at is null;
  else
    update certificate_issuances
       set revoked_at = now(),
           revoked_by = auth.uid(),
           revocation_reason = 'Official signature set changed; reissue required.'
     where revoked_at is null;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revoke_participant_certificates_on_evidence_change
  on participant_certificate_evidence;
create trigger trg_revoke_participant_certificates_on_evidence_change
  after insert or update or delete on participant_certificate_evidence
  for each row execute function revoke_certificates_after_evidence_change();

drop trigger if exists trg_revoke_track_editor_certificates_on_evidence_change
  on track_editor_service_evidence;
create trigger trg_revoke_track_editor_certificates_on_evidence_change
  after insert or update or delete on track_editor_service_evidence
  for each row execute function revoke_certificates_after_evidence_change();

drop trigger if exists trg_revoke_certificates_on_signature_change
  on certificate_signatures;
create trigger trg_revoke_certificates_on_signature_change
  after insert or update or delete on certificate_signatures
  for each row execute function revoke_certificates_after_evidence_change();

-- The original self-service profile policy is intentionally broad so users
-- can maintain contact details. A column guard prevents that policy from
-- being abused to add the admin role or reactivate a disabled account.
create or replace function protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.id is distinct from new.id
    or old.roles is distinct from new.roles
    or old.is_active is distinct from new.is_active
    or old.created_at is distinct from new.created_at
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin') then
    raise exception 'Only the Editorial Office may change privileged profile fields.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_fields on profiles;
create trigger trg_protect_profile_privileged_fields
  before update on profiles
  for each row execute function protect_profile_privileged_fields();

-- A reviewer may edit the contents of their own draft, but cannot bind that
-- review to somebody else's assignment/submission or rewrite a submitted
-- review. This also makes submitted-review service evidence trustworthy.
create or replace function validate_review_identity_and_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_submission uuid;
  assigned_reviewer uuid;
  assignment_state assignment_status;
begin
  if tg_op = 'DELETE' then
    if old.is_submitted
      and coalesce(auth.role(), '') <> 'service_role'
      and not has_role('admin')
      and not has_role('chief') then
      raise exception 'A submitted review cannot be deleted by the reviewer.'
        using errcode = '55000';
    end if;
    return old;
  end if;

  select submission_id, reviewer_id, status
    into assigned_submission, assigned_reviewer, assignment_state
    from assignments
   where id = new.assignment_id;
  if not found then
    raise exception 'The review assignment does not exist.'
      using errcode = '23503';
  end if;
  if new.submission_id is distinct from assigned_submission
    or new.reviewer_id is distinct from assigned_reviewer then
    raise exception 'Review identity must match its assignment.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.is_submitted
    and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin')
    and not has_role('chief') then
    raise exception 'A submitted review is immutable.'
      using errcode = '55000';
  end if;

  if new.is_submitted then
    if assignment_state not in ('accepted', 'submitted') then
      raise exception 'Only an accepted assignment may be submitted.'
        using errcode = '23514';
    end if;
    if new.recommendation is null or new.submitted_at is null then
      raise exception 'A submitted review requires a recommendation and submission time.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_review_identity_and_submission on reviews;
create trigger trg_validate_review_identity_and_submission
  before insert or update or delete on reviews
  for each row execute function validate_review_identity_and_submission();

-- Keep the old organiser fields tamper-resistant while legacy attendance UI
-- still displays them. Certificate eligibility never trusts these fields.
create or replace function protect_submission_author_office_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.attended_confirmed is distinct from new.attended_confirmed
    or old.attendance_confirmed_at is distinct from new.attendance_confirmed_at
    or old.attendance_confirmed_by is distinct from new.attendance_confirmed_by
    or old.registration_fee_paid is distinct from new.registration_fee_paid
    or old.registration_fee_paid_at is distinct from new.registration_fee_paid_at
    or old.registration_fee_paid_by is distinct from new.registration_fee_paid_by
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not has_role('admin')
    and not has_role('chief') then
    raise exception 'Organiser verification fields may only be changed by conference staff.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_submission_author_office_fields
  on submission_authors;
create trigger trg_protect_submission_author_office_fields
  before update on submission_authors
  for each row execute function protect_submission_author_office_fields();

revoke all on function protect_submission_author_office_fields()
  from public, anon, authenticated;
revoke all on function preserve_certificate_issuance_snapshot()
  from public, anon, authenticated;
revoke all on function validate_certificate_issuance_eligibility()
  from public, anon, authenticated;
revoke all on function revoke_certificates_after_evidence_change()
  from public, anon, authenticated;
revoke all on function protect_profile_privileged_fields()
  from public, anon, authenticated;
revoke all on function validate_review_identity_and_submission()
  from public, anon, authenticated;

-- Private storage for the three genuine signatory images. The website reads
-- them only through an authenticated Editorial Office route.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'certificate-assets',
  'certificate-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "editorial office reads certificate assets"
  on storage.objects;
create policy "editorial office reads certificate assets"
  on storage.objects for select
  using (bucket_id = 'certificate-assets' and public.has_role('admin'));

drop policy if exists "editorial office uploads certificate assets"
  on storage.objects;
create policy "editorial office uploads certificate assets"
  on storage.objects for insert
  with check (bucket_id = 'certificate-assets' and public.has_role('admin'));

drop policy if exists "editorial office updates certificate assets"
  on storage.objects;
create policy "editorial office updates certificate assets"
  on storage.objects for update
  using (bucket_id = 'certificate-assets' and public.has_role('admin'))
  with check (bucket_id = 'certificate-assets' and public.has_role('admin'));

comment on table participant_certificate_evidence is
  'Editorial-Office-only evidence used to decide participant certificate eligibility.';
comment on table certificate_issuances is
  'Immutable certificate wording snapshot. Revoke and reissue rather than overwriting.';
