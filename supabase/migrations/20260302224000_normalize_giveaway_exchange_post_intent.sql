begin;

update posts p
set
  title = case
    when c.section = 'giveaway' and p.title not ilike 'Подарявам:%'
      then 'Подарявам: ' || p.title
    when c.section = 'exchange' and c.slug = 'exchange' and p.title not ilike 'Търся/Предлагам за размяна:%'
      then 'Търся/Предлагам за размяна: ' || p.title
    when c.section = 'exchange' and c.slug <> 'exchange' and p.title not ilike 'Разменям:%'
      then 'Разменям: ' || p.title
    else p.title
  end,
  body = case
    when c.section = 'giveaway' and p.body not ilike '%подарявам%'
      then p.body || ' Подарявам без заплащане.'
    when c.section = 'exchange' and c.slug = 'exchange' and p.body not ilike '%размяна%'
      then p.body || ' Темата е за търся/предлагам за размяна.'
    when c.section = 'exchange' and c.slug <> 'exchange' and p.body not ilike '%разменям%'
      then p.body || ' Разменям срещу еквивалентно предложение.'
    else p.body
  end,
  updated_at = now()
from categories c
where p.category_id = c.id
  and c.section in ('giveaway', 'exchange');

commit;
