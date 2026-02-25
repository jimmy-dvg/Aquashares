import { supabase } from '../services/supabase-client.js';

function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    title: post.title,
    body: post.body,
    createdAt: post.created_at,
    updatedAt: post.updated_at
  };
}

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export async function getAllPosts(limit = 50) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title, body, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throwServiceError(error, 'Failed to load posts.');
  }

  return (data ?? []).map(mapPost);
}

export async function getPostById(id) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title, body, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    throwServiceError(error, 'Failed to load post.');
  }

  return mapPost(data);
}

export async function createPost(data) {
  const payload = {
    title: data.title,
    body: data.body,
    user_id: data.userId
  };

  const { data: result, error } = await supabase
    .from('posts')
    .insert([payload])
    .select('id, user_id, title, body, created_at, updated_at')
    .single();

  if (error) {
    throwServiceError(error, 'Failed to create post.');
  }

  return mapPost(result);
}

export async function updatePost(id, data) {
  const payload = {
    title: data.title,
    body: data.body
  };

  const { data: result, error } = await supabase
    .from('posts')
    .update(payload)
    .eq('id', id)
    .select('id, user_id, title, body, created_at, updated_at')
    .single();

  if (error) {
    throwServiceError(error, 'Failed to update post.');
  }

  return mapPost(result);
}

export async function deletePost(id) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    throwServiceError(error, 'Failed to delete post.');
  }

  return { id };
}
