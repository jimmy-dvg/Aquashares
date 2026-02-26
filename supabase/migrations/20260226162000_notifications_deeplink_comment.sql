-- ...existing code...
alter table public.notifications
  add column if not exists reference_type text not null default 'post';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_reference_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_reference_type_check
      check (reference_type in ('post', 'comment', 'moderation', 'system'));
  end if;
end
$$;

create index if not exists idx_notifications_reference
  on public.notifications(reference_type, reference_id);

update public.notifications
set reference_type = 'post'
where reference_type is null;

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

  if post_owner_id is null or post_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username, 'Someone')
    into commenter_name
  from public.profiles pr
  where pr.id = new.user_id;

  insert into public.notifications (user_id, type, reference_type, reference_id, message)
  values (
    post_owner_id,
    'comment',
    'comment',
    new.id,
    commenter_name || ' commented on your post.'
  );

  return new;
end;
$$;