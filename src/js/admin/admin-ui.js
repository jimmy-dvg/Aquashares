import {
  getAdminNotifications,
  getAllComments,
  getAllPosts,
  getAllUsers
} from './admin-service.js';
import { requireAdmin } from '../auth/auth-guard.js';
import {
  attachAdminNotificationHandlers,
  attachDeleteHandlers,
  attachRoleChangeHandlers,
  createConfirmationController
} from './admin-ui-handlers.js';
import {
  formatDate,
  renderAdminNotifications,
  renderCommentsTable,
  renderPostsTable,
  renderUsersTable,
  setVisible
} from './admin-ui-render.js';

const adminState = {
  posts: [],
  postsFilterBound: false,
  popstateBound: false,
  cache: {
    users: null,
    posts: null,
    comments: null,
    adminNotifications: null,
    refreshPromise: null
  },
  autoRefreshIntervalId: null
};

async function getDashboardData(forceRefresh = false) {
  if (!forceRefresh && adminState.cache.users && adminState.cache.posts && adminState.cache.comments && adminState.cache.adminNotifications) {
    return {
      users: adminState.cache.users,
      posts: adminState.cache.posts,
      comments: adminState.cache.comments,
      adminNotifications: adminState.cache.adminNotifications
    };
  }

  if (!forceRefresh && adminState.cache.refreshPromise) {
    return adminState.cache.refreshPromise;
  }

  const refreshPromise = (async () => {
    const [users, posts, comments, adminNotifications] = await Promise.all([
      getAllUsers(),
      getAllPosts(),
      getAllComments(),
      getAdminNotifications()
    ]);

    adminState.cache.users = users;
    adminState.cache.posts = posts;
    adminState.cache.comments = comments;
    adminState.cache.adminNotifications = adminNotifications;

    return {
      users,
      posts,
      comments,
      adminNotifications
    };
  })();

  adminState.cache.refreshPromise = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    adminState.cache.refreshPromise = null;
  }
}

function getCategoryFilterFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('category');
  return value && value.trim() ? value.trim() : '';
}

function setCategoryFilterInQuery(categorySlug) {
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


function getElements() {
  return {
    pageRoot: document.querySelector('[data-admin-page]'),
    feedback: document.querySelector('[data-admin-feedback]'),
    usersLoading: document.querySelector('[data-users-loading]'),
    postsLoading: document.querySelector('[data-posts-loading]'),
    commentsLoading: document.querySelector('[data-comments-loading]'),
    usersBody: document.querySelector('[data-users-body]'),
    postsBody: document.querySelector('[data-posts-body]'),
    postsCategoryFilter: document.querySelector('[data-admin-posts-category-filter]'),
    postsClearFilter: document.querySelector('[data-admin-posts-clear-filter]'),
    postsFilterStatus: document.querySelector('[data-admin-posts-filter-status]'),
    commentsBody: document.querySelector('[data-comments-body]'),
    adminNotificationsLoading: document.querySelector('[data-admin-notifications-loading]'),
    adminNotificationsList: document.querySelector('[data-admin-notifications-list]'),
    usersEmpty: document.querySelector('[data-users-empty]'),
    postsEmpty: document.querySelector('[data-posts-empty]'),
    commentsEmpty: document.querySelector('[data-comments-empty]'),
    adminNotificationsEmpty: document.querySelector('[data-admin-notifications-empty]'),
    lastUpdated: document.querySelector('[data-admin-last-updated]'),
    lastUpdatedText: document.querySelector('[data-admin-last-updated-text]'),
    lastUpdatedIcon: document.querySelector('[data-admin-last-updated-icon]'),
    confirmModalElement: document.getElementById('adminConfirmModal'),
    confirmTitle: document.querySelector('[data-confirm-title]'),
    confirmText: document.querySelector('[data-confirm-text]'),
    confirmAction: document.querySelector('[data-confirm-action]'),
    previewModalElement: document.getElementById('adminPreviewModal'),
    previewTitle: document.querySelector('[data-preview-title]'),
    previewMeta: document.querySelector('[data-preview-meta]'),
    previewBody: document.querySelector('[data-preview-body]')
  };
}


function showFeedback(elements, message, type = 'danger') {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.className = `alert alert-${type}`;
  elements.feedback.textContent = message;
  elements.feedback.classList.remove('d-none');
}

function clearFeedback(elements) {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.textContent = '';
  elements.feedback.classList.add('d-none');
}

function setLastUpdated(elements, date = new Date()) {
  const target = elements.lastUpdatedText || elements.lastUpdated;
  if (!target) {
    return;
  }

  target.textContent = `Last updated: ${formatDate(date.toISOString())}`;
}

function setRefreshingState(elements, isRefreshing) {
  const target = elements.lastUpdatedText || elements.lastUpdated;
  if (!target) {
    return;
  }

  if (elements.lastUpdatedIcon) {
    elements.lastUpdatedIcon.classList.toggle('aqua-spin', isRefreshing);
  }

  if (isRefreshing) {
    target.textContent = 'Refreshing...';
  }
}


function setPostsFilterOptions(posts, elements) {
  if (!(elements.postsCategoryFilter instanceof HTMLSelectElement)) {
    return;
  }

  const queryValue = getCategoryFilterFromQuery();
  const previousValue = queryValue || elements.postsCategoryFilter.value || '';
  elements.postsCategoryFilter.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Categories';
  elements.postsCategoryFilter.append(allOption);

  const categoryMap = new Map();
  posts.forEach((post) => {
    const slug = post.categorySlug || 'uncategorized';
    const name = post.categoryName || 'Uncategorized';
    if (!categoryMap.has(slug)) {
      categoryMap.set(slug, name);
    }
  });

  [...categoryMap.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([slug, name]) => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = name;
    elements.postsCategoryFilter.append(option);
  });

  const hasPrevious = [...elements.postsCategoryFilter.options].some((option) => option.value === previousValue);
  elements.postsCategoryFilter.value = hasPrevious ? previousValue : '';

  if (queryValue && !hasPrevious) {
    setCategoryFilterInQuery('');
  }
}

