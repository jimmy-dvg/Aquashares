import { supabase } from '../services/supabase-client.js';
import { cleanupCommentsUi, initializeCommentsUi } from '../comments/comments-ui.js';
import { getLikesSummaryByPostIds, subscribeToPostLikes, togglePostLike } from '../reactions/reactions-service.js';
import { createLikeButton, setLikeButtonState } from '../reactions/reactions-ui.js';
import {
  deletePost,
  getAllPosts,
  getCategories,
  updatePost
} from './posts-service.js';
import { showConfirmModal } from '../utils/confirm-modal.js';
import { renderGallery } from './post-detail-view.js';
import { getCategoryDisplayName, getScopedCategoryDisplayName } from '../utils/category-icons.js';
import { getConnectedSocialProviderKeysFromUser } from '../auth/social-auth.js';
import {
  bindCategoryFilter,
  bindFeedPopstate,
  clearError,
  getUiElements,
  setCategoryFilterOptions,
  setDatalistOptions,
  setLoadingState,
  showError,
  updateFeedFilterUi
} from './posts-ui-controls.js';
import {
  getAuthorFromQuery,
  getPhotoFromQuery,
  createNotification,
  getSortFromQuery,
  focusCommentFromQuery,
  focusPostFromHash,
  getCategoryFromQuery,
  getLocationFromQuery,
  getNearMeFromQuery,
  getRadiusKmFromQuery,
  getSearchFromQuery,
  renderEmptyState,
  renderPostCard,
  setFeedFiltersInQuery
} from './posts-ui-view.js';
import { getConnectedShareNetworks } from '../utils/social-share.js';
import {
  buildFilterSuggestions,
  getFeedData,
  getViewerCoordinates,
  matchesFeedAuthor,
  matchesFeedLocation,
  matchesFeedPhoto,
  matchesFeedSearch,
  matchesNearby,
  normalizePhotoFilter,
  normalizeSortOption,
  normalizeText,
  reverseGeocodeLocationName,
  sortPosts
} from './posts-ui-filter-data.js';
import {
  applyLikeStateToQuickView,
  applyLikeStateToVisibleButtons,
  attachDeleteHandler as attachDeleteHandlerModule,
  attachEditHandler as attachEditHandlerModule,
  attachLikeHandler as attachLikeHandlerModule,
  attachQuickViewHandler as attachQuickViewHandlerModule,
  bindLikesRealtime as bindLikesRealtimeModule,
  updateCachedPostLikeState
} from './posts-ui-likes-handlers.js';
import {
  forceCloseModal,
  getFilesFromInputs,
  getSelectedPhotosForRemoval,
  removePhoto,
  renderExistingModalImages,
  rollbackPhoto,
  uploadAndCreatePhoto,
  validatePostEditInput
} from './posts-ui-edit-utils.js';
import { initializeStickyFilterDock } from './posts-ui-sticky-dock.js';
import { createPostsModalController } from './posts-ui-modal.js';
import { loadFeedController } from './posts-ui-load-feed.js';
import { bindFeedFilterControls } from './posts-ui-load-feed-bindings.js';

const feedState = {
  loadDebounceTimer: null,
  searchDebounceTimer: null,
  cache: {
    postsWithUiData: null,
    viewer: null,
    categories: null,
    refreshPromise: null,
    section: '',
    refreshSection: ''
  },
  toggleInFlightByPostId: new Set(),
  unsubscribeLikesRealtime: null,
  quickViewBound: false,
  quickViewKeyBound: false,
  modalState: null,
  filterDock: null,
  geolocation: {
    coords: null,
    resolvedAt: 0,
    inFlight: null
  }
};

function getFeedPath(pathname = window.location.pathname) {
  if (pathname === '/') {
    return '/index.html';
  }

  return pathname;
}

function isFeedPagePath(pathname = window.location.pathname) {
  const normalized = getFeedPath(pathname);
  return normalized === '/index.html' || normalized === '/giveaway.html' || normalized === '/exchange.html' || normalized === '/wanted.html';
}

function formatPostTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('bg', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getPostFromCache(postId) {
  return (feedState.cache.postsWithUiData || []).find((post) => post.id === postId) || null;
}

function getPostManageState(post) {
  const viewer = feedState.cache.viewer;
  if (!post || !viewer?.userId) {
    return false;
  }

  return viewer.isAdmin || viewer.userId === post.userId;
}

const { openQuickViewModal, openEditModal } = createPostsModalController({
  feedState,
  createLikeButton,
  setLikeButtonState,
  togglePostLike,
  createNotification,
  renderGallery,
  getCategoryDisplayName,
  formatPostTimestamp,
  getPostFromCache,
  getPostManageState,
  updateCachedPostLikeState,
  applyLikeStateToVisibleButtons,
  applyLikeStateToQuickView,
  updatePost,
  getScopedCategoryDisplayName,
  validatePostEditInput,
  getFilesFromInputs,
  getSelectedPhotosForRemoval,
  uploadAndCreatePhoto,
  rollbackPhoto,
  removePhoto,
  renderExistingModalImages,
  forceCloseModal,
  scheduleFeedLoad
});

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

function scheduleFiltersLoadFromInputs(elements) {
  if (feedState.searchDebounceTimer) {
    window.clearTimeout(feedState.searchDebounceTimer);
  }

  feedState.searchDebounceTimer = window.setTimeout(() => {
    feedState.searchDebounceTimer = null;

    const photoFilterElement = elements.photoFilter instanceof HTMLSelectElement
      ? elements.photoFilter
      : document.querySelector('[data-feed-photo-filter]');

    setFeedFiltersInQuery({
      query: elements.searchInput instanceof HTMLInputElement ? elements.searchInput.value : '',
      category: elements.categoryFilter instanceof HTMLSelectElement ? elements.categoryFilter.value : '',
      photo: photoFilterElement instanceof HTMLSelectElement ? photoFilterElement.value : '',
      location: elements.locationFilter instanceof HTMLInputElement ? elements.locationFilter.value : '',
      author: elements.authorFilter instanceof HTMLInputElement ? elements.authorFilter.value : '',
      sort: elements.sortFilter instanceof HTMLSelectElement ? elements.sortFilter.value : 'newest',
      nearMe: elements.nearbyToggle instanceof HTMLInputElement ? elements.nearbyToggle.checked : false,
      radiusKm: elements.radiusFilter instanceof HTMLSelectElement ? elements.radiusFilter.value : '25'
    });
    scheduleFeedLoad();
  }, 220);
}

async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.user?.id) {
    return {
      userId: null,
      isAdmin: false,
      shareNetworks: []
    };
  }

  const viewer = {
    userId: session.user.id,
    isAdmin: false,
    shareNetworks: []
  };

  const connectedProviderKeys = getConnectedSocialProviderKeysFromUser(session.user);

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (roleData?.role === 'admin') {
    viewer.isAdmin = true;
  }

  try {
    const { data: socialProfile, error } = await supabase
      .from('profiles')
      .select('facebook_url, x_url, linkedin_url')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!error && socialProfile) {
      viewer.shareNetworks = getConnectedShareNetworks({
        facebookUrl: socialProfile.facebook_url || '',
        xUrl: socialProfile.x_url || '',
        linkedinUrl: socialProfile.linkedin_url || ''
      }, connectedProviderKeys);
      return viewer;
    }
  } catch {
  }

  if (connectedProviderKeys.length) {
    viewer.shareNetworks = getConnectedShareNetworks({}, connectedProviderKeys);
  }

  return viewer;
}

export function attachEditHandler(container) {
  attachEditHandlerModule({
    container,
    getPostFromCache,
    getPostManageState,
    openEditModal
  });
}

export function attachQuickViewHandler(container) {
  attachQuickViewHandlerModule({
    container,
    feedState,
    getPostFromCache,
    openQuickViewModal
  });
}

export function attachDeleteHandler(container, afterDelete) {
  attachDeleteHandlerModule({
    container,
    showConfirmModal,
    deletePost,
    createNotification,
    afterDelete
  });
}

export function attachLikeHandler(container, viewer, notificationRoot) {
  attachLikeHandlerModule({
    feedState,
    container,
    viewer,
    notificationRoot,
    togglePostLike,
    setLikeButtonState,
    createNotification
  });
}

export async function loadFeed(options = {}) {
  await loadFeedController(options, {
    feedState,
    getUiElements,
    initializeStickyFilterDock,
    bindFeedPopstate,
    isFeedPagePath,
    scheduleFeedLoad,
    setLoadingState,
    clearError,
    cleanupCommentsUi,
    cleanupLikesRealtime,
    getCategoryFromQuery,
    getSearchFromQuery,
    getPhotoFromQuery,
    getLocationFromQuery,
    getAuthorFromQuery,
    getSortFromQuery,
    getNearMeFromQuery,
    getRadiusKmFromQuery,
    normalizePhotoFilter,
    normalizeSortOption,
    normalizeText,
    getFeedData,
    supabase,
    getAllPosts,
    getCategories,
    getViewerState,
    getLikesSummaryByPostIds,
    scheduleFiltersLoadFromInputs,
    createNotification,
    getViewerCoordinates,
    reverseGeocodeLocationName,
    bindFeedFilterControls,
    setCategoryFilterOptions,
    bindCategoryFilter,
    setFeedFiltersInQuery,
    buildFilterSuggestions,
    setDatalistOptions,
    updateFeedFilterUi,
    sortPosts,
    matchesFeedPhoto,
    matchesFeedSearch,
    matchesFeedLocation,
    matchesFeedAuthor,
    matchesNearby,
    renderEmptyState,
    renderPostCard,
    initializeCommentsUi,
    bindLikesRealtimeModule,
    subscribeToPostLikes,
    setLikeButtonState,
    focusPostFromHash,
    focusCommentFromQuery,
    attachEditHandler,
    attachQuickViewHandler,
    attachDeleteHandler,
    attachLikeHandler,
    showError,
    loadFeed
  });
}

