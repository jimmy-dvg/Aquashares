import { supabase } from '../services/supabase-client.js';
import { cleanupCommentsUi, initializeCommentsUi } from '../comments/comments-ui.js';
import { getLikesSummaryByPostIds, subscribeToPostLikes, togglePostLike } from '../reactions/reactions-service.js';
import { setLikeButtonState } from '../reactions/reactions-ui.js';
import { deletePost, getAllPosts, getCategories } from './posts-service.js';
import { showConfirmModal } from '../utils/confirm-modal.js';
import {
  bindCategoryFilter,
  bindFeedPopstate,
  clearError,
  getUiElements,
  setCategoryFilterOptions,
  setLoadingState,
  showError,
  updateFeedFilterUi
} from './posts-ui-controls.js';
import {
  createNotification,
  focusCommentFromQuery,
  focusPostFromHash,
  getCategoryFromQuery,
  getSearchFromQuery,
  renderEmptyState,
  renderPostCard,
  setCategoryInQuery,
  setSearchInQuery
} from './posts-ui-view.js';

const feedState = {
  loadDebounceTimer: null,
  searchDebounceTimer: null,
  cache: {
    postsWithUiData: null,
    viewer: null,
    categories: null,
    refreshPromise: null
  },
  toggleInFlightByPostId: new Set(),
  unsubscribeLikesRealtime: null
};

function cleanupLikesRealtime() {
  if (typeof feedState.unsubscribeLikesRealtime !== 'function') {
    return;
  }

  feedState.unsubscribeLikesRealtime();
  feedState.unsubscribeLikesRealtime = null;
}

function scheduleFeedLoad(options = {}) {
  if (feedState.loadDebounceTimer) {
    window.clearTimeout(feedState.loadDebounceTimer);
  }

  feedState.loadDebounceTimer = window.setTimeout(() => {
    feedState.loadDebounceTimer = null;
    loadFeed(options);
  }, 100);
}

function scheduleSearchLoad(nextQuery) {
  if (feedState.searchDebounceTimer) {
    window.clearTimeout(feedState.searchDebounceTimer);
  }

  feedState.searchDebounceTimer = window.setTimeout(() => {
    feedState.searchDebounceTimer = null;
    setSearchInQuery(nextQuery);
    scheduleFeedLoad();
  }, 220);
}

function normalizeText(value) {
  return (value || '').toLowerCase().trim();
}

function matchesFeedSearch(post, searchQuery) {
  if (!searchQuery) {
    return true;
  }

  const haystack = normalizeText([
    post.title,
    post.body,
    post.categoryName,
    post.author?.username,
    post.author?.displayName
  ].join(' '));

  return haystack.includes(searchQuery);
}


function mapPostWithUiData(post, authorById, commentCountByPostId, likesSummaryByPostId) {
  const author = authorById.get(post.userId) || {
    id: post.userId,
    username: '',
    displayName: 'Aquashares User',
    avatarUrl: '',
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

async function buildAuthorMap(posts, viewer) {
  const userIds = [...new Set(posts.map((post) => post.userId).filter(Boolean))];
  const authorById = new Map();

  if (!userIds.length) {
    return authorById;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
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

async function buildCommentCountMap(posts) {
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



async function getFeedData(forceRefresh = false) {
  if (!forceRefresh && feedState.cache.postsWithUiData && feedState.cache.viewer) {
    return {
      postsWithUiData: feedState.cache.postsWithUiData,
      viewer: feedState.cache.viewer,
      categories: feedState.cache.categories || []
    };
  }

  if (!forceRefresh && feedState.cache.refreshPromise) {
    return feedState.cache.refreshPromise;
  }

  const refreshPromise = (async () => {
    const [posts, viewer, categories] = await Promise.all([
      getAllPosts(),
      getViewerState(),
      getCategories().catch(() => [])
    ]);

    const [authorMap, commentCountMap] = await Promise.all([
      buildAuthorMap(posts, viewer),
      buildCommentCountMap(posts)
    ]);

    const likesSummaryByPostId = await getLikesSummaryByPostIds(
      posts.map((post) => post.id),
      viewer.userId
    ).catch(() => new Map());

    const postsWithUiData = posts.map((post) => mapPostWithUiData(post, authorMap, commentCountMap, likesSummaryByPostId));

    feedState.cache.postsWithUiData = postsWithUiData;
    feedState.cache.viewer = viewer;
    feedState.cache.categories = categories;

    return {
      postsWithUiData,
      viewer,
      categories
    };
  })();

  feedState.cache.refreshPromise = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    feedState.cache.refreshPromise = null;
  }
}

function updateCachedPostLikeState(postId, likeState) {
  const posts = feedState.cache.postsWithUiData;
  if (!posts?.length) {
    return;
  }

  const index = posts.findIndex((post) => post.id === postId);
  if (index < 0) {
    return;
  }

  posts[index] = {
    ...posts[index],
    likeCount: likeState.likeCount,
    likedByViewer: likeState.likedByViewer
  };
}

async function refreshPostLikeState(postId, viewerUserId) {
  const likesSummaryByPostId = await getLikesSummaryByPostIds([postId], viewerUserId).catch(() => new Map());
  const likesSummary = likesSummaryByPostId.get(postId) || {
    likeCount: 0,
    likedByViewer: false
  };

  return {
    postId,
    likeCount: likesSummary.likeCount,
    likedByViewer: likesSummary.likedByViewer
  };
}

function applyLikeStateToVisibleButtons(container, viewer, likeState) {
  if (!container) {
    return;
  }

  const buttons = container.querySelectorAll(`[data-action="toggle-like"][data-post-id="${likeState.postId}"]`);

  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const isPending = button.dataset.pending === 'true';

    setLikeButtonState(button, {
      ...likeState,
      isAuthenticated: Boolean(viewer?.userId),
      isPending
    });
  });
}

function bindLikesRealtime(container, viewer, posts) {
  cleanupLikesRealtime();

  const postIds = (posts || []).map((post) => post.id).filter(Boolean);
  if (!postIds.length) {
    return;
  }

  feedState.unsubscribeLikesRealtime = subscribeToPostLikes(postIds, async (postId) => {
    try {
      const nextState = await refreshPostLikeState(postId, viewer?.userId || null);
      updateCachedPostLikeState(postId, nextState);
      applyLikeStateToVisibleButtons(container, viewer, nextState);
    } catch {
    }
  });
}


async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.user?.id) {
    return {
      userId: null,
      isAdmin: false
    };
  }

  const viewer = {
    userId: session.user.id,
    isAdmin: false
  };

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (roleData?.role === 'admin') {
    viewer.isAdmin = true;
  }

  return viewer;
}