function updateAdminPostsFilterUi(elements) {
  const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
    ? elements.postsCategoryFilter.value
    : '';

  if (elements.postsClearFilter) {
    elements.postsClearFilter.classList.toggle('d-none', !selectedCategory);
  }

  if (!elements.postsFilterStatus) {
    return;
  }

  if (!selectedCategory) {
    elements.postsFilterStatus.textContent = '';
    elements.postsFilterStatus.classList.add('d-none');
    return;
  }

  const selectedOption = elements.postsCategoryFilter?.selectedOptions?.[0];
  const label = selectedOption?.textContent?.trim() || 'Selected category';
  elements.postsFilterStatus.textContent = `Filtering by: ${label}`;
  elements.postsFilterStatus.classList.remove('d-none');
}

function renderFilteredPosts(elements) {
  const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
    ? elements.postsCategoryFilter.value
    : '';

  const filteredPosts = selectedCategory
    ? adminState.posts.filter((post) => (post.categorySlug || 'uncategorized') === selectedCategory)
    : adminState.posts;

  renderPostsTable(filteredPosts, elements);
  updateAdminPostsFilterUi(elements);
}

function attachPostsFilterHandler(elements) {
  if (!(elements.postsCategoryFilter instanceof HTMLSelectElement) || adminState.postsFilterBound) {
    return;
  }

  adminState.postsFilterBound = true;
  elements.postsCategoryFilter.addEventListener('change', () => {
    setCategoryFilterInQuery(elements.postsCategoryFilter.value || '');
    renderFilteredPosts(elements);
  });

  if (elements.postsClearFilter && elements.postsClearFilter.dataset.bound !== 'true') {
    elements.postsClearFilter.dataset.bound = 'true';
    elements.postsClearFilter.addEventListener('click', () => {
      elements.postsCategoryFilter.value = '';
      setCategoryFilterInQuery('');
      renderFilteredPosts(elements);
    });
  }
}

function attachPopstateHandler(elements) {
  if (adminState.popstateBound) {
    return;
  }

  adminState.popstateBound = true;
  window.addEventListener('popstate', () => {
    if (!(elements.postsCategoryFilter instanceof HTMLSelectElement)) {
      return;
    }

    const nextCategory = getCategoryFilterFromQuery();
    const hasOption = [...elements.postsCategoryFilter.options].some((option) => option.value === nextCategory);
    elements.postsCategoryFilter.value = hasOption ? nextCategory : '';
    renderFilteredPosts(elements);
  });
}



export async function loadDashboard() {
  const elements = getElements();

  if (!elements.pageRoot) {
    return;
  }

  const adminSession = await requireAdmin('/index.html');
  if (!adminSession) {
    return;
  }

  const confirmController = createConfirmationController(elements);

  const refreshDashboard = async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;

    clearFeedback(elements);
    setRefreshingState(elements, true);
    if (elements.postsCategoryFilter instanceof HTMLSelectElement) {
      elements.postsCategoryFilter.disabled = true;
    }
    if (elements.postsClearFilter instanceof HTMLButtonElement) {
      elements.postsClearFilter.disabled = true;
    }
    setVisible(elements.usersLoading, true);
    setVisible(elements.postsLoading, true);
    setVisible(elements.commentsLoading, true);
    setVisible(elements.adminNotificationsLoading, true);

    try {
      const { users, posts, comments, adminNotifications } = await getDashboardData(forceRefresh);

      adminState.posts = posts;
      renderUsersTable(users, elements);
      setPostsFilterOptions(posts, elements);
      renderFilteredPosts(elements);
      renderCommentsTable(comments, elements);
      renderAdminNotifications(adminNotifications, elements, adminSession.user.id);
      setLastUpdated(elements);
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to load admin dashboard.');
    } finally {
      setVisible(elements.usersLoading, false);
      setVisible(elements.postsLoading, false);
      setVisible(elements.commentsLoading, false);
      setVisible(elements.adminNotificationsLoading, false);
      if (elements.postsCategoryFilter instanceof HTMLSelectElement) {
        elements.postsCategoryFilter.disabled = false;
      }
      if (elements.postsClearFilter instanceof HTMLButtonElement) {
        elements.postsClearFilter.disabled = false;
      }
      setRefreshingState(elements, false);
    }
  };

  attachRoleChangeHandlers(elements, refreshDashboard, showFeedback);
  attachPostsFilterHandler(elements);
  attachPopstateHandler(elements);
  attachDeleteHandlers(elements, confirmController, refreshDashboard, showFeedback);
  attachAdminNotificationHandlers(elements, adminSession.user.id, refreshDashboard, showFeedback);

  if (adminState.autoRefreshIntervalId) {
    window.clearInterval(adminState.autoRefreshIntervalId);
  }

  adminState.autoRefreshIntervalId = window.setInterval(async () => {
    await refreshDashboard({ forceRefresh: true });
  }, 9000);

  await refreshDashboard({ forceRefresh: true });
}

loadDashboard();