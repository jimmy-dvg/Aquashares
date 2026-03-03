export function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

export function isMissingRelation(error, relationName) {
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

export function isMissingColumn(error, columnName) {
  const message = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toUpperCase();

  if (code === '42703') {
    return true;
  }

  return message.includes(`column \"${columnName.toLowerCase()}\" does not exist`)
    || message.includes(`column profiles.${columnName.toLowerCase()} does not exist`)
    || message.includes(`column public.profiles.${columnName.toLowerCase()} does not exist`)
    || message.includes(`could not find the '${columnName.toLowerCase()}' column`)
    || message.includes('could not find a relationship between')
    || message.includes('bad request');
}

export function getDefaultPreferences() {
  return {
    notifyComments: true,
    notifyReplies: true,
    notifyModeration: true,
    showEmail: false,
    showActivity: true
  };
}

export function mapProfile(row) {
  const lat = typeof row.location_lat === 'number' ? row.location_lat : null;
  const lng = typeof row.location_lng === 'number' ? row.location_lng : null;

  return {
    id: row.id,
    username: row.username || '',
    displayName: row.display_name || '',
    avatarUrl: row.avatar_url || '',
    avatarStoragePath: row.avatar_storage_path || '',
    bio: row.bio || '',
    location: row.location || '',
    locationLat: Number.isFinite(lat) ? lat : null,
    locationLng: Number.isFinite(lng) ? lng : null,
    website: row.website || '',
    facebookUrl: row.facebook_url || '',
    xUrl: row.x_url || '',
    linkedinUrl: row.linkedin_url || '',
    isPublic: typeof row.is_public === 'boolean' ? row.is_public : true,
    createdAt: row.created_at
  };
}

export function mapPost(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0)
  };
}

export function mapComment(row, postTitleById, postLikeCountById, postCommentCountById) {
  return {
    id: row.id,
    postId: row.post_id,
    postTitle: postTitleById.get(row.post_id) || 'Post',
    body: row.body,
    createdAt: row.created_at,
    postLikeCount: Number(postLikeCountById.get(row.post_id) || 0),
    postCommentCount: Number(postCommentCountById.get(row.post_id) || 0)
  };
}

export function mapPreferences(row) {
  return {
    notifyComments: row.notify_comments,
    notifyReplies: row.notify_replies,
    notifyModeration: row.notify_moderation,
    showEmail: row.show_email,
    showActivity: row.show_activity
  };
}
