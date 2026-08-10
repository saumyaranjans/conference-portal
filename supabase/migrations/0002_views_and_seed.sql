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

-- The placeholder ICCIS 2026 conference and its five sample tracks that used
-- to be seeded here were scaffolding for early development. The live GLOGIFT
-- 2027 conference and its ten tracks are created through the portal, so the
-- seed has been removed to keep fresh databases free of dummy data.