export function attachEditHandler(container) {
  if (!container || container.dataset.editBound === 'true') {
    return;
  }

  container.dataset.editBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const editButton = target.closest('[data-action="edit-post"]');
    if (!(editButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = editButton.dataset.postId;
    if (!postId) {
      return;
    }

    const confirmed = await showConfirmModal({
      title: 'Edit post',
      message: 'Open this post in edit mode?',
      confirmLabel: 'Edit',
      confirmButtonClass: 'btn-primary'
    });

    if (!confirmed) {
      return;
    }

    window.location.assign(`/post-create.html?id=${encodeURIComponent(postId)}`);
  });
}

export function attachDeleteHandler(container, afterDelete) {
  if (!container || container.dataset.deleteBound === 'true') {
    return;
  }

  container.dataset.deleteBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const deleteButton = target.closest('[data-action="delete-post"]');
    if (!(deleteButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = deleteButton.dataset.postId;
    if (!postId) {
      return;
    }

    const isConfirmed = await showConfirmModal({
      title: 'Delete post',
      message: 'Delete this post? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmButtonClass: 'btn-danger'
    });

    if (!isConfirmed) {
      return;
    }

    deleteButton.disabled = true;

    try {
      await deletePost(postId);
      await afterDelete();
    } catch (error) {
      const notificationRoot = document.querySelector('[data-feed-notifications]');
      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification(error.message || 'Unable to delete post.'));
      }
    } finally {
      deleteButton.disabled = false;
    }
  });
}

export function attachLikeHandler(container, viewer, notificationRoot) {
  if (!container || container.dataset.likeBound === 'true') {
    return;
  }

  container.dataset.likeBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const likeButton = target.closest('[data-action="toggle-like"]');
    if (!(likeButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = likeButton.dataset.postId;
    if (!postId || !viewer?.userId) {
      return;
    }

    if (feedState.toggleInFlightByPostId.has(postId)) {
      return;
    }

    const previousState = {
      postId,
      likeCount: Number(likeButton.dataset.likeCount || '0'),
      likedByViewer: likeButton.dataset.liked === 'true'
    };

    const optimisticState = {
      ...previousState,
      likedByViewer: !previousState.likedByViewer,
      likeCount: Math.max(0, previousState.likeCount + (previousState.likedByViewer ? -1 : 1))
    };

    feedState.toggleInFlightByPostId.add(postId);
    setLikeButtonState(likeButton, {
      ...optimisticState,
      isAuthenticated: true,
      isPending: true
    });

    try {
      const nextState = await togglePostLike(postId, viewer.userId);
      setLikeButtonState(likeButton, {
        ...nextState,
        isAuthenticated: true,
        isPending: false
      });
      updateCachedPostLikeState(postId, nextState);
    } catch (error) {
      setLikeButtonState(likeButton, {
        ...previousState,
        isAuthenticated: true,
        isPending: false
      });

      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification(error.message || 'Unable to update like.'));
      }
    } finally {
      feedState.toggleInFlightByPostId.delete(postId);
    }
  });
}

