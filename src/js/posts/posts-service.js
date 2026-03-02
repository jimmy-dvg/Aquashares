import { supabase } from '../services/supabase-client.js';

function mapPost(post) {
  return {
    id: post.id,
    userId: post.user_id,
    categoryId: post.category_id || null,
    section: post.section || post.categories?.section || 'forum',
    categorySlug: post.categories?.slug || '',
    categoryName: post.categories?.name || '',
    categorySection: post.section || post.categories?.section || 'forum',
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

function mapCategory(category) {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    section: category.section || 'forum'
  };
}

function getPreferredCategoryOrder(section) {
  if (section === 'giveaway') {
    return ['fish', 'plants', 'inhabitants', 'equipment', 'foods', 'other'];
  }

  if (section === 'exchange') {
    return ['fish', 'plants', 'inhabitants', 'equipment', 'foods', 'other'];
  }

  if (section === 'forum') {
    return ['fish', 'plants', 'inhabitants', 'equipment', 'other'];
  }

  if (section === 'wanted') {
    return ['fish', 'plants', 'inhabitants', 'equipment', 'foods', 'other'];
  }

  return ['fish', 'plants', 'inhabitants', 'equipment', 'foods', 'other'];
}

function sortCategories(categories, section = '') {
  const preferredOrder = getPreferredCategoryOrder(section);

  return [...categories].sort((left, right) => {
    const leftSlug = left.slug || '';
    const rightSlug = right.slug || '';

    const leftPreferredIndex = preferredOrder.indexOf(leftSlug);
    const rightPreferredIndex = preferredOrder.indexOf(rightSlug);

    const leftPreferred = leftPreferredIndex !== -1;
    const rightPreferred = rightPreferredIndex !== -1;

    if (leftPreferred && rightPreferred) {
      return leftPreferredIndex - rightPreferredIndex;
    }

    if (leftPreferred) {
      return -1;
    }

    if (rightPreferred) {
      return 1;
    }

    const leftSection = left.section || '';
    const rightSection = right.section || '';

    if (leftSection !== rightSection) {
      return leftSection.localeCompare(rightSection, undefined, { sensitivity: 'base' });
    }

    return (left.name || '').localeCompare(right.name || '', undefined, { sensitivity: 'base' });
  });
}

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export async function getAllPosts(limit = 50, section = '') {
  let query = supabase
    .from('posts')
    .select('id, user_id, category_id, section, title, body, created_at, updated_at, categories(slug, name, section), photos(id, post_id, user_id, storage_path, public_url, created_at)')
    .order('created_at', { ascending: false })
    .limit(limit);

  const normalizedSection = (section || '').trim();
  if (normalizedSection) {
    query = query.eq('section', normalizedSection);
  }

  const { data, error } = await query;

  if (error) {
    throwServiceError(error, 'Failed to load posts.');
  }

  return (data ?? []).map(mapPost);
}

export async function getPostById(id) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, category_id, section, title, body, created_at, updated_at, categories(slug, name, section), photos(id, post_id, user_id, storage_path, public_url, created_at)')
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
    category_id: data.categoryId || null,
    user_id: data.userId,
    section: data.section || undefined
  };

  const { data: result, error } = await supabase
    .from('posts')
    .insert([payload])
    .select('id, user_id, category_id, section, title, body, created_at, updated_at, categories(slug, name, section)')
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
    body: data.body,
    category_id: data.categoryId || null,
    section: data.section || undefined
  };

  const { data: result, error } = await supabase
    .from('posts')
    .update(payload)
    .eq('id', id)
    .select('id, user_id, category_id, section, title, body, created_at, updated_at, categories(slug, name, section)')
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

export async function getCategories(section = '') {
  let query = supabase
    .from('categories')
    .select('id, slug, name, section')
    .order('name', { ascending: true });

  const normalizedSection = (section || '').trim();
  if (normalizedSection) {
    query = query.eq('section', normalizedSection);
  }

  const { data, error } = await query;

  if (error) {
    throwServiceError(error, 'Failed to load categories.');
  }

  return sortCategories((data ?? []).map(mapCategory), normalizedSection);
}
