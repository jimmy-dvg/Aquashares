do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where schemaname = 'public'
      and tablename = 'comments'
      and pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end
$$;
