import { supabase } from '../services/supabase-client.js';

function mapComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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

  return (data ?? []).map(mapComment);
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
