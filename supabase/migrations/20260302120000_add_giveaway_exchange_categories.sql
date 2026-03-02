insert into public.categories (slug, name)
values
  ('giveaway', 'Подарявам'),
  ('exchange', 'Разменям')
on conflict (slug) do update
set name = excluded.name,
    updated_at = timezone('utc', now());
