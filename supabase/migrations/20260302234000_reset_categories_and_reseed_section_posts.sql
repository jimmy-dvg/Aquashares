begin;

-- Normalize giveaway "foods" slug (replace legacy giveaway slug)
do $$
declare
  legacy_id uuid;
  foods_id uuid;
begin
  select id into legacy_id
  from categories
  where section = 'giveaway' and slug = 'giveaway'
  limit 1;

  if legacy_id is not null then
    update categories
    set name = 'Временна категория'
    where id = legacy_id;
  end if;

  insert into categories (slug, name, section)
  values ('foods', 'Храни и препарати', 'giveaway')
  on conflict (section, slug)
  do update set name = excluded.name;

  select id into foods_id
  from categories
  where section = 'giveaway' and slug = 'foods'
  limit 1;

  if legacy_id is not null and foods_id is not null then
    update posts
    set category_id = foods_id,
        section = 'giveaway',
        updated_at = now()
    where category_id = legacy_id;

    delete from categories where id = legacy_id;
  end if;
end
$$;

-- Ensure exact category labels
update categories set name = 'Риби' where section = 'forum' and slug = 'fish';
update categories set name = 'Растения' where section = 'forum' and slug = 'plants';
update categories set name = 'Обитатели' where section = 'forum' and slug = 'inhabitants';
update categories set name = 'Оборудване' where section = 'forum' and slug = 'equipment';
update categories set name = 'Други' where section = 'forum' and slug = 'other';

update categories set name = 'Риби' where section = 'giveaway' and slug = 'fish';
update categories set name = 'Растения' where section = 'giveaway' and slug = 'plants';
update categories set name = 'Обитатели' where section = 'giveaway' and slug = 'inhabitants';
update categories set name = 'Оборудване и аксесоари' where section = 'giveaway' and slug = 'equipment';
update categories set name = 'Храни и препарати' where section = 'giveaway' and slug = 'foods';
update categories set name = 'Други' where section = 'giveaway' and slug = 'other';

update categories set name = 'Риби' where section = 'exchange' and slug = 'fish';
update categories set name = 'Растения' where section = 'exchange' and slug = 'plants';
update categories set name = 'Обитатели' where section = 'exchange' and slug = 'inhabitants';
update categories set name = 'Оборудване и аксесоари' where section = 'exchange' and slug = 'equipment';
update categories set name = 'Храни и препарати' where section = 'exchange' and slug = 'foods';
update categories set name = 'Търся/Предлагам за размяна' where section = 'exchange' and slug = 'exchange';
update categories set name = 'Други' where section = 'exchange' and slug = 'other';

-- Remove old data and reseed section-pure posts
delete from notifications
where reference_type = 'post'
   or (reference_type is null and type in ('comment', 'like', 'admin_post_report'));

delete from posts;

with authors as (
  select id, row_number() over (order by created_at, id) as rn
  from profiles
),
authors_count as (
  select count(*)::int as total from authors
),
seed_posts(section, slug, title, body, author_slot) as (
  values
    ('forum', 'fish', '[Форум/Риби] Съвместимост на тетри и рамирези', 'Тема за обсъждане: кои пасажни риби се комбинират добре с рамирези в 120л?', 1),
    ('forum', 'plants', '[Форум/Растения] Подрязване на ротала и лимнофила', 'Споделете график за подрязване и осветление за плътна растителност.', 2),
    ('forum', 'inhabitants', '[Форум/Обитатели] Екип чистачи за 80л', 'Търся мнения за оптимална комбинация охлюви/скариди за чист аквариум.', 3),
    ('forum', 'equipment', '[Форум/Оборудване] Настройка на външен филтър', 'Как подреждате филтърните медии за стабилна биология и тиха работа?', 4),
    ('forum', 'other', '[Форум/Други] Седмична профилактика и тестове', 'Да обменим рутини за смяна на вода и контрол на NO2/NO3.', 5),

    ('giveaway', 'fish', '[Подарявам/Риби] Подарявам 8 млади ендлери', 'Подарявам безвъзмездно, лично предаване в София.', 1),
    ('giveaway', 'plants', '[Подарявам/Растения] Подарявам резници хигрофила', 'Имам излишни здрави резници, подарявам на стартиращ аквариум.', 2),
    ('giveaway', 'inhabitants', '[Подарявам/Обитатели] Подарявам неокаридини', 'Подарявам 10+ млади скариди за установен аквариум.', 3),
    ('giveaway', 'equipment', '[Подарявам/Оборудване] Подарявам вътрешен филтър', 'Работещ филтър до 80л, подарявам без заплащане.', 4),
    ('giveaway', 'foods', '[Подарявам/Храни и препарати] Подарявам кондиционер', 'Неразпечатан препарат за вода, подарявам.', 5),
    ('giveaway', 'other', '[Подарявам/Други] Подарявам аксесоари', 'Подарявам мрежичка, пинсета и магнит за стъкло.', 1),

    ('exchange', 'fish', '[Разменям/Риби] Разменям молинезии за тетри', 'Разменям млади молинезии срещу дребни пасажни риби.', 2),
    ('exchange', 'plants', '[Разменям/Растения] Разменям анубиас за мъх', 'Търся явански мъх, предлагам анубиас нана.', 3),
    ('exchange', 'inhabitants', '[Разменям/Обитатели] Разменям охлюви хелена', 'Размяна срещу неритини или амано скариди.', 4),
    ('exchange', 'equipment', '[Разменям/Оборудване и аксесоари] Разменям LED лампа', 'Разменям 60см лампа за 45см модел.', 5),
    ('exchange', 'foods', '[Разменям/Храни и препарати] Разменям гранула', 'Разменям храна за цихлиди срещу храна за скариди.', 1),
    ('exchange', 'exchange', '[Разменям/Търся-предлагам] Обща тема за размяна', 'Публикувайте комбинирани оферти за размяна тук.', 2),
    ('exchange', 'other', '[Разменям/Други] Разменям аксесоари', 'Разменям таймер и вакуумен сифoн срещу нагревател 100W.', 3)
)
insert into posts (user_id, category_id, section, title, body, created_at, updated_at)
select
  a.id as user_id,
  c.id as category_id,
  s.section,
  s.title,
  s.body,
  now() - (((row_number() over (order by s.section, s.slug) - 1) * 4) || ' hours')::interval,
  now()
from seed_posts s
join categories c
  on c.section = s.section
 and c.slug = s.slug
join authors_count ac
  on ac.total > 0
join authors a
  on a.rn = (((s.author_slot - 1) % ac.total) + 1);

commit;
