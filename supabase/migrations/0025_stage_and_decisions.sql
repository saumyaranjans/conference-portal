-- Add finer decision kinds, an abstract-accepted status, a review stage
-- and a suggested publication outlet. Enum values are added here alone so
-- later migrations/queries can use them safely.
alter type decision_kind add value if not exists 'minor_revision';
alter type decision_kind add value if not exists 'major_revision';
alter type submission_status add value if not exists 'abstract_accepted';
