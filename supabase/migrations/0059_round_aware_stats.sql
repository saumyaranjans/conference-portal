-- =====================================================================
-- Round-aware dashboard stats.
--
-- After 0058 a reviewer can hold one assignment/review row PER ROUND on the
-- same submission, so the old row-counting aggregates double-counted any paper
-- that entered a revision round. Recount by DISTINCT reviewer / DISTINCT
-- submission so every stat is "per person / per paper", not "per row".
--
-- A nice side effect: rec_accept = distinct reviewers who have EVER recommended
-- Accept = the banked-Accept tally the editorial rule uses.
-- =====================================================================
create or replace view submission_review_stats
with (security_invoker = true) as
select
  s.id as submission_id,
  count(distinct a.reviewer_id)                                          as assigned_count,
  count(distinct a.reviewer_id) filter (where a.status = 'accepted')     as accepted_count,
  count(distinct a.reviewer_id) filter (where a.status = 'declined')     as declined_count,
  count(distinct r.reviewer_id) filter (where r.is_submitted)           as completed_count,
  round(avg(
    (coalesce(r.score_originality, 0)
     + coalesce(r.score_technical, 0)
     + coalesce(r.score_clarity, 0)
     + coalesce(r.score_relevance, 0)) / 4.0
  ) filter (where r.is_submitted), 2)                                    as avg_score,
  count(distinct r.reviewer_id) filter (where r.is_submitted and r.recommendation = 'accept')         as rec_accept,
  count(distinct r.reviewer_id) filter (where r.is_submitted and r.recommendation = 'minor_revision') as rec_minor,
  count(distinct r.reviewer_id) filter (where r.is_submitted and r.recommendation = 'major_revision') as rec_major,
  count(distinct r.reviewer_id) filter (where r.is_submitted and r.recommendation = 'reject')         as rec_reject
from submissions s
left join assignments a on a.submission_id = s.id
left join reviews r     on r.assignment_id = a.id
group by s.id;

-- Reviewer workload counts DISTINCT papers on the reviewer's plate, not
-- assignment rows, so multiple rounds on one paper count once.
create or replace view reviewer_workload
with (security_invoker = true) as
select
  p.id            as reviewer_id,
  p.full_name,
  p.email,
  p.affiliation,
  p.expertise,
  count(distinct a.submission_id) filter (where a.status in ('invited','accepted'))  as open_assignments,
  count(distinct a.submission_id) filter (where a.status = 'submitted')              as completed_assignments,
  count(distinct a.submission_id) filter (where a.status = 'declined')               as declined_assignments
from profiles p
left join assignments a on a.reviewer_id = p.id
where 'reviewer' = any(p.roles)
group by p.id, p.full_name, p.email, p.affiliation, p.expertise;
