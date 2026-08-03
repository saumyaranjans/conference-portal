-- Geolocation for website visits (from the edge/CDN request headers). Country is
-- an ISO-3166-1 alpha-2 code; region is the ISO-3166-2 subdivision code (for
-- India, the state code, e.g. OR/MH/DL). Used by the Convener's Visit Analytics.
alter table site_visits add column if not exists country text;
alter table site_visits add column if not exists region text;
alter table site_visits add column if not exists city text;
alter table site_visits add column if not exists lat double precision;
alter table site_visits add column if not exists lng double precision;

create index if not exists site_visits_country_idx on site_visits (country);
create index if not exists site_visits_region_idx on site_visits (region);
