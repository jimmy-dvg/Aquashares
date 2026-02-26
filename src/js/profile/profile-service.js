import { supabase } from '../services/supabase-client.js';

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

function isMissingRelation(error, relationName) {
  const message = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toUpperCase();

  if (code === 'PGRST205' || code === '42P01') {
    return true;
  }

  return message.includes(`could not find the '${relationName}' relation in the schema cache`)
    || message.includes(`could not find the table 'public.${relationName}' in the schema cache`)
    || message.includes(`could not find the table '${relationName}' in the schema cache`)
    || message.includes(`relation \"${relationName}\" does not exist`)
    || message.includes(`relation \"public.${relationName}\" does not exist`);
}

function isMissingColumn(error, columnName) {
  const message = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toUpperCase();

  if (code === '42703') {
    return true;
  }

  return message.includes(`column \"${columnName.toLowerCase()}\" does not exist`)
    || message.includes(`column profiles.${columnName.toLowerCase()} does not exist`)
    || message.includes(`column public.profiles.${columnName.toLowerCase()} does not exist`)
    || message.includes(`could not find the '${columnName.toLowerCase()}' column`)
    || message.includes(`could not find a relationship between`)
    || message.includes('bad request');
}

function getDefaultPreferences() {
  return {
    notifyComments: true,
    notifyReplies: true,
    notifyModeration: true,
    showEmail: false,
    showActivity: true
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    username: row.username || '',
    displayName: row.display_name || '',
    avatarUrl: row.avatar_url || '',
    avatarStoragePath: row.avatar_storage_path || '',
    bio: row.bio || '',
    location: row.location || '',
    website: row.website || '',
    isPublic: typeof row.is_public === 'boolean' ? row.is_public : true,
    createdAt: row.created_at
  };
}

function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at
  };
}

function mapComment(row, postTitleById) {
  return {
    id: row.id,
    postId: row.post_id,
    postTitle: postTitleById.get(row.post_id) || 'Post',
    body: row.body,
    createdAt: row.created_at
  };
}

function mapPreferences(row) {
  return {
    notifyComments: row.notify_comments,
    notifyReplies: row.notify_replies,
    notifyModeration: row.notify_moderation,
    showEmail: row.show_email,
    showActivity: row.show_activity
  };
}

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throwServiceError(error, 'Unable to verify session.');
  }

  const user = data?.session?.user ?? null;

  if (!user?.id) {
    throw new Error('Authentication required.');
  }

  return user;
}

export async function getMyProfile(userId) {
  let data = null;
  let error = null;

  const extendedProfileSelect = 'id, username, display_name, avatar_url, avatar_storage_path, bio, location, website, is_public, created_at';
  const legacyProfileSelect = 'id, username, display_name, avatar_url, bio, created_at';

  ({ data, error } = await supabase
    .from('profiles')
    .select(extendedProfileSelect)
    .eq('id', userId)
    .maybeSingle());

  if (error && (isMissingColumn(error, 'avatar_storage_path') || isMissingColumn(error, 'location') || isMissingColumn(error, 'website') || isMissingColumn(error, 'is_public'))) {
    ({ data, error } = await supabase
      .from('profiles')
      .select(legacyProfileSelect)
      .eq('id', userId)
      .maybeSingle());
  }

  if (error) {
    throwServiceError(error, 'Failed to load profile.');
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert([{ id: userId }])
      .select(legacyProfileSelect)
      .single();

    if (insertError) {
      throwServiceError(insertError, 'Failed to create profile.');
    }

    return mapProfile(inserted);
  }

  return mapProfile(data);
}

export async function updateMyProfile(userId, payload) {
  let updatePayload = {
    username: payload.username,
    display_name: payload.displayName,
    bio: payload.bio,
    location: payload.location,
    website: payload.website,
    is_public: payload.isPublic,
    avatar_url: payload.avatarUrl,
    avatar_storage_path: payload.avatarStoragePath
  };

  let data = null;
  let error = null;

  ({ data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select('id, username, display_name, avatar_url, avatar_storage_path, bio, location, website, is_public, created_at')
    .single());

  if (error && (isMissingColumn(error, 'avatar_storage_path') || isMissingColumn(error, 'location') || isMissingColumn(error, 'website') || isMissingColumn(error, 'is_public'))) {
    updatePayload = {
      username: payload.username,
      display_name: payload.displayName,
      bio: payload.bio,
      avatar_url: payload.avatarUrl
    };

    ({ data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, username, display_name, avatar_url, bio, created_at')
      .single());
  }

  if (error) {
    throwServiceError(error, 'Failed to update profile.');
  }

  return mapProfile(data);
}

export async function getMyProfileStats(userId) {
  const [{ count: postCount, error: postsError }, { count: commentCount, error: commentsError }] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
  ]);

  if (postsError) {
    throwServiceError(postsError, 'Failed to load post stats.');
  }

  if (commentsError) {
    throwServiceError(commentsError, 'Failed to load comment stats.');
  }

  return {
    postCount: postCount ?? 0,
    commentCount: commentCount ?? 0
  };
}

export async function getMyPosts(userId, limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throwServiceError(error, 'Failed to load your posts.');
  }

  return (data ?? []).map(mapPost);
}

export async function getMyComments(userId, limit = 20) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, body, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throwServiceError(error, 'Failed to load your comments.');
  }

  const postIds = [...new Set((data ?? []).map((item) => item.post_id).filter(Boolean))];
  let postTitleById = new Map();

  if (postIds.length) {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title')
      .in('id', postIds);

    if (postsError) {
      throwServiceError(postsError, 'Failed to load related posts.');
    }

    postTitleById = new Map((posts ?? []).map((post) => [post.id, post.title]));
  }

  return (data ?? []).map((item) => mapComment(item, postTitleById));
}

export async function getMyProfilePreferences(userId) {
  const { data, error } = await supabase
    .from('profile_preferences')
    .select('notify_comments, notify_replies, notify_moderation, show_email, show_activity')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error, 'profile_preferences')) {
      return getDefaultPreferences();
    }

    throwServiceError(error, 'Failed to load profile preferences.');
  }

  if (data) {
    return mapPreferences(data);
  }

  const defaultRow = {
    user_id: userId,
    notify_comments: true,
    notify_replies: true,
    notify_moderation: true,
    show_email: false,
    show_activity: true
  };

  const { data: inserted, error: insertError } = await supabase
    .from('profile_preferences')
    .upsert([defaultRow], { onConflict: 'user_id' })
    .select('notify_comments, notify_replies, notify_moderation, show_email, show_activity')
    .single();

  if (insertError) {
    throwServiceError(insertError, 'Failed to create profile preferences.');
  }

  return mapPreferences(inserted);
}

export async function updateMyProfilePreferences(userId, preferences) {
  const payload = {
    user_id: userId,
    notify_comments: preferences.notifyComments,
    notify_replies: preferences.notifyReplies,
    notify_moderation: preferences.notifyModeration,
    show_email: preferences.showEmail,
    show_activity: preferences.showActivity
  };

  const { data, error } = await supabase
    .from('profile_preferences')
    .upsert([payload], { onConflict: 'user_id' })
    .select('notify_comments, notify_replies, notify_moderation, show_email, show_activity')
    .single();

  if (error) {
    if (isMissingRelation(error, 'profile_preferences')) {
      return getDefaultPreferences();
    }

    throwServiceError(error, 'Failed to update profile preferences.');
  }

  return mapPreferences(data);
}
