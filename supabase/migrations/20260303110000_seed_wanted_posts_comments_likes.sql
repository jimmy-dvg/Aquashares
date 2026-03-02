begin;

with authors as (
  select id, row_number() over (order by created_at, id) as rn
  from public.profiles
),
authors_count as (
  select count(*)::int as total from authors
),
seed_posts(slug, title, body, author_slot) as (
  values
    ('fish', '[Търся/Риби] Търся пасаж от неон тетри', 'Търся здрав пасаж неон тетри за 120л аквариум. Предпочитам лично предаване в София.', 1),
    ('plants', '[Търся/Растения] Търся бързорастящи растения', 'Търся хигрофила, ротала или валиснерия за стартиращ растителен аквариум.', 2),
    ('inhabitants', '[Търся/Обитатели] Търся амано скариди', 'Търся 6-10 амано скариди за общ аквариум, без агресивни риби.', 3),
    ('equipment', '[Търся/Оборудване и аксесоари] Търся външен филтър', 'Търся тих външен филтър за обем около 150л, в добро работно състояние.', 4),
    ('foods', '[Търся/Храни и препарати] Търся храна за дънни риби', 'Търся потъващи гранули/таблетки за коридораси и препарати за кондициониране.', 5),
    ('other', '[Търся/Други] Търся аквариумна стойка 80см', 'Търся стабилна стойка за аквариум с дължина 80см. Приемам и предложения втора употреба.', 1)
)
insert into public.posts (user_id, category_id, section, title, body, created_at, updated_at)
select
  a.id,
  c.id,
  'wanted',
  s.title,
  s.body,
  now() - (((row_number() over (order by s.slug) - 1) * 3) || ' hours')::interval,
  now()
from seed_posts s
join public.categories c
  on c.section = 'wanted'
 and c.slug = s.slug
join authors_count ac
  on ac.total > 0
join authors a
  on a.rn = (((s.author_slot - 1) % ac.total) + 1)
where not exists (
  select 1
  from public.posts p
  where p.title = s.title
);

with authors as (
  select id, row_number() over (order by created_at, id) as rn
  from public.profiles
),
authors_count as (
  select count(*)::int as total from authors
),
post_targets as (
  select p.id, p.user_id, row_number() over (order by p.created_at desc, p.id) as rn
  from public.posts p
),
comment_seed as (
  select
    pt.id as post_id,
    a.id as user_id,
    case
      when (pt.rn % 3) = 1 then 'Полезна публикация, следя темата с интерес.'
      when (pt.rn % 3) = 2 then 'И аз търся подобно решение, ще се радвам на ъпдейт.'
      else 'Благодаря за споделената информация, много е полезна.'
    end as body
  from post_targets pt
  join authors_count ac on ac.total > 0
  join authors a
    on a.rn = (((pt.rn) % ac.total) + 1)
  where a.id <> pt.user_id
),
comment_seed_two as (
  select
    pt.id as post_id,
    a.id as user_id,
    case
      when (pt.rn % 2) = 0 then 'Подкрепям идеята, дано намериш това което търсиш.'
      else 'Ако има развитие по темата, пиши тук за всички.'
    end as body
  from post_targets pt
  join authors_count ac on ac.total > 1
  join authors a
    on a.rn = ((((pt.rn + 1) % ac.total) + 1))
  where a.id <> pt.user_id
)
insert into public.comments (post_id, user_id, body, created_at, updated_at)
select cs.post_id, cs.user_id, cs.body, now(), now()
from (
  select * from comment_seed
  union all
  select * from comment_seed_two
) cs
where not exists (
  select 1
  from public.comments c
  where c.post_id = cs.post_id
    and c.user_id = cs.user_id
    and c.body = cs.body
);

with authors as (
  select id, row_number() over (order by created_at, id) as rn
  from public.profiles
),
authors_count as (
  select count(*)::int as total from authors
),
post_targets as (
  select p.id, p.user_id, row_number() over (order by p.created_at desc, p.id) as rn
  from public.posts p
),
like_seed_one as (
  select
    pt.id as post_id,
    a.id as user_id
  from post_targets pt
  join authors_count ac on ac.total > 0
  join authors a
    on a.rn = (((pt.rn) % ac.total) + 1)
  where a.id <> pt.user_id
),
like_seed_two as (
  select
    pt.id as post_id,
    a.id as user_id
  from post_targets pt
  join authors_count ac on ac.total > 1
  join authors a
    on a.rn = ((((pt.rn + 1) % ac.total) + 1))
  where a.id <> pt.user_id
)
insert into public.post_likes (post_id, user_id, created_at)
select ls.post_id, ls.user_id, now()
from (
  select * from like_seed_one
  union
  select * from like_seed_two
) ls
on conflict (post_id, user_id) do nothing;

commit;
