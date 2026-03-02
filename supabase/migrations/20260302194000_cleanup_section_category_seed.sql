begin;

delete from public.categories
where slug = 'tmp_diag_slug'
  and section = 'giveaway';

update public.categories
set
  name = 'Общо',
  updated_at = now()
where (section = 'giveaway' and slug = 'giveaway')
   or (section = 'exchange' and slug = 'exchange');

commit;
