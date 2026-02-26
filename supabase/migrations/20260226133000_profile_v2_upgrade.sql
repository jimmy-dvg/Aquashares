alter table public.profiles
  add column if not exists avatar_storage_path text,
  add column if not exists cover_url text,
  add column if not exists location text,
  add column if not exists website text,
  add column if not exists is_public boolean not null default true;

create table if not exists public.profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_comments boolean not null default true,
  notify_replies boolean not null default true,
  notify_moderation boolean not null default true,
  show_email boolean not null default false,
  show_activity boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profile_preferences enable row level security;

create index if not exists idx_profile_preferences_user_id on public.profile_preferences(user_id);

drop trigger if exists trg_profile_preferences_set_updated_at on public.profile_preferences;
create trigger trg_profile_preferences_set_updated_at
before update on public.profile_preferences
for each row
execute function public.set_updated_at();

drop policy if exists "profile_preferences_select_own" on public.profile_preferences;
create policy "profile_preferences_select_own"
on public.profile_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile_preferences_insert_own" on public.profile_preferences;
create policy "profile_preferences_insert_own"
on public.profile_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile_preferences_update_own" on public.profile_preferences;
create policy "profile_preferences_update_own"
on public.profile_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "storage_profile_avatars_select_public" on storage.objects;
create policy "storage_profile_avatars_select_public"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

drop policy if exists "storage_profile_avatars_insert_owner_only" on storage.objects;
create policy "storage_profile_avatars_insert_owner_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_profile_avatars_delete_owner_only" on storage.objects;
create policy "storage_profile_avatars_delete_owner_only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.notify_post_owner_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  commenter_name text;
  should_notify boolean := true;
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

  select coalesce(pp.notify_comments, true)
    into should_notify
  from public.profile_preferences pp
  where pp.user_id = post_owner_id;

  if not should_notify then
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
