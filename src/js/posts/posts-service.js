import { supabase } from '../services/supabase-client.js';

function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    title: post.title,
    body: post.body,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    photos: (post.photos ?? []).map((photo) => ({
      id: photo.id,
      postId: photo.post_id,
      userId: photo.user_id,
      storagePath: photo.storage_path,
      publicUrl: photo.public_url,
      createdAt: photo.created_at
    }))
  };
}

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export async function getAllPosts(limit = 50) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title, body, created_at, updated_at, photos(id, post_id, user_id, storage_path, public_url, created_at)')
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
    .select('id, user_id, title, body, created_at, updated_at, photos(id, post_id, user_id, storage_path, public_url, created_at)')
    .eq('id', id)
    .limit(1);

  if (error) {
    throwServiceError(error, 'Failed to load post.');
  }

  const post = data?.[0] ?? null;

  if (!post) {
    throw new Error('Post not found.');
  }

  return mapPost(post);
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
    .limit(1);

  if (error) {
    throwServiceError(error, 'Failed to create post.');
  }

  const post = result?.[0] ?? null;
  if (!post) {
    throw new Error('Failed to create post.');
  }

  return mapPost(post);
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
    .limit(1);

  if (error) {
    throwServiceError(error, 'Failed to update post.');
  }

  const updatedPost = result?.[0] ?? null;

  if (!updatedPost) {
    throw new Error('Post not found or you do not have permission to update it.');
  }

  return mapPost(updatedPost);
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

export async function createPhotoRecord(data) {
  const payload = {
    post_id: data.postId,
    user_id: data.userId,
    storage_path: data.storagePath,
    public_url: data.publicUrl
  };

  const { data: result, error } = await supabase
    .from('photos')
    .insert([payload])
    .select('id, post_id, user_id, storage_path, public_url, created_at')
    .single();

  if (error) {
    throwServiceError(error, 'Failed to save image metadata.');
  }

  return {
    id: result.id,
    postId: result.post_id,
    userId: result.user_id,
    storagePath: result.storage_path,
    publicUrl: result.public_url,
    createdAt: result.created_at
  };
}

export async function deletePhotoRecord(photoId) {
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    throwServiceError(error, 'Failed to delete image metadata.');
  }
}
