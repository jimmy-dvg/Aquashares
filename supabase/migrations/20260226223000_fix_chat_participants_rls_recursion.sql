create or replace function public.is_chat_participant(conversation_id_to_check uuid, user_id_to_check uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_participants cp
    where cp.conversation_id = conversation_id_to_check
      and cp.user_id = user_id_to_check
  );
$$;

grant execute on function public.is_chat_participant(uuid, uuid) to authenticated;

drop policy if exists "chat_conversations_select_participant" on public.chat_conversations;
create policy "chat_conversations_select_participant"
on public.chat_conversations
for select
to authenticated
using (public.is_chat_participant(chat_conversations.id, auth.uid()));

drop policy if exists "chat_conversations_update_participant" on public.chat_conversations;
create policy "chat_conversations_update_participant"
on public.chat_conversations
for update
to authenticated
using (public.is_chat_participant(chat_conversations.id, auth.uid()))
with check (public.is_chat_participant(chat_conversations.id, auth.uid()));

drop policy if exists "chat_participants_select_participant" on public.chat_participants;
create policy "chat_participants_select_participant"
on public.chat_participants
for select
to authenticated
using (public.is_chat_participant(chat_participants.conversation_id, auth.uid()));

drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant"
on public.chat_messages
for select
to authenticated
using (public.is_chat_participant(chat_messages.conversation_id, auth.uid()));

drop policy if exists "chat_messages_insert_participant_owner" on public.chat_messages;
create policy "chat_messages_insert_participant_owner"
on public.chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_chat_participant(chat_messages.conversation_id, auth.uid())
);
