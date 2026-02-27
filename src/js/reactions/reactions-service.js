import { supabase } from '../services/supabase-client.js';

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

function toUniquePostIds(postIds) {
  return [...new Set((postIds || []).filter(Boolean))];
}

export async function getLikesSummaryByPostIds(postIds, viewerUserId = null) {
  const uniquePostIds = toUniquePostIds(postIds);
  const summaryByPostId = new Map();

  uniquePostIds.forEach((postId) => {
    summaryByPostId.set(postId, {
      likeCount: 0,
      likedByViewer: false
    });
  });

  if (!uniquePostIds.length) {
    return summaryByPostId;
  }

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id, user_id')
    .in('post_id', uniquePostIds);

  if (error) {
    throwServiceError(error, 'Failed to load likes.');
  }

  (data ?? []).forEach((row) => {
    const current = summaryByPostId.get(row.post_id);

    if (!current) {
      return;
    }

    current.likeCount += 1;

    if (viewerUserId && row.user_id === viewerUserId) {
      current.likedByViewer = true;
    }
  });

  return summaryByPostId;
}

async function hasPostLike(postId, viewerUserId) {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', viewerUserId)
    .maybeSingle();

  if (error) {
    throwServiceError(error, 'Failed to check like state.');
  }

  return Boolean(data?.post_id);
}

async function getPostLikeCount(postId) {
  const { count, error } = await supabase
    .from('post_likes')
    .select('post_id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    throwServiceError(error, 'Failed to load like count.');
  }

  return count || 0;
}

export async function togglePostLike(postId, viewerUserId) {
  if (!viewerUserId) {
    throw new Error('Please log in to like posts.');
  }

  const alreadyLiked = await hasPostLike(postId, viewerUserId);

  if (alreadyLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', viewerUserId);

    if (error) {
      throwServiceError(error, 'Failed to remove like.');
    }
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert([{ post_id: postId, user_id: viewerUserId }]);

    if (error) {
      throwServiceError(error, 'Failed to add like.');
    }
  }

  const likeCount = await getPostLikeCount(postId);

  return {
    postId,
    likeCount,
    likedByViewer: !alreadyLiked
  };
}

export function subscribeToPostLikes(postIds, onChange) {
  const uniquePostIds = toUniquePostIds(postIds);

  if (!uniquePostIds.length || typeof onChange !== 'function') {
    return () => {};
  }

  const postIdSet = new Set(uniquePostIds);
  const channelName = `post-likes:${uniquePostIds.join(',')}:${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_likes'
      },
      (payload) => {
        const changedPostId = payload?.new?.post_id || payload?.old?.post_id || null;

        if (!changedPostId || !postIdSet.has(changedPostId)) {
          return;
        }

        onChange(changedPostId, payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
