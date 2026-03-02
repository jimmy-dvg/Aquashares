begin;

insert into public.categories (slug, name, section)
values
  ('plants', 'Растения', 'giveaway'),
  ('fish', 'Риби', 'giveaway'),
  ('inhabitants', 'Обитатели', 'giveaway'),
  ('equipment', 'Оборудване', 'giveaway'),
  ('other', 'Други', 'giveaway'),
  ('plants', 'Растения', 'exchange'),
  ('fish', 'Риби', 'exchange'),
  ('inhabitants', 'Обитатели', 'exchange'),
  ('equipment', 'Оборудване', 'exchange'),
  ('other', 'Други', 'exchange')
on conflict (section, slug)
do update
set
  name = excluded.name,
  updated_at = now();

commit;
