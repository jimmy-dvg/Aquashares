import { supabase } from './supabase-client.js';

const POST_IMAGES_BUCKET = 'post-images';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return 'jpg';
  }

  return parts[parts.length - 1].toLowerCase();
}

function validateImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Invalid image file.');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Maximum allowed size is 5MB.');
  }
}

function buildStoragePath(file, userId, postId) {
  const extension = getFileExtension(file.name);
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
  return `${userId}/${postId}/${uniqueSuffix}.${extension}`;
}

export async function uploadPostImage(file, userId, postId) {
  validateImageFile(file);

  if (!userId || !postId) {
    throw new Error('Missing user or post context for upload.');
  }

  const path = buildStoragePath(file, userId, postId);

  const { error } = await supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload image.');
  }

  return path;
}

export async function deletePostImage(path) {
  if (!path) {
    return;
  }

  const { error } = await supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(error.message || 'Failed to delete image.');
  }
}

export function getPublicUrl(path) {
  if (!path) {
    throw new Error('Image path is required.');
  }

  const { data } = supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error('Failed to build public image URL.');
  }

  return data.publicUrl;
}
