import { supabase } from '../services/supabase-client.js';

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

function formatHandle(profile) {
  if (!profile) {
    return 'User';
  }

  if (profile.username) {
    return `@${profile.username}`;
  }

  return profile.displayName || 'User';
}

function mapProfile(row) {
  return {
    id: row.id,
    username: row.username || '',
    displayName: row.display_name || row.username || 'Aquashares User',
    avatarUrl: row.avatar_url || '/assets/avatars/default-avatar.svg'
  };
}

function mapMessage(row, profileById, readByUserId) {
  const author = profileById.get(row.user_id);

  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author,
    authorLabel: formatHandle(author),
    readByUserId
  };
}

async function getProfilesByIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);

  if (error) {
    throwServiceError(error, 'Unable to load chat profiles.');
  }

  return new Map((data ?? []).map((row) => [row.id, mapProfile(row)]));
}

export async function getAuthenticatedChatUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throwServiceError(error, 'Unable to verify chat session.');
  }

  const user = data?.session?.user ?? null;

  if (!user?.id) {
    throw new Error('Authentication required.');
  }

  return user;
}

export async function searchChatUsers(query, currentUserId, limit = 20) {
  const normalized = (query || '').trim();

  let request = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .neq('id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (normalized) {
    const escaped = normalized.replace(/[%_]/g, (match) => `\\${match}`);
    request = request.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
  }

  const { data, error } = await request;

  if (error) {
    throwServiceError(error, 'Unable to search users.');
  }

  return (data ?? []).map((row) => {
    const profile = mapProfile(row);

    return {
      ...profile,
      label: formatHandle(profile)
    };
  });
}

export async function openDirectConversation(otherUserId) {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    other_user_id: otherUserId
  });

  if (error) {
    throwServiceError(error, 'Unable to open conversation.');
  }

  return data;
}

export async function getConversationList(currentUserId) {
  const { data: myParticipants, error: myParticipantsError } = await supabase
    .from('chat_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', currentUserId);

  if (myParticipantsError) {
    throwServiceError(myParticipantsError, 'Unable to load conversations.');
  }

  const conversationIds = [...new Set((myParticipants ?? []).map((row) => row.conversation_id).filter(Boolean))];

  if (!conversationIds.length) {
    return [];
  }

  const participantByConversationId = new Map((myParticipants ?? []).map((row) => [row.conversation_id, row]));

  const [{ data: conversations, error: conversationsError }, { data: participants, error: participantsError }, { data: recentMessages, error: recentMessagesError }] = await Promise.all([
    supabase
      .from('chat_conversations')
      .select('id, kind, title, updated_at, created_at')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false }),
    supabase
      .from('chat_participants')
      .select('conversation_id, user_id, joined_at, last_read_at')
      .in('conversation_id', conversationIds),
    supabase
      .from('chat_messages')
      .select('id, conversation_id, user_id, body, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(1000)
  ]);

  if (conversationsError) {
    throwServiceError(conversationsError, 'Unable to load conversation metadata.');
  }

  if (participantsError) {
    throwServiceError(participantsError, 'Unable to load conversation participants.');
  }

  if (recentMessagesError) {
    throwServiceError(recentMessagesError, 'Unable to load recent messages.');
  }

  const participantRows = participants ?? [];
  const allUserIds = participantRows.map((row) => row.user_id);
  const profileById = await getProfilesByIds(allUserIds);

  const participantsByConversationId = new Map();
  participantRows.forEach((row) => {
    const current = participantsByConversationId.get(row.conversation_id) || [];
    current.push({
      conversationId: row.conversation_id,
      userId: row.user_id,
      joinedAt: row.joined_at,
      lastReadAt: row.last_read_at,
      profile: profileById.get(row.user_id) || null
    });
    participantsByConversationId.set(row.conversation_id, current);
  });

  const latestMessageByConversationId = new Map();
  (recentMessages ?? []).forEach((row) => {
    if (!latestMessageByConversationId.has(row.conversation_id)) {
      latestMessageByConversationId.set(row.conversation_id, {
        id: row.id,
        userId: row.user_id,
        body: row.body,
        createdAt: row.created_at
      });
    }
  });

  return (conversations ?? []).map((conversation) => {
    const participantsForConversation = participantsByConversationId.get(conversation.id) || [];
    const me = participantByConversationId.get(conversation.id);
    const latestMessage = latestMessageByConversationId.get(conversation.id) || null;

    let unreadCount = 0;
    const lastReadAtMs = me?.last_read_at ? new Date(me.last_read_at).getTime() : 0;

    if (lastReadAtMs > 0) {
      (recentMessages ?? []).forEach((message) => {
        if (message.conversation_id !== conversation.id) {
          return;
        }

        if (message.user_id === currentUserId) {
          return;
        }

        const createdAtMs = new Date(message.created_at).getTime();
        if (createdAtMs > lastReadAtMs) {
          unreadCount += 1;
        }
      });
    }

    if (!lastReadAtMs) {
      (recentMessages ?? []).forEach((message) => {
        if (message.conversation_id === conversation.id && message.user_id !== currentUserId) {
          unreadCount += 1;
        }
      });
    }

    const peer = participantsForConversation.find((participant) => participant.userId !== currentUserId)?.profile || null;
    const fallbackTitle = conversation.kind === 'direct'
      ? formatHandle(peer)
      : (conversation.title || 'Group chat');

    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.title || fallbackTitle,
      peer,
      participants: participantsForConversation,
      latestMessage,
      unreadCount,
      updatedAt: conversation.updated_at,
      createdAt: conversation.created_at
    };
  });
}

export async function getConversationMessages(conversationId, limit = 100) {
  const [{ data: messages, error: messagesError }, { data: participants, error: participantsError }] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('id, conversation_id, user_id, body, created_at, updated_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit),
    supabase
      .from('chat_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId)
  ]);

  if (messagesError) {
    throwServiceError(messagesError, 'Unable to load messages.');
  }

  if (participantsError) {
    throwServiceError(participantsError, 'Unable to load conversation read state.');
  }

  const profileById = await getProfilesByIds((messages ?? []).map((message) => message.user_id));
  const readByUserId = new Map((participants ?? []).map((row) => [row.user_id, row.last_read_at]));

  return (messages ?? []).map((row) => mapMessage(row, profileById, readByUserId));
}

export async function sendChatMessage(conversationId, userId, body) {
  const payload = {
    conversation_id: conversationId,
    user_id: userId,
    body
  };

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([payload])
    .select('id, conversation_id, user_id, body, created_at, updated_at')
    .single();

  if (error) {
    throwServiceError(error, 'Unable to send message.');
  }

  return data;
}

export async function markConversationAsRead(conversationId, userId) {
  const { error } = await supabase
    .from('chat_participants')
    .update({
      last_read_at: new Date().toISOString()
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throwServiceError(error, 'Unable to update read status.');
  }
}

export function subscribeToConversation(conversationId, handlers = {}) {
  const channel = supabase
    .channel(`chat:conversation:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      if (typeof handlers.onMessageInsert === 'function' && payload?.new) {
        handlers.onMessageInsert(payload.new);
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_participants',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      if (typeof handlers.onParticipantUpdate === 'function' && payload?.new) {
        handlers.onParticipantUpdate(payload.new);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
