import { supabase } from '../services/supabase-client.js';
import { cleanupCommentsUi, createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';
import { getLikesSummaryByPostIds, subscribeToPostLikes, togglePostLike } from '../reactions/reactions-service.js';
import { createLikeButton, setLikeButtonState } from '../reactions/reactions-ui.js';
import { deletePost, getAllPosts, getCategories, updatePost } from './posts-service.js';
import { showConfirmModal } from '../utils/confirm-modal.js';
import { renderGallery } from './post-detail-view.js';
import { getCategoryDisplayName, getScopedCategoryDisplayName } from '../utils/category-icons.js';
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

function validatePostEditInput(title, body, categoryId, categories) {
  if (!title || title.length < 3) {
    return 'Title must be at least 3 characters long.';
  }

  if (title.length > 120) {
    return 'Title must be 120 characters or less.';
  }

  if (!body || body.length < 10) {
    return 'Post content must be at least 10 characters long.';
  }

  if (body.length > 5000) {
    return 'Post content must be 5000 characters or less.';
  }

  if ((categories || []).length > 0 && !categoryId) {
    return 'Please select a category.';
  }

  return null;
}

function forceCloseModal(modalElement) {
  if (!(modalElement instanceof HTMLElement)) {
    return;
  }

  modalElement.classList.remove('show');
  modalElement.style.display = 'none';
  modalElement.setAttribute('aria-hidden', 'true');
  modalElement.removeAttribute('aria-modal');
  modalElement.removeAttribute('role');

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('padding-right');
}

async function renderQuickViewBody(container, post, viewer) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = 'row g-3';

  const mediaCol = document.createElement('div');
  mediaCol.className = 'col-12 col-lg-7';

  const mediaFrame = document.createElement('div');
  mediaFrame.className = 'ratio ratio-16x9 rounded overflow-hidden border aqua-post-detail-media';
  mediaFrame.dataset.postQuickCarousel = 'true';
  mediaCol.append(mediaFrame);

  const galleryThumbs = document.createElement('div');
  galleryThumbs.className = 'd-flex flex-wrap gap-2 mt-2';
  mediaCol.append(galleryThumbs);
  renderGallery(mediaFrame, galleryThumbs, post.photos || [], post.title);

  const detailsCol = document.createElement('div');
  detailsCol.className = 'col-12 col-lg-5 d-flex flex-column gap-2';

  const category = document.createElement('span');
  category.className = 'badge text-bg-secondary-subtle text-secondary-emphasis align-self-start';
  category.textContent = getCategoryDisplayName(post.categoryName, post.categorySlug);

  const title = document.createElement('h5');
  title.className = 'mb-0';
  title.textContent = post.title;

  const author = document.createElement('div');
  author.className = 'small text-secondary';
  const authorLocation = ` • 📍 ${(post.author?.location || '').trim() || 'Не е посочена'}`;
  author.textContent = `От ${post.author?.displayName || post.author?.username || 'Aquashares User'}${authorLocation} • ${formatPostTimestamp(post.createdAt)}`;

  const body = document.createElement('p');
  body.className = 'mb-0 text-secondary';
  body.textContent = post.body;

  const stats = document.createElement('div');
  stats.className = 'd-flex flex-wrap gap-2 pt-2';

  const likesBadge = document.createElement('span');
  likesBadge.className = 'badge rounded-pill text-bg-light border';
  likesBadge.textContent = `${post.likeCount || 0} likes`;

  const commentsBadge = document.createElement('span');
  commentsBadge.className = 'badge rounded-pill text-bg-light border';
  commentsBadge.textContent = `${post.commentCount || 0} comments`;

  stats.append(likesBadge, commentsBadge);
  detailsCol.append(category, title, author, body, stats);

  const reactionsBar = document.createElement('div');
  reactionsBar.className = 'd-flex align-items-center justify-content-between gap-2 border rounded-3 px-3 py-2';
  reactionsBar.dataset.postQuickLike = 'true';

  const likesSummary = document.createElement('div');
  likesSummary.className = 'small text-secondary';
  likesSummary.dataset.postQuickLikeCount = 'true';
  likesSummary.textContent = `${post.likeCount || 0} likes`;

  const likeButton = createLikeButton({
    postId: post.id,
    likeCount: post.likeCount || 0,
    likedByViewer: post.likedByViewer === true,
    isAuthenticated: Boolean(viewer?.userId)
  });

  let likePending = false;
  likeButton.addEventListener('click', async () => {
    if (!viewer?.userId || likePending) {
      return;
    }

    const previousState = {
      postId: post.id,
      likeCount: Number(likeButton.dataset.likeCount || '0'),
      likedByViewer: likeButton.dataset.liked === 'true'
    };

    const optimisticState = {
      ...previousState,
      likedByViewer: !previousState.likedByViewer,
      likeCount: Math.max(0, previousState.likeCount + (previousState.likedByViewer ? -1 : 1))
    };

    likePending = true;
    setLikeButtonState(likeButton, {
      ...optimisticState,
      isAuthenticated: true,
      isPending: true
    });
    likesSummary.textContent = `${optimisticState.likeCount} likes`;

    try {
      const nextState = await togglePostLike(post.id, viewer.userId);
      updateCachedPostLikeState(post.id, nextState);
      applyLikeStateToVisibleButtons(document.querySelector('[data-feed-list]'), viewer, nextState);
      applyLikeStateToQuickView(nextState, viewer);
    } catch (error) {
      setLikeButtonState(likeButton, {
        ...previousState,
        isAuthenticated: true,
        isPending: false
      });
      likesSummary.textContent = `${previousState.likeCount} likes`;

      const notificationRoot = document.querySelector('[data-feed-notifications]');
      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification(error.message || 'Unable to update like.'));
      }
    } finally {
      likePending = false;
    }
  });

  reactionsBar.append(likesSummary, likeButton);
  detailsCol.append(reactionsBar);

  wrapper.append(mediaCol, detailsCol);
  container.append(wrapper);

  const commentsSection = createCommentsBlock(post.id, Boolean(viewer?.userId));
  commentsSection.classList.add('aqua-post-modal-comments');
  container.append(commentsSection);

  await initializeCommentsUi(commentsSection, viewer?.userId || null);
}

