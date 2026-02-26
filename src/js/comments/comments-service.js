import { supabase } from '../services/supabase-client.js';

function mapComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name || 'User',
    authorUsername: row.author_username || ''
  };
}

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export async function getCommentsByPostId(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, created_at, updated_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    throwServiceError(error, 'Failed to load comments.');
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((item) => item.user_id).filter(Boolean))];
  let authorMap = new Map();

  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', userIds);

    if (!profilesError) {
      authorMap = new Map((profiles ?? []).map((profile) => [
        profile.id,
        {
          authorName: profile.display_name || profile.username || 'User',
          authorUsername: profile.username || ''
        }
      ]));
    }
  }

  return rows.map((row) => mapComment({
    ...row,
    author_name: authorMap.get(row.user_id)?.authorName || 'User',
    author_username: authorMap.get(row.user_id)?.authorUsername || ''
  }));
}

export async function createComment(data) {
  const payload = {
    post_id: data.postId,
    user_id: data.userId,
    body: data.body
  };

  const { data: result, error } = await supabase
    .from('comments')
    .insert([payload])
    .select('id, post_id, user_id, body, created_at, updated_at')
    .single();

  if (error) {
    throwServiceError(error, 'Failed to create comment.');
  }

  return mapComment(result);
}

export async function updateComment(commentId, body) {
  const { data, error } = await supabase
    .from('comments')
    .update({ body })
    .eq('id', commentId)
    .select('id, post_id, user_id, body, created_at, updated_at')
    .single();

  if (error) {
    throwServiceError(error, 'Failed to update comment.');
  }

  return mapComment(data);
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throwServiceError(error, 'Failed to delete comment.');
  }
}

export function subscribeToPostComments(postId, onInsert) {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `post_id=eq.${postId}`
    }, (payload) => {
      if (typeof onInsert === 'function' && payload?.new) {
        onInsert(mapComment(payload.new));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
