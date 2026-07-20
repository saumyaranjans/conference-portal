-- =====================================================================
-- Aggregate views used by the editor / chief / admin dashboards
-- =====================================================================

-- Per-submission review roll-up: how many reviews are in, average score,
-- and where the recommendations landed. Editors live on this view.
create or replace view submission_review_stats
with (security_invoker = true) as
select
  s.id as submission_id,
  count(a.id)                                            as assigned_count,
  count(*) filter (where a.status = 'accepted')          as accepted_count,
  count(*) filter (where a.status = 'declined')          as declined_count,
  count(r.id) filter (where r.is_submitted)              as completed_count,
  round(avg(
    (coalesce(r.score_originality, 0)
     + coalesce(r.score_technical, 0)
     + coalesce(r.score_clarity, 0)
     + coalesce(r.score_relevance, 0)) / 4.0
  ) filter (where r.is_submitted), 2)                    as avg_score,
  count(*) filter (where r.is_submitted and r.recommendation = 'accept')          as rec_accept,
  count(*) filter (where r.is_submitted and r.recommendation = 'minor_revision')  as rec_minor,
  count(*) filter (where r.is_submitted and r.recommendation = 'major_revision')  as rec_major,
  count(*) filter (where r.is_submitted and r.recommendation = 'reject')          as rec_reject
from submissions s
left join assignments a on a.submission_id = s.id
left join reviews r     on r.assignment_id = a.id
group by s.id;

-- Conference-wide counters for the chief and admin dashboards.
create or replace view conference_stats
with (security_invoker = true) as
select
  c.id as conference_id,
  c.name,
  count(s.id)                                                as total_submissions,
  count(*) filter (where s.status = 'draft')                 as drafts,
  count(*) filter (where s.status = 'submitted')             as submitted,
  count(*) filter (where s.status = 'under_review')          as under_review,
  count(*) filter (where s.status = 'revisions_requested')   as revisions,
  count(*) filter (where s.status = 'accepted')              as accepted,
  count(*) filter (where s.status = 'rejected')              as rejected,
  count(*) filter (where s.status = 'withdrawn')             as withdrawn
from conferences c
left join submissions s on s.conference_id = c.id
group by c.id, c.name;

-- Reviewer workload — the editor uses this when picking who to assign.
create or replace view reviewer_workload
with (security_invoker = true) as
select
  p.id            as reviewer_id,
  p.full_name,
  p.email,
  p.affiliation,
  p.expertise,
  count(a.id) filter (where a.status in ('invited','accepted'))  as open_assignments,
  count(a.id) filter (where a.status = 'submitted')              as completed_assignments,
  count(a.id) filter (where a.status = 'declined')               as declined_assignments
from profiles p
left join assignments a on a.reviewer_id = p.id
where 'reviewer' = any(p.roles)
group by p.id, p.full_name, p.email, p.affiliation, p.expertise;

-- =====================================================================
-- Seed: one conference with a few tracks so the portal is usable
-- immediately after deploy.
-- =====================================================================
insert into conferences (name, acronym, year, description, is_open)
values (
  'International Conference on Computing and Intelligent Systems',
  'ICCIS',
  2026,
  'Annual peer-reviewed conference covering computing, AI and intelligent systems.',
  true
)
on conflict do nothing;

insert into tracks (conference_id, name, description)
select c.id, t.name, t.description
from conferences c
cross join (values
  ('Artificial Intelligence & Machine Learning', 'Learning theory, deep learning, applications.'),
  ('Systems & Networks',                          'Distributed systems, networking, cloud.'),
  ('Human-Computer Interaction',                  'Interaction design, accessibility, UX research.'),
  ('Security & Privacy',                          'Cryptography, systems security, privacy engineering.'),
  ('Data Science & Analytics',                    'Data mining, visualisation, applied statistics.')
) as t(name, description)
where c.acronym = 'ICCIS' and c.year = 2026
on conflict (conference_id, name) do nothing;
