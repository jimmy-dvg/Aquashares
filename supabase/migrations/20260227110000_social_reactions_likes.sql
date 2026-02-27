create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists idx_post_likes_user_id_created_at
  on public.post_likes(user_id, created_at desc);

alter table public.post_likes enable row level security;

create policy "post_likes_select_public"
on public.post_likes
for select
to anon, authenticated
using (true);

create policy "post_likes_insert_own"
on public.post_likes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "post_likes_delete_own_or_admin"
on public.post_likes
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'post_likes'
  ) then
    execute 'alter publication supabase_realtime add table public.post_likes';
  end if;
end;
$$;