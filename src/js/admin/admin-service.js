import { supabase } from '../services/supabase-client.js';

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export async function getAllUsers() {
  const { data: authors, error: authorsError } = await supabase
    .rpc('get_admin_user_directory');

  if (authorsError) {
    throwServiceError(authorsError, 'Failed to load user directory.');
  }

  const directoryByUserId = new Map((authors ?? []).map((author) => [author.user_id, {
    username: author.username || '',
    email: author.email || ''
  }]));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) {
    throwServiceError(profilesError, 'Failed to load users.');
  }

  const userIds = (profiles ?? []).map((profile) => profile.id);
  let rolesByUserId = new Map();

  if (userIds.length) {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    if (rolesError) {
      throwServiceError(rolesError, 'Failed to load user roles.');
    }

    rolesByUserId = new Map((roles ?? []).map((roleRow) => [roleRow.user_id, roleRow.role]));
  }

  return (profiles ?? []).map((item) => ({
    id: item.id,
    username: item.username || directoryByUserId.get(item.id)?.username || '',
    email: directoryByUserId.get(item.id)?.email || '',
    displayName: item.display_name || '',
    role: rolesByUserId.get(item.id) || 'user',
    createdAt: item.created_at
  }));
}

export async function getAllPosts() {
  const { data: authors, error: authorsError } = await supabase
    .rpc('get_admin_user_directory');

  if (authorsError) {
    throwServiceError(authorsError, 'Failed to load author details.');
  }

  const authorsById = new Map((authors ?? []).map((author) => [author.user_id, {
    username: author.username || '',
    email: author.email || ''
  }]));

  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title, body, created_at, categories(slug, name)')
    .order('created_at', { ascending: false });

  if (error) {
    throwServiceError(error, 'Failed to load posts.');
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    categorySlug: item.categories?.slug || '',
    categoryName: item.categories?.name || 'Uncategorized',
    authorUsername: authorsById.get(item.user_id)?.username || '-',
    authorEmail: authorsById.get(item.user_id)?.email || '-',
    title: item.title,
    body: item.body,
    createdAt: item.created_at
  }));
}

export async function getAllComments() {
  const { data: authors, error: authorsError } = await supabase
    .rpc('get_admin_user_directory');

  if (authorsError) {
    throwServiceError(authorsError, 'Failed to load comment author details.');
  }

  const authorsById = new Map((authors ?? []).map((author) => [author.user_id, {
    username: author.username || '-',
    email: author.email || '-'
  }]));

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title');

  if (postsError) {
    throwServiceError(postsError, 'Failed to load post titles.');
  }

  const postsById = new Map((posts ?? []).map((post) => [post.id, post.title || '-']));

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
    postTitle: postsById.get(item.post_id) || '-',
    authorUsername: authorsById.get(item.user_id)?.username || '-',
    authorEmail: authorsById.get(item.user_id)?.email || '-',
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