export async function loadFeed(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const {
    feedContainer,
    loadingElement,
    errorElement,
    notificationRoot,
    searchInput,
    categoryFilter,
    clearFilterButton,
    filterStatus
  } = getUiElements();

  if (!feedContainer) {
    return;
  }

  bindFeedPopstate(() => {
    scheduleFeedLoad();
  });

  setLoadingState(true, loadingElement);
  if (searchInput instanceof HTMLInputElement) {
    searchInput.disabled = true;
  }
  if (categoryFilter instanceof HTMLSelectElement) {
    categoryFilter.disabled = true;
  }
  if (clearFilterButton instanceof HTMLButtonElement) {
    clearFilterButton.disabled = true;
  }
  clearError(errorElement);
  if (notificationRoot) {
    notificationRoot.replaceChildren();
  }

  try {
    cleanupCommentsUi();
    cleanupLikesRealtime();

    const selectedCategorySlugFromQuery = getCategoryFromQuery();
    const searchFromQuery = getSearchFromQuery();
    const normalizedSearchQuery = normalizeText(searchFromQuery);

    if (searchInput instanceof HTMLInputElement && searchInput.value !== searchFromQuery) {
      searchInput.value = searchFromQuery;
    }

    const { postsWithUiData, viewer, categories } = await getFeedData(forceRefresh);

    if (searchInput instanceof HTMLInputElement && searchInput.dataset.bound !== 'true') {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => {
        scheduleSearchLoad(searchInput.value || '');
      });
    }

    if (categoryFilter) {
      setCategoryFilterOptions(categoryFilter, categories, selectedCategorySlugFromQuery);
      bindCategoryFilter(categoryFilter, clearFilterButton, (selectedSlug) => {
        setCategoryInQuery(selectedSlug);
        scheduleFeedLoad();
      });
    }

    if (clearFilterButton && clearFilterButton.dataset.bound !== 'true') {
      clearFilterButton.dataset.bound = 'true';
      clearFilterButton.addEventListener('click', () => {
        if (searchInput instanceof HTMLInputElement) {
          searchInput.value = '';
        }

        if (categoryFilter instanceof HTMLSelectElement) {
          categoryFilter.value = '';
        }

        setCategoryInQuery('');
        setSearchInQuery('');
        scheduleFeedLoad();
      });
    }

    const categorySlugs = new Set(categories.map((category) => category.slug));
    const selectedCategorySlug = categorySlugs.has(selectedCategorySlugFromQuery) ? selectedCategorySlugFromQuery : '';

    if (selectedCategorySlugFromQuery && !selectedCategorySlug) {
      setCategoryInQuery('');
    }

    const categoryFilteredPosts = selectedCategorySlug
      ? postsWithUiData.filter((post) => post.categorySlug === selectedCategorySlug)
      : postsWithUiData;
    const filteredPosts = categoryFilteredPosts.filter((post) => matchesFeedSearch(post, normalizedSearchQuery));

    updateFeedFilterUi(
      categoryFilter,
      searchInput,
      clearFilterButton,
      filterStatus,
      categories,
      filteredPosts.length,
      postsWithUiData.length
    );
    const canManagePost = (post) => Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);

    feedContainer.replaceChildren();

    if (!filteredPosts.length) {
      renderEmptyState(
        feedContainer,
        (selectedCategorySlug || normalizedSearchQuery)
          ? 'No posts match your current filters.'
          : 'Be the first to create a post.'
      );
    } else {
      const fragment = document.createDocumentFragment();
      filteredPosts.forEach((post) => {
        fragment.append(renderPostCard(post, canManagePost(post), Boolean(viewer.userId)));
      });

      feedContainer.append(fragment);
      await initializeCommentsUi(feedContainer, viewer.userId);
      bindLikesRealtime(feedContainer, viewer, filteredPosts);
      focusPostFromHash();
      focusCommentFromQuery();
    }

    attachEditHandler(feedContainer);
    attachDeleteHandler(feedContainer, () => loadFeed({ forceRefresh: true }));
    attachLikeHandler(feedContainer, viewer, notificationRoot);
  } catch (error) {
    showError(errorElement, error.message || 'Unable to load feed right now. Please try again.');
  } finally {
    if (searchInput instanceof HTMLInputElement) {
      searchInput.disabled = false;
    }
    if (categoryFilter instanceof HTMLSelectElement) {
      categoryFilter.disabled = false;
    }
    if (clearFilterButton instanceof HTMLButtonElement) {
      clearFilterButton.disabled = false;
    }
    setLoadingState(false, loadingElement);
  }
}
