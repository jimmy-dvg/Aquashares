create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  reference_type text not null default 'none',
  reference_id uuid,
  severity text not null default 'medium',
  status text not null default 'open',
  title text not null,
  message text not null,
  dedup_key text,
  occurrence_count integer not null default 1,
  assignee_id uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_source_type_check'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_source_type_check
      check (source_type in ('user_signup', 'post_created', 'comment_created', 'chat_message', 'like', 'system'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_reference_type_check'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_reference_type_check
      check (reference_type in ('none', 'post', 'comment', 'chat', 'user'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_severity_check'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_severity_check
      check (severity in ('low', 'medium', 'high', 'critical'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_notifications_status_check'
  ) then
    alter table public.admin_notifications
      add constraint admin_notifications_status_check
      check (status in ('open', 'resolved'));
  end if;
end
$$;

create index if not exists idx_admin_notifications_status
  on public.admin_notifications(status, severity, last_seen_at desc);

create index if not exists idx_admin_notifications_assignee
  on public.admin_notifications(assignee_id, status, last_seen_at desc);

create unique index if not exists idx_admin_notifications_dedup_open
  on public.admin_notifications(dedup_key)
  where dedup_key is not null and status = 'open';

drop trigger if exists trg_admin_notifications_set_updated_at on public.admin_notifications;
create trigger trg_admin_notifications_set_updated_at
before update on public.admin_notifications
for each row
execute function public.set_updated_at();

create or replace function public.create_admin_notification(
  p_source_type text,
  p_source_id uuid,
  p_reference_type text,
  p_reference_id uuid,
  p_severity text,
  p_title text,
  p_message text,
  p_dedup_key text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if p_dedup_key is not null then
    select n.id
      into target_id
    from public.admin_notifications n
    where n.dedup_key = p_dedup_key
      and n.status = 'open'
    limit 1;

    if target_id is not null then
      update public.admin_notifications
      set occurrence_count = occurrence_count + 1,
          last_seen_at = timezone('utc', now()),
          message = p_message,
          severity = p_severity,
          payload = coalesce(p_payload, '{}'::jsonb)
      where id = target_id;

      return target_id;
    end if;
  end if;

  insert into public.admin_notifications (
    source_type,
    source_id,
    reference_type,
    reference_id,
    severity,
    title,
    message,
    dedup_key,
    payload,
    last_seen_at
  )
  values (
    p_source_type,
    p_source_id,
    p_reference_type,
    p_reference_id,
    p_severity,
    p_title,
    p_message,
    p_dedup_key,
    coalesce(p_payload, '{}'::jsonb),
    timezone('utc', now())
  )
  returning id into target_id;

  return target_id;
end;
$$;

grant execute on function public.create_admin_notification(text, uuid, text, uuid, text, text, text, text, jsonb)
to authenticated;

alter table public.admin_notifications enable row level security;

drop policy if exists "admin_notifications_select_admins" on public.admin_notifications;
create policy "admin_notifications_select_admins"
on public.admin_notifications
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admin_notifications_update_admins" on public.admin_notifications;
create policy "admin_notifications_update_admins"
on public.admin_notifications
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "admin_notifications_insert_admins" on public.admin_notifications;
create policy "admin_notifications_insert_admins"
on public.admin_notifications
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create or replace function public.notify_admin_on_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  username_label text;
begin
  username_label := coalesce(new.display_name, new.username, 'Unknown user');

  perform public.create_admin_notification(
    'user_signup',
    new.id,
    'user',
    new.id,
    'low',
    'New user signup',
    'New user joined: ' || username_label,
    null,
    jsonb_build_object('username', new.username, 'displayName', new.display_name)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_user_signup on public.profiles;
create trigger trg_notify_admin_on_user_signup
after insert on public.profiles
for each row
execute function public.notify_admin_on_user_signup();

create or replace function public.notify_admin_on_post_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dedup text;
begin
  dedup := 'post-created:' || new.user_id::text || ':' || to_char(timezone('utc', now()), 'YYYYMMDDHH24');

  perform public.create_admin_notification(
    'post_created',
    new.id,
    'post',
    new.id,
    'medium',
    'New post activity',
    'New post published: ' || coalesce(new.title, 'Untitled post'),
    dedup,
    jsonb_build_object('title', new.title, 'userId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_post_created on public.posts;
create trigger trg_notify_admin_on_post_created
after insert on public.posts
for each row
execute function public.notify_admin_on_post_created();

create or replace function public.notify_admin_on_comment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dedup text;
begin
  dedup := 'comment-created:' || new.post_id::text || ':' || to_char(timezone('utc', now()), 'YYYYMMDDHH24');

  perform public.create_admin_notification(
    'comment_created',
    new.id,
    'comment',
    new.id,
    'low',
    'Comment activity',
    'New comments are being added to posts.',
    dedup,
    jsonb_build_object('postId', new.post_id, 'userId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_comment_created on public.comments;
create trigger trg_notify_admin_on_comment_created
after insert on public.comments
for each row
execute function public.notify_admin_on_comment_created();

create or replace function public.notify_admin_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dedup text;
begin
  dedup := 'chat-message:' || new.conversation_id::text || ':' || to_char(timezone('utc', now()), 'YYYYMMDDHH24');

  perform public.create_admin_notification(
    'chat_message',
    new.id,
    'chat',
    new.conversation_id,
    'medium',
    'Chat activity',
    'New chat messages are being exchanged.',
    dedup,
    jsonb_build_object('conversationId', new.conversation_id, 'userId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_chat_message on public.chat_messages;
create trigger trg_notify_admin_on_chat_message
after insert on public.chat_messages
for each row
execute function public.notify_admin_on_chat_message();

create or replace function public.notify_admin_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dedup text;
begin
  dedup := 'like:' || new.post_id::text || ':' || to_char(timezone('utc', now()), 'YYYYMMDDHH24');

  perform public.create_admin_notification(
    'like',
    new.post_id,
    'post',
    new.post_id,
    'low',
    'Like activity',
    'Posts are receiving likes.',
    dedup,
    jsonb_build_object('postId', new.post_id, 'userId', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_on_like on public.post_likes;
create trigger trg_notify_admin_on_like
after insert on public.post_likes
for each row
execute function public.notify_admin_on_like();

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'admin_notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.admin_notifications';
  end if;
end;
$$;