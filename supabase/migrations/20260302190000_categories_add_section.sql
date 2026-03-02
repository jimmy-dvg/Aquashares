begin;

alter table public.categories
  add column if not exists section text;

update public.categories
set section = case
  when slug = 'giveaway' then 'giveaway'
  when slug = 'exchange' then 'exchange'
  else 'forum'
end
where section is null;

alter table public.categories
  alter column section set not null;

alter table public.categories
  alter column section set default 'forum';

alter table public.categories
  add constraint categories_section_check
  check (section in ('forum', 'giveaway', 'exchange'));

create index if not exists categories_section_idx on public.categories(section);

commit;
