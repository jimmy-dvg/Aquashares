create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct', 'group')),
  title text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_participants_user_id
  on public.chat_participants(user_id, last_read_at desc);

create index if not exists idx_chat_messages_conversation_created_at
  on public.chat_messages(conversation_id, created_at desc);

create index if not exists idx_chat_messages_user_id
  on public.chat_messages(user_id, created_at desc);

drop trigger if exists trg_chat_conversations_set_updated_at on public.chat_conversations;
create trigger trg_chat_conversations_set_updated_at
before update on public.chat_conversations
for each row
execute function public.set_updated_at();

drop trigger if exists trg_chat_messages_set_updated_at on public.chat_messages;
create trigger trg_chat_messages_set_updated_at
before update on public.chat_messages
for each row
execute function public.set_updated_at();

create or replace function public.bump_chat_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_bump_conversation on public.chat_messages;
create trigger trg_chat_messages_bump_conversation
after insert on public.chat_messages
for each row
execute function public.bump_chat_conversation_updated_at();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_conversation_id uuid;
  created_conversation_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null then
    raise exception 'Target user is required';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot start a direct chat with yourself';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = other_user_id
  ) then
    raise exception 'Target user not found';
  end if;

  select c.id
    into existing_conversation_id
  from public.chat_conversations c
  join public.chat_participants cp1
    on cp1.conversation_id = c.id
   and cp1.user_id = current_user_id
  join public.chat_participants cp2
    on cp2.conversation_id = c.id
   and cp2.user_id = other_user_id
  where c.kind = 'direct'
    and (
      select count(*)
      from public.chat_participants cp
      where cp.conversation_id = c.id
    ) = 2
  order by c.updated_at desc
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.chat_conversations (kind, created_by)
  values ('direct', current_user_id)
  returning id into created_conversation_id;

  insert into public.chat_participants (conversation_id, user_id)
  values
    (created_conversation_id, current_user_id),
    (created_conversation_id, other_user_id)
  on conflict do nothing;

  return created_conversation_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

create policy "chat_conversations_select_participant"
on public.chat_conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_conversations.id
      and cp.user_id = auth.uid()
  )
);

create policy "chat_conversations_insert_authenticated"
on public.chat_conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "chat_conversations_update_participant"
on public.chat_conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_conversations.id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_conversations.id
      and cp.user_id = auth.uid()
  )
);

create policy "chat_participants_select_participant"
on public.chat_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_participants.conversation_id
      and cp.user_id = auth.uid()
  )
);

create policy "chat_participants_update_own"
on public.chat_participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "chat_messages_select_participant"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

create policy "chat_messages_insert_participant_owner"
on public.chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = chat_messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

create policy "chat_messages_update_owner_or_admin"
on public.chat_messages
for update
to authenticated
using (
  user_id = auth.uid() or public.is_admin(auth.uid())
)
with check (
  user_id = auth.uid() or public.is_admin(auth.uid())
);

create policy "chat_messages_delete_owner_or_admin"
on public.chat_messages
for delete
to authenticated
using (
  user_id = auth.uid() or public.is_admin(auth.uid())
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = (select oid from pg_publication where pubname = 'supabase_realtime')
      and n.nspname = 'public'
      and c.relname = 'chat_participants'
  ) then
    alter publication supabase_realtime add table public.chat_participants;
  end if;
end;
$$;
