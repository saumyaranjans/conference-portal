-- Add cover image + category to publication opportunities and seed the
-- organisers' selected-publication list.
alter table publication_opportunities
  add column if not exists category text not null default '';
alter table publication_opportunities
  add column if not exists image_url text not null default '';

delete from publication_opportunities;

insert into publication_opportunities
  (title, category, image_url, url, sort_order, is_active)
values
  ('Global Journal of Flexible Systems Management',
   'Springer / ABDC-A',
   '/journals/gjfsm.jpg',
   'https://link.springer.com/journal/40171', 1, true),
  ('International Journal of Global Business & Competitiveness',
   'Springer / ABDC-C',
   '/journals/ijgbc.jpg',
   'https://link.springer.com/journal/42943', 2, true),
  ('Book Series on Flexible Systems Management',
   'Springer / Scopus Indexed',
   '/journals/book-series.jpg',
   'https://link.springer.com/series/10780', 3, true),
  ('GLOGIFT 2027 Conference Proceeding',
   'Book with ISBN',
   '/journals/proceedings.svg',
   '', 4, true);