function ensureModalState() {
  if (feedState.modalState) {
    return feedState.modalState;
  }

  const quickViewModal = document.createElement('div');
  quickViewModal.className = 'modal fade';
  quickViewModal.tabIndex = -1;
  quickViewModal.setAttribute('aria-hidden', 'true');
  quickViewModal.innerHTML = `
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content aqua-post-modal">
        <div class="modal-header">
          <h2 class="modal-title fs-5" data-post-quick-title>Post preview</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" data-post-quick-body></div>
        <div class="modal-footer">
          <a class="btn btn-outline-secondary" href="/index.html" data-post-open-detail>Open detail page</a>
          <button type="button" class="btn btn-primary d-none" data-post-open-edit>Edit post</button>
        </div>
      </div>
    </div>
  `;

  const editModal = document.createElement('div');
  editModal.className = 'modal fade';
  editModal.tabIndex = -1;
  editModal.setAttribute('aria-hidden', 'true');
  editModal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content aqua-post-modal">
        <div class="modal-header">
          <h2 class="modal-title fs-5">Edit post</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <form data-post-edit-form>
          <div class="modal-body d-flex flex-column gap-3">
            <div class="alert alert-danger d-none mb-0" role="alert" data-post-edit-error></div>
            <div>
              <label class="form-label" for="post-edit-title">Title</label>
              <input id="post-edit-title" type="text" class="form-control" maxlength="120" required data-post-edit-title />
            </div>
            <div>
              <label class="form-label" for="post-edit-category">Category</label>
              <select id="post-edit-category" class="form-select" data-post-edit-category></select>
            </div>
            <div>
              <label class="form-label" for="post-edit-body">Content</label>
              <textarea id="post-edit-body" class="form-control" rows="6" maxlength="5000" required data-post-edit-body></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary" data-post-edit-submit>Save changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.append(quickViewModal, editModal);

  const modalApi = globalThis.bootstrap?.Modal;
  const quickModalApi = modalApi ? modalApi.getOrCreateInstance(quickViewModal) : null;
  const editModalApi = modalApi ? modalApi.getOrCreateInstance(editModal) : null;

  const modalState = {
    quickViewModal,
    editModal,
    quickModalApi,
    editModalApi,
    quickTitle: quickViewModal.querySelector('[data-post-quick-title]'),
    quickBody: quickViewModal.querySelector('[data-post-quick-body]'),
    quickDetailLink: quickViewModal.querySelector('[data-post-open-detail]'),
    quickEditButton: quickViewModal.querySelector('[data-post-open-edit]'),
    editForm: editModal.querySelector('[data-post-edit-form]'),
    editError: editModal.querySelector('[data-post-edit-error]'),
    editTitle: editModal.querySelector('[data-post-edit-title]'),
    editCategory: editModal.querySelector('[data-post-edit-category]'),
    editBody: editModal.querySelector('[data-post-edit-body]'),
    editSubmit: editModal.querySelector('[data-post-edit-submit]'),
    currentPostId: null,
    saveInProgress: false
  };

  modalState.quickEditButton?.addEventListener('click', () => {
    const post = getPostFromCache(modalState.currentPostId);
    if (!post) {
      return;
    }

    openEditModal(post);
  });

  modalState.editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (modalState.saveInProgress) {
      return;
    }

    const postId = modalState.currentPostId;
    const sourcePost = getPostFromCache(postId);
    if (!postId || !sourcePost) {
      return;
    }

    const title = modalState.editTitle instanceof HTMLInputElement ? modalState.editTitle.value.trim() : '';
    const body = modalState.editBody instanceof HTMLTextAreaElement ? modalState.editBody.value.trim() : '';
    const categoryId = modalState.editCategory instanceof HTMLSelectElement ? modalState.editCategory.value || null : null;
    const validationError = validatePostEditInput(title, body, categoryId, feedState.cache.categories || []);

    if (validationError) {
      if (modalState.editError) {
        modalState.editError.textContent = validationError;
        modalState.editError.classList.remove('d-none');
      }
      return;
    }

    if (modalState.editError) {
      modalState.editError.textContent = '';
      modalState.editError.classList.add('d-none');
    }

    modalState.saveInProgress = true;
    if (modalState.editSubmit instanceof HTMLButtonElement) {
      modalState.editSubmit.disabled = true;
      modalState.editSubmit.textContent = 'Saving...';
    }

    try {
      const updated = await updatePost(postId, {
        title,
        body,
        categoryId,
        section: sourcePost.categorySection || 'forum'
      });
      const previousPosts = feedState.cache.postsWithUiData || [];
      feedState.cache.postsWithUiData = previousPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          ...updated
        };
      });

      modalState.editModalApi?.hide();
      window.setTimeout(() => {
        forceCloseModal(modalState.editModal);
        forceCloseModal(modalState.quickViewModal);
      }, 220);

      const notificationRoot = document.querySelector('[data-feed-notifications]');
      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification('Post updated successfully.', 'success'));
      }

      scheduleFeedLoad({ forceRefresh: true });
    } catch (error) {
      if (modalState.editError) {
        modalState.editError.textContent = error.message || 'Unable to save post changes.';
        modalState.editError.classList.remove('d-none');
      }
    } finally {
      modalState.saveInProgress = false;

      if (modalState.editSubmit instanceof HTMLButtonElement) {
        modalState.editSubmit.disabled = false;
        modalState.editSubmit.textContent = 'Save changes';
      }
    }
  });

  feedState.modalState = modalState;
  return modalState;
}

