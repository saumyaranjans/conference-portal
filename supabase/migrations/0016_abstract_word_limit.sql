-- Cap abstracts at 500 words. NOT VALID so any pre-existing longer
-- abstract is left alone; all new/updated rows are checked.
alter table submissions
  drop constraint if exists abstract_max_500_words;

alter table submissions
  add constraint abstract_max_500_words
  check (
    coalesce(
      array_length(regexp_split_to_array(btrim(abstract), '\s+'), 1),
      0
    ) <= 500
  ) not valid;
