import { supabase } from './supabase-client.js';

const POST_IMAGES_BUCKET = 'post-images';
const PROFILE_AVATARS_BUCKET = 'profile-avatars';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_POST_IMAGE_DIMENSION = 1920;
const POST_IMAGE_QUALITY = 0.86;
const MAX_AVATAR_IMAGE_DIMENSION = 1024;
const AVATAR_IMAGE_QUALITY = 0.9;

function isMissingBucketError(error) {
  const message = (error?.message || '').toLowerCase();
  return message.includes('bucket not found')
    || message.includes('bucket does not exist')
    || message.includes('not found');
}

function isMissingObjectError(error) {
  const message = (error?.message || '').toLowerCase();
  return message.includes('not found')
    || message.includes('no such object')
    || message.includes('does not exist');
}

function getFileExtensionByMimeType(mimeType) {
  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return '';
}

function getFileExtension(filename, mimeType = '') {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return getFileExtensionByMimeType(mimeType) || 'jpg';
  }

  const extension = parts[parts.length - 1].toLowerCase();
  return extension || getFileExtensionByMimeType(mimeType) || 'jpg';
}

function validateImageFileType(file) {
  if (!(file instanceof File)) {
    throw new Error('Invalid image file.');
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

}

function validateImageFileSize(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Maximum allowed size is 5MB.');
  }
}

function getResizeOutputMimeType(fileType) {
  if (fileType === 'image/png' || fileType === 'image/webp') {
    return fileType;
  }

  return 'image/jpeg';
}

function shouldSkipResize(fileType) {
  return fileType === 'image/gif' || fileType === 'image/svg+xml';
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to process image file.'));
    };

    image.src = objectUrl;
  });
}

function calculateResizeDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height, resized: false };
  }

  const ratio = width / height;
  if (ratio >= 1) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / ratio)),
      resized: true
    };
  }

  return {
    width: Math.max(1, Math.round(maxDimension * ratio)),
    height: maxDimension,
    resized: true
  };
}

async function optimizeImageForUpload(file, { maxDimension, quality }) {
  validateImageFileType(file);

  if (shouldSkipResize(file.type)) {
    validateImageFileSize(file);
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const dimensions = calculateResizeDimensions(image.width, image.height, maxDimension);

    if (!dimensions.resized) {
      validateImageFileSize(file);
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d');
    if (!context) {
      validateImageFileSize(file);
      return file;
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    const outputType = getResizeOutputMimeType(file.type);
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });

    if (!blob) {
      validateImageFileSize(file);
      return file;
    }

    const extension = getFileExtensionByMimeType(outputType) || getFileExtension(file.name, file.type);
    const baseName = file.name.replace(/\.[^.]+$/, '') || `image-${Date.now()}`;
    const optimizedFile = new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now()
    });

    validateImageFileSize(optimizedFile);
    return optimizedFile;
  } catch {
    validateImageFileSize(file);
    return file;
  }
}

function buildStoragePath(file, userId, postId) {
  const extension = getFileExtension(file.name, file.type);
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
  return `${userId}/${postId}/${uniqueSuffix}.${extension}`;
}

function buildProfileAvatarPath(file, userId) {
  const extension = getFileExtension(file.name, file.type);
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
  return `${userId}/avatar-${uniqueSuffix}.${extension}`;
}

export async function uploadPostImage(file, userId, postId) {
  const preparedFile = await optimizeImageForUpload(file, {
    maxDimension: MAX_POST_IMAGE_DIMENSION,
    quality: POST_IMAGE_QUALITY
  });

  if (!userId || !postId) {
    throw new Error('Missing user or post context for upload.');
  }

  const path = buildStoragePath(preparedFile, userId, postId);

  const { error } = await supabase
    .storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, preparedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: preparedFile.type
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

  if (error && isMissingObjectError(error)) {
    return;
  }

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
  const preparedFile = await optimizeImageForUpload(file, {
    maxDimension: MAX_AVATAR_IMAGE_DIMENSION,
    quality: AVATAR_IMAGE_QUALITY
  });

  if (!userId) {
    throw new Error('Missing user context for avatar upload.');
  }

  const path = buildProfileAvatarPath(preparedFile, userId);

  let uploadError = null;

  const { error } = await supabase
    .storage
    .from(PROFILE_AVATARS_BUCKET)
    .upload(path, preparedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: preparedFile.type
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
    .upload(fallbackPath, preparedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: preparedFile.type
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
