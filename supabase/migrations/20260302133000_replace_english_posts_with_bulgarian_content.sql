with prioritized_users as (
  select
    p.id,
    p.username,
    row_number() over (
      order by
        case
          when p.username = 'demo_aquarist' then 0
          when p.username = 'admin_aquashares' then 1
          else 2
        end,
        p.created_at asc
    ) as rn
  from public.profiles p
),
primary_author as (
  select id
  from prioritized_users
  order by rn
  limit 1
),
secondary_author as (
  select id
  from prioritized_users
  where id <> (select id from primary_author)
  order by rn
  limit 1
),
deleted_posts as (
  delete from public.posts
  where title ~* '^(Plants|Fish|Equipment|Inhabitants):'
  returning id
),
category_map as (
  select id, slug
  from public.categories
),
new_posts as (
  insert into public.posts (user_id, category_id, title, body, created_at, updated_at)
  select
    pa.id,
    cm.id,
    seed.title,
    seed.body,
    timezone('utc', now()) - seed.offset_value,
    timezone('utc', now()) - seed.offset_value
  from (
    values
      ('plants', 'Растения: Лесни анубиаси за начинаещи', 'Споделям как закрепвам анубиас към корен и как поддържам стабилен растеж без СО2.', interval '6 days'),
      ('fish', 'Риби: Кардинали в 90 литра', 'Наблюдения за поведение, хранене и как поддържам спокойна среда за пасажа.', interval '5 days'),
      ('inhabitants', 'Обитатели: Амано скариди и съвместимост', 'Практически съвети за аклиматизация и комбиниране с дребни риби в общ аквариум.', interval '4 days'),
      ('equipment', 'Оборудване: Тиха външна филтрация', 'Настройки на дебит, почистване и график за поддръжка без стрес за обитателите.', interval '3 days'),
      ('giveaway', 'Подарявам: Явански мъх в София', 'Имам излишък от явански мъх и го подарявам на колеги акваристи. Лично предаване.', interval '2 days'),
      ('exchange', 'Разменям: Криптокорини за корени', 'Разменям няколко туфи криптокорина за малки декоративни корени или камъни.', interval '1 day')
  ) as seed(slug, title, body, offset_value)
  join category_map cm on cm.slug = seed.slug
  cross join primary_author pa
  returning id, user_id, title
)
insert into public.comments (post_id, user_id, body, created_at, updated_at)
select
  np.id,
  coalesce(sa.id, np.user_id),
  cseed.body,
  timezone('utc', now()) - cseed.offset_value,
  timezone('utc', now()) - cseed.offset_value
from new_posts np
left join secondary_author sa on true
join (
  values
    ('Растения: Лесни анубиаси за начинаещи', 'Много полезна публикация. Би ли споделил и каква светлина ползваш?', interval '5 days 20 hours'),
    ('Риби: Кардинали в 90 литра', 'Чудесен пасаж. Колко пъти на ден ги храниш?', interval '4 days 18 hours'),
    ('Обитатели: Амано скариди и съвместимост', 'Супер насоки за аклиматизация, благодаря!', interval '3 days 21 hours'),
    ('Оборудване: Тиха външна филтрация', 'Тази схема за почистване работи отлично и при мен.', interval '2 days 19 hours'),
    ('Подарявам: Явански мъх в София', 'Здравей, имам интерес. Може ли контакт на лично съобщение?', interval '1 day 20 hours'),
    ('Разменям: Криптокорини за корени', 'Имам подходящи корени, мога да разменя още тази седмица.', interval '18 hours')
) as cseed(title, body, offset_value)
  on cseed.title = np.title;
