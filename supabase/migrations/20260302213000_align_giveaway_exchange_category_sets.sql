begin;

-- Giveaway: exact labels requested
update categories
set name = 'Растения'
where section = 'giveaway' and slug = 'plants';

update categories
set name = 'Риби'
where section = 'giveaway' and slug = 'fish';

update categories
set name = 'Обитатели'
where section = 'giveaway' and slug = 'inhabitants';

update categories
set name = 'Оборудване и аксесоари'
where section = 'giveaway' and slug = 'equipment';

update categories
set name = 'Други'
where section = 'giveaway' and slug = 'other';

update categories
set name = 'Храни и препарати'
where section = 'giveaway' and slug = 'giveaway';

-- Exchange: exact labels requested
update categories
set name = 'Растения'
where section = 'exchange' and slug = 'plants';

update categories
set name = 'Риби'
where section = 'exchange' and slug = 'fish';

update categories
set name = 'Обитатели'
where section = 'exchange' and slug = 'inhabitants';

update categories
set name = 'Оборудване и аксесоари'
where section = 'exchange' and slug = 'equipment';

update categories
set name = 'Други'
where section = 'exchange' and slug = 'other';

update categories
set name = 'Търся/Предлагам за размяна'
where section = 'exchange' and slug = 'exchange';

insert into categories (slug, name, section)
values ('foods', 'Храни и препарати', 'exchange')
on conflict (section, slug)
do update set name = excluded.name;

-- Data correction for previous label mapping
-- Old giveaway "other" was used as "Храни и препарати"
with giveaway_other as (
  select id from categories where section = 'giveaway' and slug = 'other' limit 1
), giveaway_foods as (
  select id from categories where section = 'giveaway' and slug = 'giveaway' limit 1
)
update posts p
set category_id = gf.id
from giveaway_other go, giveaway_foods gf
where p.category_id = go.id;

-- Old exchange "other" was used as "Търся/Предлагам за размяна"
with exchange_other as (
  select id from categories where section = 'exchange' and slug = 'other' limit 1
), exchange_trade as (
  select id from categories where section = 'exchange' and slug = 'exchange' limit 1
)
update posts p
set category_id = et.id
from exchange_other eo, exchange_trade et
where p.category_id = eo.id;

commit;
