function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * centralAngle;
}

function parseNullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeText(value) {
  return (value || '').toLowerCase().trim();
}

export async function getViewerCoordinates(feedState) {
  const now = Date.now();
  const maxAgeMs = 5 * 60 * 1000;

  if (feedState.geolocation.coords && (now - feedState.geolocation.resolvedAt) < maxAgeMs) {
    return feedState.geolocation.coords;
  }

  if (feedState.geolocation.inFlight) {
    return feedState.geolocation.inFlight;
  }

  if (!navigator.geolocation) {
    return null;
  }

  feedState.geolocation.inFlight = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition((position) => {
      const nextCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      feedState.geolocation.coords = nextCoords;
      feedState.geolocation.resolvedAt = Date.now();
      resolve(nextCoords);
    }, () => {
      resolve(null);
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  }).finally(() => {
    feedState.geolocation.inFlight = null;
  });

  return feedState.geolocation.inFlight;
}

export async function reverseGeocodeLocationName(lat, lng) {
  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
  endpoint.searchParams.set('lat', String(lat));
  endpoint.searchParams.set('lon', String(lng));
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('accept-language', 'bg');

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Неуспешно извличане на локацията.');
  }

  const payload = await response.json();
  const address = payload?.address || {};

  const locationName = [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.state,
    payload?.display_name
  ].find((value) => (value || '').trim());

  return (locationName || '').replace(/\s+/g, ' ').trim();
}

export function normalizeSortOption(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'oldest' || normalized === 'most_liked' || normalized === 'most_commented' || normalized === 'newest') {
    return normalized;
  }

  return 'newest';
}

export function normalizePhotoFilter(value) {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'with' || normalized === 'without' ? normalized : '';
}

export function matchesFeedSearch(post, searchQuery) {
  if (!searchQuery) {
    return true;
  }

  const haystack = normalizeText([
    post.title,
    post.body,
    post.categoryName,
    post.author?.username,
    post.author?.displayName,
    post.author?.location
  ].join(' '));

  return haystack.includes(searchQuery);
}

export function matchesFeedLocation(post, locationQuery) {
  if (!locationQuery) {
    return true;
  }

  return normalizeText(post.author?.location || '').includes(locationQuery);
}

export function matchesFeedAuthor(post, authorQuery) {
  if (!authorQuery) {
    return true;
  }

  const authorHaystack = normalizeText([
    post.author?.username,
    post.author?.displayName
  ].join(' '));

  return authorHaystack.includes(authorQuery);
}

export function matchesFeedPhoto(post, photoFilter) {
  if (!photoFilter) {
    return true;
  }

  const hasPhotos = Array.isArray(post.photos) && post.photos.length > 0;
  return photoFilter === 'with' ? hasPhotos : !hasPhotos;
}

