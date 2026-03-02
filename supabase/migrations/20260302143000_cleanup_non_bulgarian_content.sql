begin;

delete from public.comments
where body = 'QA popup comment 1772197321981'
   or body = 'erttre'
   or body = 'otkyde da gi wzema';

delete from public.posts
where title = 'Чистя аквариуми • qa';

update public.posts
set body = replace(body, 'CO2', 'въглероден диоксид')
where body like '%CO2%';

with author as (
  select id
  from auth.users
  order by created_at asc
  limit 1
), target_posts as (
  select id, title
  from public.posts
  where title in (
    'Подарявам: Явански мъх в София',
    'Подарявам анубис нана',
    'Разменям: Криптокорини за корени'
  )
), new_comments(post_title, body) as (
  values
    ('Подарявам: Явански мъх в София', 'Чудесна инициатива, благодаря за споделянето!'),
    ('Подарявам анубис нана', 'Имам интерес, мога да дойда в удобно за теб време.'),
    ('Разменям: Криптокорини за корени', 'Имам декоративни корени, ще ти пиша на лично.')
)
insert into public.comments (post_id, user_id, body)
select tp.id, a.id, nc.body
from new_comments nc
join target_posts tp on tp.title = nc.post_title
cross join author a;

commit;
