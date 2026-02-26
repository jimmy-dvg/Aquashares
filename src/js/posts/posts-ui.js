import { supabase } from '../services/supabase-client.js';
import { cleanupCommentsUi, createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';
import { deletePost, getAllPosts, getCategories } from './posts-service.js';

const feedState = {
  categoriesBound: false,
  popstateBound: false,
  loadDebounceTimer: null,
  cache: {
    postsWithUiData: null,
    viewer: null,
    categories: null,
    refreshPromise: null
  }
};

function scheduleFeedLoad(options = {}) {
  if (feedState.loadDebounceTimer) {
    window.clearTimeout(feedState.loadDebounceTimer);
  }

  feedState.loadDebounceTimer = window.setTimeout(() => {
    feedState.loadDebounceTimer = null;
    loadFeed(options);
  }, 100);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diff = timestamp - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diff) < hour) {
    return rtf.format(Math.round(diff / minute), 'minute');
  }

  if (Math.abs(diff) < day) {
    return rtf.format(Math.round(diff / hour), 'hour');
  }

  return rtf.format(Math.round(diff / day), 'day');
}

function createNotification(message, type = 'danger') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} mb-3`;
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  return alert;
}

function getRoleLabel(author) {
  if (author.role === 'admin') {
    return 'Admin';
  }

  return 'User';
}

function getCategoryLabel(post) {
  return post.categoryName || 'Uncategorized';
}

function getPostDetailHref(postId) {
  return `/post-detail.html?id=${encodeURIComponent(postId)}`;
}

function createAvatar(author) {
  const avatar = document.createElement('img');
  avatar.className = 'rounded-circle flex-shrink-0 aqua-post-avatar';
  avatar.width = 40;
  avatar.height = 40;
  avatar.loading = 'lazy';
  avatar.alt = `${author.displayName} avatar`;
  avatar.src = author.avatarUrl || 'https://placehold.co/80x80?text=User';

  avatar.addEventListener('error', () => {
    avatar.src = 'https://placehold.co/80x80?text=User';
  }, { once: true });

  return avatar;
}

function createPostImage(post) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ratio ratio-16x9 aqua-post-media';

  const photos = post.photos?.filter((photo) => Boolean(photo?.publicUrl)) || [];
  const primaryPhoto = photos[0];

  if (!primaryPhoto?.publicUrl) {
    const placeholder = document.createElement('div');
    placeholder.className = 'aqua-post-media-placeholder';

    const icon = document.createElement('i');
    icon.className = 'bi bi-image';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'small';
    text.textContent = 'No image';

    placeholder.append(icon, text);
    wrapper.append(placeholder);
    return wrapper;
  }

  const image = document.createElement('img');
  image.className = 'aqua-post-media-img aqua-media-fade';
  image.src = primaryPhoto.publicUrl;
  image.alt = post.title;
  image.loading = 'lazy';

  image.addEventListener('error', () => {
    wrapper.replaceChildren();

    const placeholder = document.createElement('div');
    placeholder.className = 'aqua-post-media-placeholder';

    const icon = document.createElement('i');
    icon.className = 'bi bi-image';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'small';
    text.textContent = 'Image unavailable';

    placeholder.append(icon, text);
    wrapper.append(placeholder);
  }, { once: true });

  if (photos.length > 1) {
    let activeIndex = 0;
    let intervalId = null;

    const swapToPhoto = (nextPhoto) => {
      if (!nextPhoto?.publicUrl) {
        return;
      }

      image.classList.add('is-fading');

      const handleLoaded = () => {
        image.classList.remove('is-fading');
      };

      image.addEventListener('load', handleLoaded, { once: true });
      image.src = nextPhoto.publicUrl;
    };

    const updateImage = (nextIndex) => {
      const nextPhoto = photos[nextIndex];
      if (!nextPhoto?.publicUrl) {
        return;
      }

      activeIndex = nextIndex;
      swapToPhoto(nextPhoto);
    };

    const startCarousel = () => {
      if (intervalId) {
        return;
      }

      intervalId = window.setInterval(() => {
        if (!document.body.contains(wrapper)) {
          window.clearInterval(intervalId);
          intervalId = null;
          return;
        }

        const nextIndex = (activeIndex + 1) % photos.length;
        updateImage(nextIndex);
      }, 1200);
    };

    const stopCarousel = () => {
      if (!intervalId) {
        return;
      }

      window.clearInterval(intervalId);
      intervalId = null;
      updateImage(0);
    };

    wrapper.addEventListener('mouseenter', startCarousel);
    wrapper.addEventListener('mouseleave', stopCarousel);
  }

  wrapper.append(image);
  return wrapper;
}

function mapPostWithUiData(post, authorById, commentCountByPostId) {
  const author = authorById.get(post.userId) || {
    id: post.userId,
    username: 'user',
    displayName: 'Aquashares User',
    avatarUrl: '',
    role: 'user'
  };

  return {
    ...post,
    author,
    commentCount: commentCountByPostId.get(post.id) || 0
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
      username: profile.username || 'user',
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

export function renderPostCard(post, canManage = false, isAuthenticated = false) {
  const column = document.createElement('div');
  column.className = 'col-12 col-md-6 col-xl-4';
  column.dataset.postId = post.id;
  column.id = `post-${post.id}`;

  const article = document.createElement('article');
  article.className = 'card h-100 aqua-post-card';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column gap-3';

  const header = document.createElement('div');
  header.className = 'd-flex justify-content-between align-items-start gap-2';

  const authorWrap = document.createElement('div');
  authorWrap.className = 'd-flex align-items-center gap-2 min-w-0';

  const avatar = createAvatar(post.author);

  const authorMeta = document.createElement('div');
  authorMeta.className = 'min-w-0';

  const authorLink = document.createElement('a');
  authorLink.href = `/profile.html?user=${encodeURIComponent(post.author.id)}`;
  authorLink.className = 'fw-semibold text-decoration-none d-inline-block aqua-truncate-1';
  authorLink.textContent = post.author.username ? `@${post.author.username}` : '@user';

  const subMeta = document.createElement('div');
  subMeta.className = 'd-flex align-items-center gap-2 text-muted small';

  const roleBadge = document.createElement('span');
  roleBadge.className = 'badge rounded-pill text-bg-light border';
  roleBadge.textContent = getRoleLabel(post.author);

  const timestamp = document.createElement('span');
  timestamp.textContent = formatRelativeTime(post.createdAt);
  timestamp.title = formatDate(post.createdAt);

  subMeta.append(roleBadge, timestamp);
  authorMeta.append(authorLink, subMeta);
  authorWrap.append(avatar, authorMeta);
  header.append(authorWrap);

  if (canManage) {
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'btn btn-sm btn-outline-secondary';
    toggleButton.setAttribute('data-bs-toggle', 'dropdown');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-label', 'Post actions');

    const dotsIcon = document.createElement('i');
    dotsIcon.className = 'bi bi-three-dots-vertical';
    dotsIcon.setAttribute('aria-hidden', 'true');
    toggleButton.append(dotsIcon);

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end';

    const editItemWrap = document.createElement('li');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'dropdown-item';
    editButton.dataset.action = 'edit-post';
    editButton.dataset.postId = post.id;
    editButton.textContent = 'Edit Post';
    editItemWrap.append(editButton);

    const deleteItemWrap = document.createElement('li');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'dropdown-item text-danger';
    deleteButton.dataset.action = 'delete-post';
    deleteButton.dataset.postId = post.id;
    deleteButton.textContent = 'Delete Post';
    deleteItemWrap.append(deleteButton);

    menu.append(editItemWrap, deleteItemWrap);
    dropdown.append(toggleButton, menu);
    header.append(dropdown);
  }

  const media = createPostImage(post);
  const mediaLink = document.createElement('a');
  mediaLink.href = getPostDetailHref(post.id);
  mediaLink.className = 'text-decoration-none';
  mediaLink.append(media);

  const content = document.createElement('div');

  const category = document.createElement(post.categorySlug ? 'a' : 'span');
  category.className = 'badge text-bg-secondary-subtle text-secondary-emphasis mb-2 text-decoration-none';
  category.textContent = getCategoryLabel(post);

  if (post.categorySlug) {
    category.href = `/index.html?category=${encodeURIComponent(post.categorySlug)}`;
    category.classList.add('aqua-category-link');
    category.setAttribute('aria-label', `Filter by ${getCategoryLabel(post)} category`);
  }

  const title = document.createElement('h2');
  title.className = 'h6 mb-1 aqua-truncate-2';

  const titleLink = document.createElement('a');
  titleLink.href = getPostDetailHref(post.id);
  titleLink.className = 'text-decoration-none text-body';
  titleLink.textContent = post.title;

  title.append(titleLink);

  const body = document.createElement('p');
  body.className = 'text-secondary mb-0 aqua-truncate-3';
  body.textContent = post.body;

  content.append(category, title, body);

  const interactionBar = document.createElement('div');
  interactionBar.className = 'd-flex align-items-center justify-content-between mt-auto pt-2 border-top';

  const commentsInfo = document.createElement('div');
  commentsInfo.className = 'd-inline-flex align-items-center gap-1 text-muted small';

  const commentsIcon = document.createElement('i');
  commentsIcon.className = 'bi bi-chat-dots';
  commentsIcon.setAttribute('aria-hidden', 'true');

  const commentsText = document.createElement('span');
  commentsText.textContent = `${post.commentCount} comments`;
  commentsInfo.append(commentsIcon, commentsText);

  const likeButton = document.createElement('button');
  likeButton.type = 'button';
  likeButton.className = 'btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1';
  likeButton.disabled = true;
  likeButton.setAttribute('aria-label', 'Like post (coming soon)');

  const likeIcon = document.createElement('i');
  likeIcon.className = 'bi bi-heart';
  likeIcon.setAttribute('aria-hidden', 'true');

  const likeText = document.createElement('span');
  likeText.textContent = 'Like';
  likeButton.append(likeIcon, likeText);

  interactionBar.append(commentsInfo, likeButton);

  cardBody.append(header, mediaLink, content, interactionBar, createCommentsBlock(post.id, isAuthenticated));
  article.append(cardBody);
  column.append(article);

  return column;
}

function focusPostFromHash() {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#post-')) {
    return;
  }

  const targetId = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(targetId);

  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const card = target.querySelector('.card');
  if (!(card instanceof HTMLElement)) {
    return;
  }

  card.classList.add('border-primary', 'border-2');
  window.setTimeout(() => {
    card.classList.remove('border-primary', 'border-2');
  }, 2200);
}

function getCommentIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('comment');
  return value && value.trim() ? value.trim() : null;
}

function getCategoryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('category');
  return value && value.trim() ? value.trim() : '';
}

function setCategoryInQuery(categorySlug) {
  const params = new URLSearchParams(window.location.search);

  if (categorySlug) {
    params.set('category', categorySlug);
  } else {
    params.delete('category');
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    window.history.pushState(null, '', nextUrl);
  }
}

function focusCommentFromQuery() {
  const commentId = getCommentIdFromQuery();
  if (!commentId) {
    return;
  }

  const target = document.getElementById(`comment-${commentId}`);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('border-primary', 'border-2');

  window.setTimeout(() => {
    target.classList.remove('border-primary', 'border-2');
  }, 2200);
}

function renderEmptyState(container, message = 'Be the first to create a post.') {
  container.replaceChildren();

  const emptyColumn = document.createElement('div');
  emptyColumn.className = 'col-12';

  const emptyCard = document.createElement('article');
  emptyCard.className = 'card';

  const emptyBody = document.createElement('div');
  emptyBody.className = 'card-body';

  const emptyTitle = document.createElement('h2');
  emptyTitle.className = 'h5 card-title';
  emptyTitle.textContent = 'No posts yet';

  const emptyText = document.createElement('p');
  emptyText.className = 'card-text text-secondary mb-0';
  emptyText.textContent = message;

  emptyBody.append(emptyTitle, emptyText);
  emptyCard.append(emptyBody);
  emptyColumn.append(emptyCard);
  container.append(emptyColumn);
}

function getUiElements() {
  return {
    feedContainer: document.querySelector('[data-feed-list]'),
    loadingElement: document.querySelector('[data-feed-loading]'),
    errorElement: document.querySelector('[data-feed-error]'),
    notificationRoot: document.querySelector('[data-feed-notifications]'),
    categoryFilter: document.querySelector('[data-feed-category-filter]'),
    clearFilterButton: document.querySelector('[data-feed-clear-filter]'),
    filterStatus: document.querySelector('[data-feed-filter-status]')
  };
}

function updateFeedFilterUi(filterElement, clearFilterButton, filterStatus, categories) {
  const selectedSlug = filterElement instanceof HTMLSelectElement ? filterElement.value || '' : '';

  if (clearFilterButton) {
    clearFilterButton.classList.toggle('d-none', !selectedSlug);
  }

  if (!filterStatus) {
    return;
  }

  if (!selectedSlug) {
    filterStatus.textContent = '';
    filterStatus.classList.add('d-none');
    return;
  }

  const categoryName = (categories || []).find((category) => category.slug === selectedSlug)?.name || 'Selected category';
  filterStatus.textContent = `Filtering by: ${categoryName}`;
  filterStatus.classList.remove('d-none');
}

function setCategoryFilterOptions(filterElement, categories, selectedSlug) {
  if (!(filterElement instanceof HTMLSelectElement)) {
    return;
  }

  const previousValue = selectedSlug || filterElement.value || '';
  filterElement.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Categories';
  filterElement.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.slug;
    option.textContent = category.name;
    filterElement.append(option);
  });

  const hasCurrentValue = categories.some((category) => category.slug === previousValue);
  filterElement.value = hasCurrentValue ? previousValue : '';
}

function bindCategoryFilter(filterElement, clearFilterButton) {
  if (!(filterElement instanceof HTMLSelectElement) || feedState.categoriesBound) {
    return;
  }

  feedState.categoriesBound = true;
  filterElement.addEventListener('change', () => {
    const selectedSlug = filterElement.value || '';
    setCategoryInQuery(selectedSlug);
    scheduleFeedLoad();
  });

  if (clearFilterButton && clearFilterButton.dataset.bound !== 'true') {
    clearFilterButton.dataset.bound = 'true';
    clearFilterButton.addEventListener('click', () => {
      filterElement.value = '';
      setCategoryInQuery('');
      scheduleFeedLoad();
    });
  }
}

function bindFeedPopstate() {
  if (feedState.popstateBound) {
    return;
  }

  feedState.popstateBound = true;
  window.addEventListener('popstate', () => {
    if (!window.location.pathname.endsWith('/index.html') && window.location.pathname !== '/') {
      return;
    }

    scheduleFeedLoad();
  });
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

    const postsWithUiData = posts.map((post) => mapPostWithUiData(post, authorMap, commentCountMap));

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

function setLoadingState(isLoading, loadingElement) {
  if (!loadingElement) {
    return;
  }

  if (isLoading) {
    loadingElement.classList.remove('d-none');
    return;
  }

  loadingElement.classList.add('d-none');
}

function clearError(errorElement) {
  if (!errorElement) {
    return;
  }

  errorElement.classList.add('d-none');
  errorElement.textContent = '';
}

function showError(errorElement, message) {
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
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
  container.addEventListener('click', (event) => {
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

    const isConfirmed = window.confirm('Delete this post?');
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

export async function loadFeed(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const { feedContainer, loadingElement, errorElement, notificationRoot, categoryFilter, clearFilterButton, filterStatus } = getUiElements();

  if (!feedContainer) {
    return;
  }

  bindFeedPopstate();

  setLoadingState(true, loadingElement);
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

    const selectedCategorySlugFromQuery = getCategoryFromQuery();

    const { postsWithUiData, viewer, categories } = await getFeedData(forceRefresh);

    if (categoryFilter) {
      setCategoryFilterOptions(categoryFilter, categories, selectedCategorySlugFromQuery);
      bindCategoryFilter(categoryFilter, clearFilterButton);
      updateFeedFilterUi(categoryFilter, clearFilterButton, filterStatus, categories);
    }

    const categorySlugs = new Set(categories.map((category) => category.slug));
    const selectedCategorySlug = categorySlugs.has(selectedCategorySlugFromQuery) ? selectedCategorySlugFromQuery : '';

    if (selectedCategorySlugFromQuery && !selectedCategorySlug) {
      setCategoryInQuery('');
    }

    const filteredPosts = selectedCategorySlug
      ? postsWithUiData.filter((post) => post.categorySlug === selectedCategorySlug)
      : postsWithUiData;
    const canManagePost = (post) => Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);

    feedContainer.replaceChildren();

    if (!filteredPosts.length) {
      renderEmptyState(
        feedContainer,
        selectedCategorySlug ? 'No posts found in this category yet.' : 'Be the first to create a post.'
      );
    } else {
      const fragment = document.createDocumentFragment();
      filteredPosts.forEach((post) => {
        fragment.append(renderPostCard(post, canManagePost(post), Boolean(viewer.userId)));
      });

      feedContainer.append(fragment);
      await initializeCommentsUi(feedContainer, viewer.userId);
      focusPostFromHash();
      focusCommentFromQuery();
    }

    attachEditHandler(feedContainer);
    attachDeleteHandler(feedContainer, () => loadFeed({ forceRefresh: true }));
  } catch (error) {
    showError(errorElement, error.message || 'Unable to load feed right now. Please try again.');
  } finally {
    if (categoryFilter instanceof HTMLSelectElement) {
      categoryFilter.disabled = false;
    }
    if (clearFilterButton instanceof HTMLButtonElement) {
      clearFilterButton.disabled = false;
    }
    setLoadingState(false, loadingElement);
  }
}
