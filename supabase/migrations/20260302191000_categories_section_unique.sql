begin;

alter table public.categories
  drop constraint if exists categories_slug_key;

alter table public.categories
  drop constraint if exists categories_name_key;

alter table public.categories
  add constraint categories_section_slug_key unique (section, slug);

alter table public.categories
  add constraint categories_section_name_key unique (section, name);

commit;