async function openQuickViewModal(post) {
  const modalState = ensureModalState();
  const viewer = feedState.cache.viewer;

  modalState.currentPostId = post.id;
  if (modalState.quickTitle) {
    modalState.quickTitle.textContent = post.title;
  }

  if (modalState.quickDetailLink instanceof HTMLAnchorElement) {
    modalState.quickDetailLink.href = `/post-detail.html?id=${encodeURIComponent(post.id)}`;
  }

  const canManage = getPostManageState(post);
  modalState.quickEditButton?.classList.toggle('d-none', !canManage);

  await renderQuickViewBody(modalState.quickBody, post, viewer);
  modalState.quickModalApi?.show();
}

function openEditModal(post) {
  const modalState = ensureModalState();
  modalState.currentPostId = post.id;

  if (modalState.quickModalApi) {
    modalState.quickModalApi.hide();
  }
  forceCloseModal(modalState.quickViewModal);

  if (modalState.editError) {
    modalState.editError.textContent = '';
    modalState.editError.classList.add('d-none');
  }

  if (modalState.editTitle instanceof HTMLInputElement) {
    modalState.editTitle.value = post.title || '';
  }

  if (modalState.editBody instanceof HTMLTextAreaElement) {
    modalState.editBody.value = post.body || '';
  }

  if (modalState.editCategory instanceof HTMLSelectElement) {
    const categories = feedState.cache.categories || [];
    modalState.editCategory.replaceChildren();

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = categories.length ? 'Select category' : 'Uncategorized';
    modalState.editCategory.append(placeholder);

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = getScopedCategoryDisplayName(category.name, category.slug, category.section);
      modalState.editCategory.append(option);
    });

    modalState.editCategory.value = post.categoryId || '';
  }

  modalState.editModalApi?.show();
}

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

