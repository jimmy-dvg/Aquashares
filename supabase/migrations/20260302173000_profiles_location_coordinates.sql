begin;

alter table public.profiles
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

alter table public.profiles
  add constraint profiles_location_lat_range_chk
    check (location_lat is null or (location_lat >= -90 and location_lat <= 90));

alter table public.profiles
  add constraint profiles_location_lng_range_chk
    check (location_lng is null or (location_lng >= -180 and location_lng <= 180));

commit;
