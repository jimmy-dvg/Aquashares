begin;

alter table public.categories
  drop constraint if exists categories_section_check;

alter table public.categories
  add constraint categories_section_check
  check (section in ('forum', 'giveaway', 'exchange', 'wanted'));

alter table public.posts
  drop constraint if exists posts_section_check;

alter table public.posts
  add constraint posts_section_check
  check (section in ('forum', 'giveaway', 'exchange', 'wanted'));

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

    if new.section not in ('forum', 'giveaway', 'exchange', 'wanted') then
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

  if new.section is not null and new.section <> category_section then
    raise exception 'Post section (%) does not match category section (%).', new.section, category_section;
  end if;

  new.section := category_section;
  return new;
end;
$$;

insert into public.categories (slug, name, section)
values
  ('fish', 'Риби', 'wanted'),
  ('plants', 'Растения', 'wanted'),
  ('inhabitants', 'Обитатели', 'wanted'),
  ('equipment', 'Оборудване и аксесоари', 'wanted'),
  ('foods', 'Храни и препарати', 'wanted'),
  ('wanted', 'Търся конкретен вид/модел', 'wanted'),
  ('other', 'Други', 'wanted')
on conflict (section, slug)
do update set
  name = excluded.name;

commit;