function normalizeText(value) {
  return (value || '').toLowerCase().trim();
}

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

async function getViewerCoordinates() {
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

async function reverseGeocodeLocationName(lat, lng) {
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

function normalizeSortOption(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'oldest' || normalized === 'most_liked' || normalized === 'most_commented' || normalized === 'newest') {
    return normalized;
  }

  return 'newest';
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
    post.author?.displayName,
    post.author?.location
  ].join(' '));

  return haystack.includes(searchQuery);
}

function matchesFeedLocation(post, locationQuery) {
  if (!locationQuery) {
    return true;
  }

  return normalizeText(post.author?.location || '').includes(locationQuery);
}

function matchesFeedAuthor(post, authorQuery) {
  if (!authorQuery) {
    return true;
  }

  const authorHaystack = normalizeText([
    post.author?.username,
    post.author?.displayName
  ].join(' '));

  return authorHaystack.includes(authorQuery);
}

function normalizePhotoFilter(value) {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'with' || normalized === 'without' ? normalized : '';
}

function matchesFeedPhoto(post, photoFilter) {
  if (!photoFilter) {
    return true;
  }

  const hasPhotos = Array.isArray(post.photos) && post.photos.length > 0;
  return photoFilter === 'with' ? hasPhotos : !hasPhotos;
}

