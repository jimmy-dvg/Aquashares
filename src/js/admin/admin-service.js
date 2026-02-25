import { supabase } from '../services/supabase-client.js';

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

function mapRoleValue(roleRow) {
  if (!roleRow) {
    return 'user';
  }

  if (Array.isArray(roleRow)) {
    return roleRow[0]?.role || 'user';
  }

  return roleRow.role || 'user';
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, created_at, user_roles(role)')
    .order('created_at', { ascending: false });

  if (error) {
    throwServiceError(error, 'Failed to load users.');
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    username: item.username || '',
    displayName: item.display_name || '',
    role: mapRoleValue(item.user_roles),
    createdAt: item.created_at
  }));
}

export async function getAllPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title, body, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throwServiceError(error, 'Failed to load posts.');
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    title: item.title,
    body: item.body,
    createdAt: item.created_at
  }));
}

export async function getAllComments() {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throwServiceError(error, 'Failed to load comments.');
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    postId: item.post_id,
    userId: item.user_id,
    body: item.body,
    createdAt: item.created_at
  }));
}

export async function deletePost(postId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    throwServiceError(error, 'Failed to delete post.');
  }
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

export async function changeUserRole(userId, role) {
  const allowedRoles = ['user', 'admin'];
  if (!allowedRoles.includes(role)) {
    throw new Error('Invalid role value.');
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert([
      {
        user_id: userId,
        role
      }
    ], { onConflict: 'user_id' });

  if (error) {
    throwServiceError(error, 'Failed to update role.');
  }
}