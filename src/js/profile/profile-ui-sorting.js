export function normalizePostsSort(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'oldest' || normalized === 'most_liked' || normalized === 'most_commented' || normalized === 'newest') {
    return normalized;
  }

  return 'newest';
}

export function getSortFromQueryParam(key, fallback = 'newest') {
  const params = new URLSearchParams(window.location.search);
  return normalizePostsSort(params.get(key) || fallback);
}

export function setSortInQueryParam(key, value) {
  const params = new URLSearchParams(window.location.search);
  const normalized = normalizePostsSort(value);

  if (normalized === 'newest') {
    params.delete(key);
  } else {
    params.set(key, normalized);
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `${window.location.pathname}?${queryString}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

export function sortProfilePosts(posts, sortOption = 'newest') {
  const normalized = normalizePostsSort(sortOption);
  const items = [...(posts || [])];

  if (normalized === 'oldest') {
    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  if (normalized === 'most_liked') {
    return items.sort((left, right) => {
      const likeDelta = Number(right.likeCount || 0) - Number(left.likeCount || 0);
      if (likeDelta !== 0) {
        return likeDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (normalized === 'most_commented') {
    return items.sort((left, right) => {
      const commentDelta = Number(right.commentCount || 0) - Number(left.commentCount || 0);
      if (commentDelta !== 0) {
        return commentDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function sortProfileComments(comments, sortOption = 'newest') {
  const normalized = normalizePostsSort(sortOption);
  const items = [...(comments || [])];

  if (normalized === 'oldest') {
    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  if (normalized === 'most_liked') {
    return items.sort((left, right) => {
      const likeDelta = Number(right.postLikeCount || 0) - Number(left.postLikeCount || 0);
      if (likeDelta !== 0) {
        return likeDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (normalized === 'most_commented') {
    return items.sort((left, right) => {
      const commentDelta = Number(right.postCommentCount || 0) - Number(left.postCommentCount || 0);
      if (commentDelta !== 0) {
        return commentDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}