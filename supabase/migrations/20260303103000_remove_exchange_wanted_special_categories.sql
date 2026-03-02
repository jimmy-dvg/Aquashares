begin;

do $$
declare
  exchange_special_id uuid;
  exchange_other_id uuid;
  wanted_special_id uuid;
  wanted_other_id uuid;
begin
  insert into public.categories (slug, name, section)
  values ('other', 'Други', 'exchange')
  on conflict (section, slug) do nothing;

  insert into public.categories (slug, name, section)
  values ('other', 'Други', 'wanted')
  on conflict (section, slug) do nothing;

  select id into exchange_special_id
  from public.categories
  where section = 'exchange' and slug = 'exchange'
  limit 1;

  select id into exchange_other_id
  from public.categories
  where section = 'exchange' and slug = 'other'
  limit 1;

  if exchange_special_id is not null and exchange_other_id is not null then
    update public.posts
    set category_id = exchange_other_id,
        section = 'exchange',
        updated_at = now()
    where category_id = exchange_special_id;

    delete from public.categories
    where id = exchange_special_id;
  end if;

  select id into wanted_special_id
  from public.categories
  where section = 'wanted' and slug = 'wanted'
  limit 1;

  select id into wanted_other_id
  from public.categories
  where section = 'wanted' and slug = 'other'
  limit 1;

  if wanted_special_id is not null and wanted_other_id is not null then
    update public.posts
    set category_id = wanted_other_id,
        section = 'wanted',
        updated_at = now()
    where category_id = wanted_special_id;

    delete from public.categories
    where id = wanted_special_id;
  end if;
end
$$;

commit;
