import { supabase } from './supabase-client.js';

const POST_IMAGES_BUCKET = 'post-images';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isMissingBucketError(error) {
  const message = (error?.message || '').toLowerCase();
  return message.includes('bucket not found')
    || message.includes('bucket does not exist')
    || message.includes('not found');
}

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

function buildProfileAvatarPath(file, userId) {
  const extension = getFileExtension(file.name);
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
  return `${userId}/avatar-${uniqueSuffix}.${extension}`;
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

export async function uploadProfileAvatar(file, userId) {
  validateImageFile(file);

  if (!userId) {
    throw new Error('Missing user context for avatar upload.');
  }

  const path = buildProfileAvatarPath(file, userId);

  let uploadError = null;

  const { error } = await supabase
    .storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  uploadError = error;

  if (!uploadError) {
    const { data } = supabase
      .storage
      .from(PROFILE_AVATARS_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error('Failed to build avatar public URL.');
    }

    return {
      storagePath: path,
      publicUrl: data.publicUrl
    };
  }

  if (!isMissingBucketError(uploadError)) {
    throw new Error(uploadError.message || 'Failed to upload profile avatar.');
  }

  const fallbackPath = `${userId}/profile/${path.split('/').pop()}`;

  const { error: fallbackError } = await supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .upload(fallbackPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (fallbackError) {
    throw new Error(fallbackError.message || 'Failed to upload profile avatar.');
  }

  const { data: fallbackData } = supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(fallbackPath);

  if (!fallbackData?.publicUrl) {
    throw new Error('Failed to build avatar public URL.');
  }

  return {
    storagePath: fallbackPath,
    publicUrl: fallbackData.publicUrl
  };
}

export async function deleteProfileAvatar(path) {
  if (!path) {
    return;
  }

  const [{ error: profileBucketError }, { error: postBucketError }] = await Promise.all([
    supabase
      .storage
      .from(PROFILE_AVATARS_BUCKET)
      .remove([path]),
    supabase
      .storage
      .from(POST_IMAGES_BUCKET)
      .remove([path])
  ]);

  if (profileBucketError && postBucketError) {
    throw new Error(profileBucketError.message || postBucketError.message || 'Failed to delete profile avatar.');
  }
}
