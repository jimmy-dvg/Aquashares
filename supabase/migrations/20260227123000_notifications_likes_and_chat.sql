alter table public.notifications
  add column if not exists reference_type text not null default 'post';

update public.notifications
set reference_type = 'post'
where reference_type is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'notifications_reference_type_check'
  ) then
    alter table public.notifications
      drop constraint notifications_reference_type_check;
  end if;

  alter table public.notifications
    add constraint notifications_reference_type_check
    check (reference_type in ('post', 'comment', 'moderation', 'system', 'chat', 'like'));
end
$$;

create index if not exists idx_notifications_reference
  on public.notifications(reference_type, reference_id);

create or replace function public.notify_post_owner_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  liker_name text;
begin
  select p.user_id
    into post_owner_id
  from public.posts p
  where p.id = new.post_id;

  if post_owner_id is null or post_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username, 'Someone')
    into liker_name
  from public.profiles pr
  where pr.id = new.user_id;

  insert into public.notifications (user_id, type, reference_type, reference_id, message)
  values (
    post_owner_id,
    'like',
    'like',
    new.post_id,
    liker_name || ' liked your post.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_post_owner_on_like on public.post_likes;
create trigger trg_notify_post_owner_on_like
after insert on public.post_likes
for each row
execute function public.notify_post_owner_on_like();

create or replace function public.notify_chat_participants_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select coalesce(pr.display_name, pr.username, 'Someone')
    into sender_name
  from public.profiles pr
  where pr.id = new.user_id;

  insert into public.notifications (user_id, type, reference_type, reference_id, message)
  select
    cp.user_id,
    'chat_message',
    'chat',
    new.conversation_id,
    sender_name || ' sent you a message.'
  from public.chat_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_chat_participants_on_message on public.chat_messages;
create trigger trg_notify_chat_participants_on_message
after insert on public.chat_messages
for each row
execute function public.notify_chat_participants_on_message();