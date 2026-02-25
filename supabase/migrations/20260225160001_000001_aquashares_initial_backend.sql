-- Extensions
create extension if not exists pgcrypto;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  public_url text,
  caption text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Indexes
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_category_id on public.posts(category_id);
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_photos_post_id on public.photos(post_id);
create index if not exists idx_photos_user_id on public.photos(user_id);

-- Triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = check_user_id
      and ur.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_roles_set_updated_at on public.user_roles;
create trigger trg_user_roles_set_updated_at
before update on public.user_roles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_categories_set_updated_at on public.categories;
create trigger trg_categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_comments_set_updated_at on public.comments;
create trigger trg_comments_set_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

drop trigger if exists trg_photos_set_updated_at on public.photos;
create trigger trg_photos_set_updated_at
before update on public.photos
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- RLS Enable
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.photos enable row level security;

-- Policies
-- profiles
create policy "profiles_select_public"
on public.profiles
for select
to public
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- user_roles
create policy "user_roles_select_own_or_admin"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "user_roles_insert_admin_only"
on public.user_roles
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "user_roles_update_admin_only"
on public.user_roles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "user_roles_delete_admin_only"
on public.user_roles
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- categories
create policy "categories_select_public"
on public.categories
for select
to public
using (true);

create policy "categories_insert_admin_only"
on public.categories
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "categories_update_admin_only"
on public.categories
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "categories_delete_admin_only"
on public.categories
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- posts
create policy "posts_select_public"
on public.posts
for select
to public
using (true);

create policy "posts_insert_owner_only"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "posts_update_owner_only"
on public.posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "posts_delete_owner_or_admin"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- comments
create policy "comments_select_public"
on public.comments
for select
to public
using (true);

create policy "comments_insert_owner_only"
on public.comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "comments_delete_owner_or_admin"
on public.comments
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- photos
create policy "photos_select_public"
on public.photos
for select
to public
using (true);

create policy "photos_insert_owner_only"
on public.photos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "photos_delete_owner_only"
on public.photos
for delete
to authenticated
using (auth.uid() = user_id);

-- storage (post-images)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

create policy "storage_post_images_select_public"
on storage.objects
for select
to public
using (bucket_id = 'post-images');

create policy "storage_post_images_insert_owner_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_post_images_delete_owner_only"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Seed admin example (safe)
insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where u.email = 'demo@aquashares.com'
on conflict (user_id) do update
set role = excluded.role;
