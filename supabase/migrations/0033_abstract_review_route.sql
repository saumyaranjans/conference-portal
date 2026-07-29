-- At the abstract stage the track chair must first say how the paper will be
-- judged: on their own expertise, or through reviewers they invite. The choice
-- gates the decision form, so it is recorded on the submission itself.
alter table submissions
  add column if not exists abstract_review_route text
    check (abstract_review_route in ('self', 'facilitated')),
  add column if not exists abstract_review_route_by uuid references profiles(id) on delete set null,
  add column if not exists abstract_review_route_at timestamptz;

comment on column submissions.abstract_review_route is
  'self = the chair judges it within their own expertise; facilitated = the chair invites reviewers because it falls outside it.';
