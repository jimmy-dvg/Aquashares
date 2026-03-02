begin;

alter table public.profiles
  add column if not exists facebook_url text,
  add column if not exists x_url text,
  add column if not exists linkedin_url text,
  add column if not exists reddit_url text,
  add column if not exists telegram_url text;

commit;
