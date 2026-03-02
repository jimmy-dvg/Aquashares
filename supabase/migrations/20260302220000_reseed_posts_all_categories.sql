begin;

-- Remove existing post-related data
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
    ('forum', 'plants', 'Нови криптокорини в 120л', 'Добавих нови криптокорини и анубиаси. Приемам съвети за подрязване и стабилен CO2 режим.', 1),
    ('forum', 'fish', 'Апистограми в общ аквариум', 'Наблюдавам териториално поведение при апистограмите. Каква подредба работи при вас?', 2),
    ('forum', 'inhabitants', 'Неритина и скариди заедно', 'Искам баланс между чистачи и скариди. Споделете успешни комбинации за 60л.', 3),
    ('forum', 'equipment', 'Външен филтър за 200л', 'Смених филтъра с по-тих модел. Ако имате идеи за медии и дебит, пишете.', 4),
    ('forum', 'other', 'Седмична рутина за поддръжка', 'Правя смяна на вода всяка неделя и следя NO3/PO4. Как е вашият график?', 5),

    ('giveaway', 'plants', 'Подарявам резници ротала', 'Имам излишни резници ротала и лимнофила. Предаване в София, без заплащане.', 1),
    ('giveaway', 'fish', 'Подарявам 6 гупи ендлер', 'Здрави и активни, родени при мен. Търся отговорен акварист с подготвен съд.', 2),
    ('giveaway', 'inhabitants', 'Подарявам неокаридина синя', 'Останаха ми няколко млади скариди. Подходящи за установен аквариум.', 3),
    ('giveaway', 'equipment', 'Подарявам вътрешен филтър', 'Работещ вътрешен филтър до 80л. Подарявам го за стартиращ проект.', 4),
    ('giveaway', 'giveaway', 'Подарявам препарати за вода', 'Неразпечатани кондиционери и тест ленти с дълъг срок.', 5),
    ('giveaway', 'other', 'Подарявам дребни аква аксесоари', 'Сифон, щипка за растения и мрежичка. Вземане на място.', 1),

    ('exchange', 'plants', 'Разменям буцефаландри за мъх', 'Търся явански мъх или фисиденс. Предлагам здрави буцефаландри.', 2),
    ('exchange', 'fish', 'Разменям молинезии за тетри', 'Имам млади молинезии, търся пасажни дребни тетри.', 3),
    ('exchange', 'inhabitants', 'Разменям охлюви хелена', 'Предлагам хелени, търся амано скариди или неритини.', 4),
    ('exchange', 'equipment', 'Разменям LED осветление', 'Разменям LED лампа 60 см за по-къса версия 45 см.', 5),
    ('exchange', 'foods', 'Разменям храни и препарати', 'Имам излишна гранула за цихлиди и кондиционер. Търся храна за скариди.', 1),
    ('exchange', 'exchange', 'Търся/Предлагам за размяна: обща тема', 'Пускам обща тема за комбинирани оферти за размяна в София и Пловдив.', 2),
    ('exchange', 'other', 'Разменям други аква принадлежности', 'Предлагам таймер и магнит за стъкло, търся нагревател 100W.', 3)
)
insert into posts (user_id, category_id, title, body, created_at, updated_at)
select
  a.id as user_id,
  c.id as category_id,
  s.title,
  s.body,
  now() - (((row_number() over (order by s.section, s.slug) - 1) * 5) || ' hours')::interval,
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
