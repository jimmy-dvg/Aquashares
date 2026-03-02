begin;

alter table posts
add column if not exists section text;

update posts p
set section = coalesce(c.section, 'forum')
from categories c
where p.category_id = c.id
  and (p.section is null or p.section <> c.section);

update posts
set section = 'forum'
where section is null;

alter table posts
alter column section set default 'forum';

alter table posts
alter column section set not null;

alter table posts
drop constraint if exists posts_section_check;

alter table posts
add constraint posts_section_check
check (section in ('forum', 'giveaway', 'exchange'));

create or replace function sync_posts_section_from_category()
returns trigger
language plpgsql
as $$
declare
  category_section text;
begin
  if new.category_id is null then
    if new.section is null then
      new.section := coalesce(old.section, 'forum');
    end if;

    if new.section not in ('forum', 'giveaway', 'exchange') then
      raise exception 'Invalid posts.section value: %', new.section;
    end if;

    return new;
  end if;

  select section
    into category_section
  from categories
  where id = new.category_id;

  if category_section is null then
    raise exception 'Category % not found for post.', new.category_id;
  end if;

  new.section := category_section;
  return new;
end;
$$;

drop trigger if exists posts_sync_section_from_category on posts;

create trigger posts_sync_section_from_category
before insert or update of category_id, section
on posts
for each row
execute function sync_posts_section_from_category();

commit;
