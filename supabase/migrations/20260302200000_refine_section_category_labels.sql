begin;

update public.categories
set
  name = case slug
    when 'fish' then 'Риби'
    when 'plants' then 'Растения'
    when 'inhabitants' then 'Обитатели'
    when 'equipment' then 'Оборудване'
    when 'other' then 'Други'
    else name
  end,
  updated_at = now()
where section = 'forum';

update public.categories
set
  name = case slug
    when 'giveaway' then 'Общо подаряване'
    when 'plants' then 'Растения за подаряване'
    when 'fish' then 'Риби за подаряване'
    when 'inhabitants' then 'Скариди и охлюви за подаряване'
    when 'equipment' then 'Оборудване за подаряване'
    when 'other' then 'Храни и препарати за подаряване'
    else name
  end,
  updated_at = now()
where section = 'giveaway';

update public.categories
set
  name = case slug
    when 'exchange' then 'Общо разменям'
    when 'plants' then 'Растения за размяна'
    when 'fish' then 'Риби за размяна'
    when 'inhabitants' then 'Скариди и охлюви за размяна'
    when 'equipment' then 'Оборудване за размяна'
    when 'other' then 'Търся/Предлагам за размяна'
    else name
  end,
  updated_at = now()
where section = 'exchange';

commit;