export function sortPosts(posts, sortOption = 'newest') {
  const normalized = normalizeSortOption(sortOption);
  const items = [...(posts || [])];

  if (normalized === 'oldest') {
    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  if (normalized === 'most_liked') {
    return items.sort((left, right) => {
      const likeDelta = (right.likeCount || 0) - (left.likeCount || 0);
      if (likeDelta !== 0) {
        return likeDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (normalized === 'most_commented') {
    return items.sort((left, right) => {
      const commentDelta = (right.commentCount || 0) - (left.commentCount || 0);
      if (commentDelta !== 0) {
        return commentDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function matchesNearby(post, centerCoords, radiusKm) {
  if (!centerCoords) {
    return true;
  }

  const lat = parseNullableNumber(post.author?.locationLat);
  const lng = parseNullableNumber(post.author?.locationLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  return getDistanceKm(centerCoords.lat, centerCoords.lng, lat, lng) <= radiusKm;
}

export function buildFilterSuggestions(postsWithUiData) {
  const uniqueLocations = [...new Set(
    (postsWithUiData || [])
      .map((post) => (post.author?.location || '').trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, 'bg'));

  const uniqueAuthors = [...new Set(
    (postsWithUiData || [])
      .map((post) => {
        if (post.author?.username) {
          return `@${post.author.username}`;
        }

        return (post.author?.displayName || '').trim();
      })
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, 'bg'));

  return {
    locations: uniqueLocations,
    authors: uniqueAuthors
  };
}

function mapPostWithUiData(post, authorById, commentCountByPostId, likesSummaryByPostId) {
  const author = authorById.get(post.userId) || {
    id: post.userId,
    username: '',
    displayName: 'Aquashares User',
    avatarUrl: '',
    location: '',
    role: 'user'
  };

  const likesSummary = likesSummaryByPostId.get(post.id) || {
    likeCount: 0,
    likedByViewer: false
  };

  return {
    ...post,
    author,
    commentCount: commentCountByPostId.get(post.id) || 0,
    likeCount: likesSummary.likeCount,
    likedByViewer: likesSummary.likedByViewer
  };
}

async function buildAuthorMap(posts, viewer, supabase) {
  const userIds = [...new Set(posts.map((post) => post.userId).filter(Boolean))];
  const authorById = new Map();

  if (!userIds.length) {
    return authorById;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, location, location_lat, location_lng')
    .in('id', userIds);

  if (error) {
    throw new Error(error.message || 'Unable to load post authors.');
  }

  (profiles ?? []).forEach((profile) => {
    authorById.set(profile.id, {
      id: profile.id,
      username: profile.username || '',
      displayName: profile.display_name || profile.username || 'Aquashares User',
      avatarUrl: profile.avatar_url || '',
      location: (profile.location || '').replace(/\s+/g, ' ').trim(),
      locationLat: parseNullableNumber(profile.location_lat),
      locationLng: parseNullableNumber(profile.location_lng),
      role: 'user'
    });
  });

  if (viewer?.isAdmin && viewer?.userId && authorById.has(viewer.userId)) {
    const author = authorById.get(viewer.userId);
    authorById.set(viewer.userId, {
      ...author,
      role: 'admin'
    });
  }

  return authorById;
}

async function buildCommentCountMap(posts, supabase) {
  const postIds = [...new Set(posts.map((post) => post.id).filter(Boolean))];
  const counts = new Map();

  if (!postIds.length) {
    return counts;
  }

  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);

  if (error) {
    return counts;
  }

  (data ?? []).forEach((row) => {
    const current = counts.get(row.post_id) || 0;
    counts.set(row.post_id, current + 1);
  });

  return counts;
}

export async function getFeedData({
  feedState,
  forceRefresh = false,
  section = 'forum',
  supabase,
  getAllPosts,
  getCategories,
  getViewerState,
  getLikesSummaryByPostIds
}) {
  const normalizedSection = (section || 'forum').trim();

  if (!forceRefresh && feedState.cache.postsWithUiData && feedState.cache.viewer && feedState.cache.section === normalizedSection) {
    return {
      postsWithUiData: feedState.cache.postsWithUiData,
      viewer: feedState.cache.viewer,
      categories: feedState.cache.categories || []
    };
  }

  if (!forceRefresh && feedState.cache.refreshPromise && feedState.cache.refreshSection === normalizedSection) {
    return feedState.cache.refreshPromise;
  }

  const refreshPromise = (async () => {
    const [posts, viewer, categories] = await Promise.all([
      getAllPosts(50, normalizedSection),
      getViewerState(),
      getCategories(normalizedSection).catch(() => [])
    ]);

    const [authorMap, commentCountMap] = await Promise.all([
      buildAuthorMap(posts, viewer, supabase),
      buildCommentCountMap(posts, supabase)
    ]);

    const likesSummaryByPostId = await getLikesSummaryByPostIds(
      posts.map((post) => post.id),
      viewer.userId
    ).catch(() => new Map());

    const postsWithUiData = posts.map((post) => mapPostWithUiData(post, authorMap, commentCountMap, likesSummaryByPostId));

    feedState.cache.postsWithUiData = postsWithUiData;
    feedState.cache.viewer = viewer;
    feedState.cache.categories = categories;
    feedState.cache.section = normalizedSection;

    return {
      postsWithUiData,
      viewer,
      categories
    };
  })();

  feedState.cache.refreshPromise = refreshPromise;
  feedState.cache.refreshSection = normalizedSection;

  try {
    return await refreshPromise;
  } finally {
    feedState.cache.refreshPromise = null;
    feedState.cache.refreshSection = '';
  }
}