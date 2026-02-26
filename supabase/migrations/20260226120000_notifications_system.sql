create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  reference_id uuid,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notifications_insert_service_role_only" on public.notifications;
create policy "notifications_insert_service_role_only"
on public.notifications
for insert
to service_role
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where schemaname = 'public'
      and tablename = 'notifications'
      and pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

create or replace function public.notify_post_owner_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  commenter_name text;
begin
  select p.user_id
    into post_owner_id
  from public.posts p
  where p.id = new.post_id;

  if post_owner_id is null then
    return new;
  end if;

  if post_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username, 'Someone')
    into commenter_name
  from public.profiles pr
  where pr.id = new.user_id;

  insert into public.notifications (user_id, type, reference_id, message)
  values (
    post_owner_id,
    'comment',
    new.post_id,
    commenter_name || ' commented on your post.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_post_owner_on_comment on public.comments;
create trigger trg_notify_post_owner_on_comment
after insert on public.comments
for each row
execute function public.notify_post_owner_on_comment();