function sortPosts(posts, sortOption = 'newest') {
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

function matchesNearby(post, centerCoords, radiusKm) {
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

function buildFilterSuggestions(postsWithUiData) {
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

async function buildAuthorMap(posts, viewer) {
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



async function getFeedData(forceRefresh = false, section = '') {
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

function applyLikeStateToQuickView(likeState, viewer) {
  const modalState = feedState.modalState;
  if (!modalState || modalState.currentPostId !== likeState.postId) {
    return;
  }

  const likeButton = modalState.quickBody?.querySelector('[data-post-quick-like] [data-action="toggle-like"]');
  if (!(likeButton instanceof HTMLButtonElement)) {
    return;
  }

  const isPending = likeButton.dataset.pending === 'true';
  setLikeButtonState(likeButton, {
    ...likeState,
    isAuthenticated: Boolean(viewer?.userId),
    isPending
  });

  const summary = modalState.quickBody?.querySelector('[data-post-quick-like-count]');
  if (summary instanceof HTMLElement) {
    summary.textContent = `${likeState.likeCount} likes`;
  }
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
      applyLikeStateToQuickView(nextState, viewer);
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
      isAdmin: false,
      shareNetworks: []
    };
  }

  const viewer = {
    userId: session.user.id,
    isAdmin: false,
    shareNetworks: []
  };

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
      .select('facebook_url, x_url, linkedin_url, reddit_url, telegram_url')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!error && socialProfile) {
      viewer.shareNetworks = getConnectedShareNetworks({
        facebookUrl: socialProfile.facebook_url || '',
        xUrl: socialProfile.x_url || '',
        linkedinUrl: socialProfile.linkedin_url || '',
        redditUrl: socialProfile.reddit_url || '',
        telegramUrl: socialProfile.telegram_url || ''
      });
    }
  } catch {
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

    const post = getPostFromCache(postId);
    if (!post || !getPostManageState(post)) {
      return;
    }

    openEditModal(post);
  });
}

