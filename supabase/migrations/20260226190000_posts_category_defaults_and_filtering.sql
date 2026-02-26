insert into public.categories (slug, name)
values
  ('fish', 'Fish'),
  ('plants', 'Plants'),
  ('inhabitants', 'Inhabitants'),
  ('equipment', 'Equipment'),
  ('other', 'Other')
on conflict (slug) do update
set name = excluded.name,
    updated_at = timezone('utc', now());

update public.posts
set category_id = c.id
from public.categories c
where c.slug = 'plants'
  and public.posts.category_id is null
  and public.posts.title ilike 'Plants:%';

update public.posts
set category_id = c.id
from public.categories c
where c.slug = 'fish'
  and public.posts.category_id is null
  and public.posts.title ilike 'Fish:%';

update public.posts
set category_id = c.id
from public.categories c
where c.slug = 'equipment'
  and public.posts.category_id is null
  and public.posts.title ilike 'Equipment:%';

update public.posts
set category_id = c.id
from public.categories c
where c.slug = 'other'
  and public.posts.category_id is null;

create index if not exists idx_posts_category_created_at
  on public.posts(category_id, created_at desc);