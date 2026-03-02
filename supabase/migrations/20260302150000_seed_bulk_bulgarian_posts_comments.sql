begin;

with categories as (
  select id, slug
  from public.categories
  where slug in ('plants', 'fish', 'inhabitants', 'equipment', 'giveaway', 'exchange', 'other')
), users_indexed as (
  select id, row_number() over (order by created_at asc) as rn
  from auth.users
), user_meta as (
  select count(*)::int as user_count
  from users_indexed
), generated_posts as (
  select
    c.id as category_id,
    c.slug,
    gs.idx,
    u.id as author_id,
    case c.slug
      when 'plants' then format('Растения %s: Поддръжка без излишни добавки (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      when 'fish' then format('Риби %s: Спокойно хранене и стабилни параметри (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      when 'inhabitants' then format('Обитатели %s: Съвместимост в общ аквариум (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      when 'equipment' then format('Оборудване %s: По-тиха и ефективна работа (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      when 'giveaway' then format('Подарявам %s: Излишни растения и аксесоари (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      when 'exchange' then format('Разменям %s: Предложения за честна размяна (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
      else format('Други %s: Полезни наблюдения от практиката (Серия Март 2026 #%s)', gs.idx, lpad(gs.idx::text, 2, '0'))
    end as title,
    case c.slug
      when 'plants' then format('Споделям режим за подрязване, светлина и торене при растенията. При мен работи стабилно в %s-литров съд.', 40 + gs.idx * 5)
      when 'fish' then format('Тествам хранене на малки порции и равномерен график. Рибите са по-спокойни и активни при цикъл от %s дни.', 5 + gs.idx)
      when 'inhabitants' then format('Описвам комбинация от скариди, охлюви и дребни риби с минимален стрес. Наблюденията са от последните %s седмици.', 2 + gs.idx)
      when 'equipment' then format('Настройвам филтрация и поток с фокус върху нисък шум. Поддръжката е планирана на всеки %s дни.', 10 + gs.idx)
      when 'giveaway' then format('Имам налични растения/дребни аксесоари за подаряване. Предпочитам лично предаване в удобно време, пакет %s.', gs.idx)
      when 'exchange' then format('Предлагам размяна срещу сходна стойност и състояние. Нека обменим снимки и детайли за вариант %s.', gs.idx)
      else format('Събрах кратки бележки за чести въпроси при стартиране и поддръжка. Това е публикация номер %s от серията.', gs.idx)
    end as body,
    now() - make_interval(days => (70 - gs.idx)) as created_at,
    now() - make_interval(days => (70 - gs.idx)) as updated_at
  from categories c
  cross join generate_series(1, 10) as gs(idx)
  cross join user_meta um
  join users_indexed u on u.rn = (((gs.idx + ascii(left(c.slug, 1))) % um.user_count) + 1)
), inserted_posts as (
  insert into public.posts (user_id, category_id, title, body, created_at, updated_at)
  select author_id, category_id, title, body, created_at, updated_at
  from generated_posts
  returning id, user_id, title
), numbered_posts as (
  select
    ip.id as post_id,
    ip.user_id as author_id,
    ip.title,
    row_number() over (order by ip.title, ip.id) as post_n
  from inserted_posts ip
), comments_expanded as (
  select
    np.post_id,
    np.author_id,
    np.post_n,
    gs.cidx as comment_n
  from numbered_posts np
  cross join lateral generate_series(1, case when (np.post_n % 2 = 0) then 6 else 5 end) as gs(cidx)
), comments_with_users as (
  select
    ce.post_id,
    ce.author_id,
    ce.post_n,
    ce.comment_n,
    u1.id as primary_commenter_id,
    u2.id as fallback_commenter_id
  from comments_expanded ce
  cross join user_meta um
  join users_indexed u1 on u1.rn = (((ce.post_n + ce.comment_n) % um.user_count) + 1)
  join users_indexed u2 on u2.rn = ((((ce.post_n + ce.comment_n) % um.user_count) + 1) % um.user_count) + 1
), inserted_comments as (
  insert into public.comments (post_id, user_id, body, created_at, updated_at)
  select
    cwu.post_id,
    case when cwu.primary_commenter_id = cwu.author_id then cwu.fallback_commenter_id else cwu.primary_commenter_id end as commenter_id,
    case ((cwu.post_n + cwu.comment_n) % 8)
      when 0 then 'Много полезно, благодаря за споделения опит.'
      when 1 then 'Ще пробвам този подход още тази седмица.'
      when 2 then 'При мен подобна настройка даде много добър резултат.'
      when 3 then 'Ако имаш снимки, ще е супер да качиш и тях.'
      when 4 then 'Потвърждавам, че това работи стабилно и при мен.'
      when 5 then 'Добра идея, ще адаптирам графика спрямо моя аквариум.'
      when 6 then 'Благодаря, точно такава насока търсех.'
      else 'Отличен пост, очаквам и следващите части от серията.'
    end,
    now() - make_interval(days => (20 - (cwu.post_n % 20))::int, hours => cwu.comment_n::int),
    now() - make_interval(days => (20 - (cwu.post_n % 20))::int, hours => cwu.comment_n::int)
  from comments_with_users cwu
  returning id
)
select 1;

commit;
