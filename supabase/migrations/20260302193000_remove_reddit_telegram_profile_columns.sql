begin;

alter table public.profiles
  drop column if exists reddit_url,
  drop column if exists telegram_url;

commit;