export function attachQuickViewHandler(container) {
  if (!container || container.dataset.quickViewBound === 'true') {
    return;
  }

  container.dataset.quickViewBound = 'true';

  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const quickViewTrigger = target.closest('[data-action="open-post-quick-view"]');
    if (!(quickViewTrigger instanceof HTMLElement)) {
      return;
    }

    if (target.closest('[data-action="toggle-like"], [data-action="delete-post"], [data-action="edit-post"], [data-comments-list], .dropdown-menu, .dropdown-toggle, a:not([data-action="open-post-quick-view"]), button:not([data-action="open-post-quick-view"]), input, textarea, select, label')) {
      return;
    }

    if (quickViewTrigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    const postId = quickViewTrigger.dataset.postId || quickViewTrigger.closest('[data-post-id]')?.dataset.postId;
    if (!postId) {
      return;
    }

    const post = getPostFromCache(postId);
    if (!post) {
      return;
    }

    void openQuickViewModal(post);
  });

  if (feedState.quickViewKeyBound) {
    return;
  }

  feedState.quickViewKeyBound = true;
  container.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action !== 'open-post-quick-view') {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    const postId = target.dataset.postId;
    if (!postId) {
      return;
    }

    const post = getPostFromCache(postId);
    if (!post) {
      return;
    }

    void openQuickViewModal(post);
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
    photoFilter,
    locationFilter,
    useMyLocationButton,
    authorFilter,
    sortFilter,
    nearbyToggle,
    radiusFilter,
    locationList,
    authorList,
    clearFilterButton,
    filterStatus
  } = getUiElements();

  if (!feedContainer) {
    return;
  }

  bindFeedPopstate(() => {
    if (!isFeedPagePath()) {
      return;
    }

    scheduleFeedLoad();
  });

  setLoadingState(true, loadingElement);
  if (searchInput instanceof HTMLInputElement) {
    searchInput.disabled = true;
  }
  if (categoryFilter instanceof HTMLSelectElement) {
    categoryFilter.disabled = true;
  }
  if (photoFilter instanceof HTMLSelectElement) {
    photoFilter.disabled = true;
  }
  if (locationFilter instanceof HTMLInputElement) {
    locationFilter.disabled = true;
  }
  if (useMyLocationButton instanceof HTMLButtonElement) {
    useMyLocationButton.disabled = true;
  }
  if (authorFilter instanceof HTMLInputElement) {
    authorFilter.disabled = true;
  }
  if (sortFilter instanceof HTMLSelectElement) {
    sortFilter.disabled = true;
  }
  if (nearbyToggle instanceof HTMLInputElement) {
    nearbyToggle.disabled = true;
  }
  if (radiusFilter instanceof HTMLSelectElement) {
    radiusFilter.disabled = true;
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
    const sectionHost = feedContainer.closest('[data-feed-section]');
    const feedSection = ((sectionHost instanceof HTMLElement ? sectionHost.dataset.feedSection : '') || 'forum').trim();
    const searchFromQuery = getSearchFromQuery();
    const photoFromQuery = normalizePhotoFilter(getPhotoFromQuery());
    const locationFromQuery = getLocationFromQuery();
    const authorFromQuery = getAuthorFromQuery();
    const sortFromQuery = normalizeSortOption(getSortFromQuery());
    const nearMeFromQuery = getNearMeFromQuery();
    const radiusKmFromQuery = getRadiusKmFromQuery(25);
    const normalizedSearchQuery = normalizeText(searchFromQuery);
    const normalizedLocationQuery = normalizeText(locationFromQuery);
    const normalizedAuthorQuery = normalizeText(authorFromQuery);

    if (searchInput instanceof HTMLInputElement && searchInput.value !== searchFromQuery) {
      searchInput.value = searchFromQuery;
    }
    if (locationFilter instanceof HTMLInputElement && locationFilter.value !== locationFromQuery) {
      locationFilter.value = locationFromQuery;
    }
    if (photoFilter instanceof HTMLSelectElement && photoFilter.value !== photoFromQuery) {
      photoFilter.value = photoFromQuery;
    }
    if (authorFilter instanceof HTMLInputElement && authorFilter.value !== authorFromQuery) {
      authorFilter.value = authorFromQuery;
    }
    if (sortFilter instanceof HTMLSelectElement && sortFilter.value !== sortFromQuery) {
      sortFilter.value = sortFromQuery;
    }
    if (nearbyToggle instanceof HTMLInputElement && nearbyToggle.checked !== nearMeFromQuery) {
      nearbyToggle.checked = nearMeFromQuery;
    }
    if (radiusFilter instanceof HTMLSelectElement && radiusFilter.value !== String(radiusKmFromQuery)) {
      radiusFilter.value = String(radiusKmFromQuery);
    }

    const { postsWithUiData, viewer, categories } = await getFeedData(forceRefresh, feedSection);

    if (searchInput instanceof HTMLInputElement && searchInput.dataset.bound !== 'true') {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (locationFilter instanceof HTMLInputElement && locationFilter.dataset.bound !== 'true') {
      locationFilter.dataset.bound = 'true';
      locationFilter.addEventListener('input', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (useMyLocationButton instanceof HTMLButtonElement && useMyLocationButton.dataset.bound !== 'true') {
      useMyLocationButton.dataset.bound = 'true';
      useMyLocationButton.addEventListener('click', async () => {
        useMyLocationButton.disabled = true;

        const icon = useMyLocationButton.querySelector('i');
        const previousIconClass = icon?.className || '';

        if (icon instanceof HTMLElement) {
          icon.className = 'bi bi-hourglass-split';
        }

        try {
          const coords = await getViewerCoordinates();
          if (!coords) {
            if (notificationRoot) {
              notificationRoot.replaceChildren(createNotification('Нужен е достъп до локация, за да използваш тази функция.', 'warning'));
            }
            return;
          }

          const locationName = await reverseGeocodeLocationName(coords.lat, coords.lng);
          if (!locationName) {
            if (notificationRoot) {
              notificationRoot.replaceChildren(createNotification('Не успяхме да определим населено място от текущата позиция.', 'warning'));
            }
            return;
          }

          if (locationFilter instanceof HTMLInputElement) {
            locationFilter.value = locationName;
          }

          scheduleFiltersLoadFromInputs({
            searchInput,
            categoryFilter,
            locationFilter,
            authorFilter,
            sortFilter,
            nearbyToggle,
            radiusFilter
          });
        } catch (error) {
          if (notificationRoot) {
            notificationRoot.replaceChildren(createNotification(error.message || 'Неуспешно определяне на локация.', 'warning'));
          }
        } finally {
          useMyLocationButton.disabled = false;
          if (icon instanceof HTMLElement) {
            icon.className = previousIconClass || 'bi bi-crosshair';
          }
        }
      });
    }

    if (authorFilter instanceof HTMLInputElement && authorFilter.dataset.bound !== 'true') {
      authorFilter.dataset.bound = 'true';
      authorFilter.addEventListener('input', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (sortFilter instanceof HTMLSelectElement && sortFilter.dataset.bound !== 'true') {
      sortFilter.dataset.bound = 'true';
      sortFilter.addEventListener('change', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (nearbyToggle instanceof HTMLInputElement && nearbyToggle.dataset.bound !== 'true') {
      nearbyToggle.dataset.bound = 'true';
      nearbyToggle.addEventListener('change', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (radiusFilter instanceof HTMLSelectElement && radiusFilter.dataset.bound !== 'true') {
      radiusFilter.dataset.bound = 'true';
      radiusFilter.addEventListener('change', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    if (categoryFilter) {
      setCategoryFilterOptions(categoryFilter, categories, selectedCategorySlugFromQuery, feedSection);
      bindCategoryFilter(categoryFilter, clearFilterButton, (selectedSlug) => {
        setFeedFiltersInQuery({
          category: selectedSlug,
          photo: photoFilter instanceof HTMLSelectElement ? photoFilter.value : '',
          query: searchInput instanceof HTMLInputElement ? searchInput.value : '',
          location: locationFilter instanceof HTMLInputElement ? locationFilter.value : '',
          author: authorFilter instanceof HTMLInputElement ? authorFilter.value : '',
          sort: sortFilter instanceof HTMLSelectElement ? sortFilter.value : 'newest',
          nearMe: nearbyToggle instanceof HTMLInputElement ? nearbyToggle.checked : false,
          radiusKm: radiusFilter instanceof HTMLSelectElement ? radiusFilter.value : '25'
        });
        scheduleFeedLoad();
      });
    }

    if (photoFilter instanceof HTMLSelectElement && photoFilter.dataset.bound !== 'true') {
      photoFilter.dataset.bound = 'true';
      photoFilter.addEventListener('change', () => {
        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          photoFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      });
    }

    const filterSuggestions = buildFilterSuggestions(postsWithUiData);
    setDatalistOptions(locationList, filterSuggestions.locations);
    setDatalistOptions(authorList, filterSuggestions.authors);

    if (clearFilterButton && clearFilterButton.dataset.bound !== 'true') {
      clearFilterButton.dataset.bound = 'true';
      clearFilterButton.addEventListener('click', () => {
        if (searchInput instanceof HTMLInputElement) {
          searchInput.value = '';
        }

        if (categoryFilter instanceof HTMLSelectElement) {
          categoryFilter.value = '';
        }
        if (photoFilter instanceof HTMLSelectElement) {
          photoFilter.value = '';
        }
        if (locationFilter instanceof HTMLInputElement) {
          locationFilter.value = '';
        }
        if (authorFilter instanceof HTMLInputElement) {
          authorFilter.value = '';
        }
        if (sortFilter instanceof HTMLSelectElement) {
          sortFilter.value = 'newest';
        }
        if (nearbyToggle instanceof HTMLInputElement) {
          nearbyToggle.checked = false;
        }
        if (radiusFilter instanceof HTMLSelectElement) {
          radiusFilter.value = '25';
        }

        setFeedFiltersInQuery({
          category: '',
          photo: '',
          query: '',
          location: '',
          author: '',
          sort: 'newest',
          nearMe: false,
          radiusKm: '25'
        });
        scheduleFeedLoad();
      });
    }

    const categorySlugs = new Set(categories.map((category) => category.slug));
    const categoryFromQuery = categorySlugs.has(selectedCategorySlugFromQuery) ? selectedCategorySlugFromQuery : '';
    const effectiveCategorySlug = categoryFromQuery;
    const effectivePhotoFilter = photoFromQuery;
    const effectiveSort = sortFromQuery;

    if (selectedCategorySlugFromQuery && !categoryFromQuery) {
      setFeedFiltersInQuery({ category: '' });
    }

    const viewerCoords = nearMeFromQuery ? await getViewerCoordinates() : null;
    const nearMeUnavailable = nearMeFromQuery && !viewerCoords;

    if (nearMeUnavailable && notificationRoot) {
      notificationRoot.replaceChildren(createNotification('Филтърът „Близо до мен“ изисква разрешение за геолокация в браузъра.', 'warning'));
    }

    const filteredPosts = sortPosts(postsWithUiData
      .filter((post) => (post.section || post.categorySection || 'forum') === feedSection)
      .filter((post) => (!effectiveCategorySlug || post.categorySlug === effectiveCategorySlug))
      .filter((post) => matchesFeedPhoto(post, effectivePhotoFilter))
      .filter((post) => matchesFeedSearch(post, normalizedSearchQuery))
      .filter((post) => matchesFeedLocation(post, normalizedLocationQuery))
      .filter((post) => matchesFeedAuthor(post, normalizedAuthorQuery))
      .filter((post) => (!nearMeFromQuery || matchesNearby(post, viewerCoords, radiusKmFromQuery))), effectiveSort);

    const selectedCategorySlugForUi = categoryFromQuery;

    updateFeedFilterUi(
      {
        selectedSlug: selectedCategorySlugForUi,
        photo: effectivePhotoFilter,
        query: searchFromQuery,
        location: locationFromQuery,
        author: authorFromQuery,
        sort: effectiveSort,
        nearMe: nearMeFromQuery,
        radiusKm: radiusKmFromQuery,
        nearMeUnavailable
      },
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
        (effectiveCategorySlug || normalizedSearchQuery)
          || effectivePhotoFilter
          || normalizedLocationQuery
          || normalizedAuthorQuery
          || (effectiveSort && effectiveSort !== 'newest')
          || nearMeFromQuery
          ? 'Няма публикации по зададените филтри.'
          : 'Бъди първият с нова публикация.'
      );
    } else {
      const fragment = document.createDocumentFragment();
      filteredPosts.forEach((post) => {
        fragment.append(renderPostCard(post, canManagePost(post), Boolean(viewer.userId), viewer.shareNetworks || []));
      });

      feedContainer.append(fragment);
      await initializeCommentsUi(feedContainer, viewer.userId);
      bindLikesRealtime(feedContainer, viewer, filteredPosts);
      focusPostFromHash();
      focusCommentFromQuery();
    }

    attachEditHandler(feedContainer);
    attachQuickViewHandler(feedContainer);
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
    if (photoFilter instanceof HTMLSelectElement) {
      photoFilter.disabled = false;
    }
    if (locationFilter instanceof HTMLInputElement) {
      locationFilter.disabled = false;
    }
    if (useMyLocationButton instanceof HTMLButtonElement) {
      useMyLocationButton.disabled = false;
    }
    if (authorFilter instanceof HTMLInputElement) {
      authorFilter.disabled = false;
    }
    if (sortFilter instanceof HTMLSelectElement) {
      sortFilter.disabled = false;
    }
    if (nearbyToggle instanceof HTMLInputElement) {
      nearbyToggle.disabled = false;
    }
    if (radiusFilter instanceof HTMLSelectElement) {
      radiusFilter.disabled = false;
    }
    if (clearFilterButton instanceof HTMLButtonElement) {
      clearFilterButton.disabled = false;
    }
    setLoadingState(false, loadingElement);
  }
}
