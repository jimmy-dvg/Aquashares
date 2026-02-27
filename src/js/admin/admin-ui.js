import {
  getAdminNotifications,
  getAllComments,
  getAllPosts,
  getAllUsers,
  subscribeToAdminNotifications
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
  users: [],
  comments: [],
  adminNotifications: [],
  postsFilterBound: false,
  usersFilterBound: false,
  commentsFilterBound: false,
  adminNotificationsFilterBound: false,
  popstateBound: false,
  cache: {
    users: null,
    posts: null,
    comments: null,
    adminNotifications: null,
    refreshPromise: null
  },
  autoRefreshIntervalId: null,
  unsubscribeAdminNotifications: null
};

function cleanupAutoRefresh() {
  if (adminState.autoRefreshIntervalId) {
    window.clearInterval(adminState.autoRefreshIntervalId);
  }

  adminState.autoRefreshIntervalId = null;
}

function cleanupAdminNotificationsSubscription() {
  if (typeof adminState.unsubscribeAdminNotifications === 'function') {
    adminState.unsubscribeAdminNotifications();
  }

  adminState.unsubscribeAdminNotifications = null;
}

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
    postsSearchInput: document.querySelector('[data-admin-posts-search]'),
    postsCategoryFilter: document.querySelector('[data-admin-posts-category-filter]'),
    postsClearFilter: document.querySelector('[data-admin-posts-clear-filter]'),
    postsFilterStatus: document.querySelector('[data-admin-posts-filter-status]'),
    commentsBody: document.querySelector('[data-comments-body]'),
    usersSearchInput: document.querySelector('[data-admin-users-search]'),
    usersRoleFilter: document.querySelector('[data-admin-users-role-filter]'),
    usersClearFilter: document.querySelector('[data-admin-users-clear-filter]'),
    usersFilterStatus: document.querySelector('[data-admin-users-filter-status]'),
    commentsSearchInput: document.querySelector('[data-admin-comments-search]'),
    commentsClearFilter: document.querySelector('[data-admin-comments-clear-filter]'),
    commentsFilterStatus: document.querySelector('[data-admin-comments-filter-status]'),
    adminNotificationsSearchInput: document.querySelector('[data-admin-notifications-search]'),
    adminNotificationsStatusFilter: document.querySelector('[data-admin-notifications-status-filter]'),
    adminNotificationsSeverityFilter: document.querySelector('[data-admin-notifications-severity-filter]'),
    adminNotificationsClearFilter: document.querySelector('[data-admin-notifications-clear-filter]'),
    adminNotificationsFilterStatus: document.querySelector('[data-admin-notifications-filter-status]'),
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

function normalizeText(value) {
  return (value || '').toLowerCase().trim();
}

function updateUsersFilterUi(elements, filteredCount, totalCount) {
  const query = elements.usersSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.usersSearchInput.value)
    : '';
  const role = elements.usersRoleFilter instanceof HTMLSelectElement
    ? (elements.usersRoleFilter.value || '')
    : '';

  const hasFilter = Boolean(query || role);

  if (elements.usersClearFilter) {
    elements.usersClearFilter.classList.toggle('d-none', !hasFilter);
  }

  if (!elements.usersFilterStatus) {
    return;
  }

  if (!hasFilter) {
    elements.usersFilterStatus.textContent = '';
    elements.usersFilterStatus.classList.add('d-none');
    return;
  }

  const labels = [];
  if (query) {
    labels.push(`query: "${query}"`);
  }
  if (role) {
    labels.push(`role: ${role}`);
  }

  elements.usersFilterStatus.textContent = `Showing ${filteredCount}/${totalCount} users (${labels.join(', ')})`;
  elements.usersFilterStatus.classList.remove('d-none');
}

function renderFilteredUsers(elements) {
  const query = elements.usersSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.usersSearchInput.value)
    : '';
  const role = elements.usersRoleFilter instanceof HTMLSelectElement
    ? (elements.usersRoleFilter.value || '')
    : '';

  const filteredUsers = adminState.users.filter((user) => {
    if (role && user.role !== role) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = normalizeText(`${user.username} ${user.displayName} ${user.email}`);
    return haystack.includes(query);
  });

  renderUsersTable(filteredUsers, elements);
  updateUsersFilterUi(elements, filteredUsers.length, adminState.users.length);
}

function attachUsersFilterHandler(elements) {
  if (adminState.usersFilterBound) {
    return;
  }

  const canBindSearch = elements.usersSearchInput instanceof HTMLInputElement;
  const canBindRole = elements.usersRoleFilter instanceof HTMLSelectElement;

  if (!canBindSearch || !canBindRole) {
    return;
  }

  adminState.usersFilterBound = true;

  elements.usersSearchInput.addEventListener('input', () => {
    renderFilteredUsers(elements);
  });

  elements.usersRoleFilter.addEventListener('change', () => {
    renderFilteredUsers(elements);
  });

  if (elements.usersClearFilter && elements.usersClearFilter.dataset.bound !== 'true') {
    elements.usersClearFilter.dataset.bound = 'true';
    elements.usersClearFilter.addEventListener('click', () => {
      elements.usersSearchInput.value = '';
      elements.usersRoleFilter.value = '';
      renderFilteredUsers(elements);
    });
  }
}

function updateCommentsFilterUi(elements, filteredCount, totalCount) {
  const query = elements.commentsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.commentsSearchInput.value)
    : '';

  if (elements.commentsClearFilter) {
    elements.commentsClearFilter.classList.toggle('d-none', !query);
  }

  if (!elements.commentsFilterStatus) {
    return;
  }

  if (!query) {
    elements.commentsFilterStatus.textContent = '';
    elements.commentsFilterStatus.classList.add('d-none');
    return;
  }

  elements.commentsFilterStatus.textContent = `Showing ${filteredCount}/${totalCount} comments for "${query}"`;
  elements.commentsFilterStatus.classList.remove('d-none');
}

function renderFilteredComments(elements) {
  const query = elements.commentsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.commentsSearchInput.value)
    : '';

  const filteredComments = adminState.comments.filter((comment) => {
    if (!query) {
      return true;
    }

    const haystack = normalizeText(`${comment.postTitle} ${comment.authorUsername} ${comment.authorEmail} ${comment.body}`);
    return haystack.includes(query);
  });

  renderCommentsTable(filteredComments, elements);
  updateCommentsFilterUi(elements, filteredComments.length, adminState.comments.length);
}

function attachCommentsFilterHandler(elements) {
  if (adminState.commentsFilterBound) {
    return;
  }

  if (!(elements.commentsSearchInput instanceof HTMLInputElement)) {
    return;
  }

  adminState.commentsFilterBound = true;

  elements.commentsSearchInput.addEventListener('input', () => {
    renderFilteredComments(elements);
  });

  if (elements.commentsClearFilter && elements.commentsClearFilter.dataset.bound !== 'true') {
    elements.commentsClearFilter.dataset.bound = 'true';
    elements.commentsClearFilter.addEventListener('click', () => {
      elements.commentsSearchInput.value = '';
      renderFilteredComments(elements);
    });
  }
}

function updateAdminNotificationsFilterUi(elements, filteredCount, totalCount) {
  const query = elements.adminNotificationsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.adminNotificationsSearchInput.value)
    : '';
  const status = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement
    ? (elements.adminNotificationsStatusFilter.value || '')
    : '';
  const severity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement
    ? (elements.adminNotificationsSeverityFilter.value || '')
    : '';

  const hasFilter = Boolean(query || status || severity);

  if (elements.adminNotificationsClearFilter) {
    elements.adminNotificationsClearFilter.classList.toggle('d-none', !hasFilter);
  }

  if (!elements.adminNotificationsFilterStatus) {
    return;
  }

  if (!hasFilter) {
    elements.adminNotificationsFilterStatus.textContent = '';
    elements.adminNotificationsFilterStatus.classList.add('d-none');
    return;
  }

  const labels = [];
  if (query) {
    labels.push(`query: "${query}"`);
  }
  if (status) {
    labels.push(`status: ${status}`);
  }
  if (severity) {
    labels.push(`severity: ${severity}`);
  }

  elements.adminNotificationsFilterStatus.textContent = `Showing ${filteredCount}/${totalCount} notifications (${labels.join(', ')})`;
  elements.adminNotificationsFilterStatus.classList.remove('d-none');
}

function renderFilteredAdminNotifications(elements, currentAdminId) {
  const query = elements.adminNotificationsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.adminNotificationsSearchInput.value)
    : '';
  const status = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement
    ? (elements.adminNotificationsStatusFilter.value || '')
    : '';
  const severity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement
    ? (elements.adminNotificationsSeverityFilter.value || '')
    : '';

  const filteredNotifications = adminState.adminNotifications.filter((notification) => {
    if (status && notification.status !== status) {
      return false;
    }

    if (severity && notification.severity !== severity) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = normalizeText(`${notification.title} ${notification.message} ${notification.sourceType} ${notification.referenceType}`);
    return haystack.includes(query);
  });

  renderAdminNotifications(filteredNotifications, elements, currentAdminId);
  updateAdminNotificationsFilterUi(elements, filteredNotifications.length, adminState.adminNotifications.length);
}

function attachAdminNotificationsFilterHandler(elements, currentAdminId) {
  if (adminState.adminNotificationsFilterBound) {
    return;
  }

  const canBindSearch = elements.adminNotificationsSearchInput instanceof HTMLInputElement;
  const canBindStatus = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement;
  const canBindSeverity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement;

  if (!canBindSearch || !canBindStatus || !canBindSeverity) {
    return;
  }

  adminState.adminNotificationsFilterBound = true;

  elements.adminNotificationsSearchInput.addEventListener('input', () => {
    renderFilteredAdminNotifications(elements, currentAdminId);
  });

  elements.adminNotificationsStatusFilter.addEventListener('change', () => {
    renderFilteredAdminNotifications(elements, currentAdminId);
  });

  elements.adminNotificationsSeverityFilter.addEventListener('change', () => {
    renderFilteredAdminNotifications(elements, currentAdminId);
  });

  if (elements.adminNotificationsClearFilter && elements.adminNotificationsClearFilter.dataset.bound !== 'true') {
    elements.adminNotificationsClearFilter.dataset.bound = 'true';
    elements.adminNotificationsClearFilter.addEventListener('click', () => {
      elements.adminNotificationsSearchInput.value = '';
      elements.adminNotificationsStatusFilter.value = '';
      elements.adminNotificationsSeverityFilter.value = '';
      renderFilteredAdminNotifications(elements, currentAdminId);
    });
  }
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
  const query = elements.postsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.postsSearchInput.value)
    : '';
  const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
    ? elements.postsCategoryFilter.value
    : '';

  if (elements.postsClearFilter) {
    elements.postsClearFilter.classList.toggle('d-none', !(selectedCategory || query));
  }

  if (!elements.postsFilterStatus) {
    return;
  }

  if (!selectedCategory) {
    if (!query) {
      elements.postsFilterStatus.textContent = '';
      elements.postsFilterStatus.classList.add('d-none');
      return;
    }
  }

  const labels = [];

  if (selectedCategory) {
    const selectedOption = elements.postsCategoryFilter?.selectedOptions?.[0];
    const label = selectedOption?.textContent?.trim() || 'Selected category';
    labels.push(`category: ${label}`);
  }

  if (query) {
    labels.push(`query: "${query}"`);
  }

  elements.postsFilterStatus.textContent = `Filtering by ${labels.join(', ')}`;
  elements.postsFilterStatus.classList.remove('d-none');
}

function renderFilteredPosts(elements) {
  const query = elements.postsSearchInput instanceof HTMLInputElement
    ? normalizeText(elements.postsSearchInput.value)
    : '';
  const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
    ? elements.postsCategoryFilter.value
    : '';

  const filteredPosts = adminState.posts.filter((post) => {
    if (selectedCategory && (post.categorySlug || 'uncategorized') !== selectedCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = normalizeText(`${post.title} ${post.body} ${post.authorUsername} ${post.authorEmail} ${post.categoryName}`);
    return haystack.includes(query);
  });

  renderPostsTable(filteredPosts, elements);
  updateAdminPostsFilterUi(elements);

  if (elements.postsFilterStatus) {
    const baseText = elements.postsFilterStatus.textContent || '';
    if (baseText) {
      elements.postsFilterStatus.textContent = `${baseText} • ${filteredPosts.length}/${adminState.posts.length} posts`;
    }
  }
}

function attachPostsFilterHandler(elements) {
  const canBindCategory = elements.postsCategoryFilter instanceof HTMLSelectElement;
  const canBindSearch = elements.postsSearchInput instanceof HTMLInputElement;

  if (adminState.postsFilterBound || !canBindCategory || !canBindSearch) {
    return;
  }

  adminState.postsFilterBound = true;
  elements.postsSearchInput.addEventListener('input', () => {
    renderFilteredPosts(elements);
  });

  elements.postsCategoryFilter.addEventListener('change', () => {
    setCategoryFilterInQuery(elements.postsCategoryFilter.value || '');
    renderFilteredPosts(elements);
  });

  if (elements.postsClearFilter && elements.postsClearFilter.dataset.bound !== 'true') {
    elements.postsClearFilter.dataset.bound = 'true';
    elements.postsClearFilter.addEventListener('click', () => {
      if (elements.postsSearchInput instanceof HTMLInputElement) {
        elements.postsSearchInput.value = '';
      }
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
    if (elements.usersSearchInput instanceof HTMLInputElement) {
      elements.usersSearchInput.disabled = true;
    }
    if (elements.usersRoleFilter instanceof HTMLSelectElement) {
      elements.usersRoleFilter.disabled = true;
    }
    if (elements.usersClearFilter instanceof HTMLButtonElement) {
      elements.usersClearFilter.disabled = true;
    }
    if (elements.postsSearchInput instanceof HTMLInputElement) {
      elements.postsSearchInput.disabled = true;
    }
    if (elements.postsCategoryFilter instanceof HTMLSelectElement) {
      elements.postsCategoryFilter.disabled = true;
    }
    if (elements.postsClearFilter instanceof HTMLButtonElement) {
      elements.postsClearFilter.disabled = true;
    }
    if (elements.commentsSearchInput instanceof HTMLInputElement) {
      elements.commentsSearchInput.disabled = true;
    }
    if (elements.commentsClearFilter instanceof HTMLButtonElement) {
      elements.commentsClearFilter.disabled = true;
    }
    if (elements.adminNotificationsSearchInput instanceof HTMLInputElement) {
      elements.adminNotificationsSearchInput.disabled = true;
    }
    if (elements.adminNotificationsStatusFilter instanceof HTMLSelectElement) {
      elements.adminNotificationsStatusFilter.disabled = true;
    }
    if (elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement) {
      elements.adminNotificationsSeverityFilter.disabled = true;
    }
    if (elements.adminNotificationsClearFilter instanceof HTMLButtonElement) {
      elements.adminNotificationsClearFilter.disabled = true;
    }
    setVisible(elements.usersLoading, true);
    setVisible(elements.postsLoading, true);
    setVisible(elements.commentsLoading, true);
    setVisible(elements.adminNotificationsLoading, true);

    try {
      const { users, posts, comments, adminNotifications } = await getDashboardData(forceRefresh);

      adminState.users = users;
      adminState.posts = posts;
      adminState.comments = comments;
      adminState.adminNotifications = adminNotifications;

      renderFilteredUsers(elements);
      setPostsFilterOptions(posts, elements);
      renderFilteredPosts(elements);
      renderFilteredComments(elements);
      renderFilteredAdminNotifications(elements, adminSession.user.id);
      setLastUpdated(elements);
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to load admin dashboard.');
    } finally {
      setVisible(elements.usersLoading, false);
      setVisible(elements.postsLoading, false);
      setVisible(elements.commentsLoading, false);
      setVisible(elements.adminNotificationsLoading, false);
      if (elements.usersSearchInput instanceof HTMLInputElement) {
        elements.usersSearchInput.disabled = false;
      }
      if (elements.usersRoleFilter instanceof HTMLSelectElement) {
        elements.usersRoleFilter.disabled = false;
      }
      if (elements.usersClearFilter instanceof HTMLButtonElement) {
        elements.usersClearFilter.disabled = false;
      }
      if (elements.postsCategoryFilter instanceof HTMLSelectElement) {
        elements.postsCategoryFilter.disabled = false;
      }
      if (elements.postsSearchInput instanceof HTMLInputElement) {
        elements.postsSearchInput.disabled = false;
      }
      if (elements.postsClearFilter instanceof HTMLButtonElement) {
        elements.postsClearFilter.disabled = false;
      }
      if (elements.commentsSearchInput instanceof HTMLInputElement) {
        elements.commentsSearchInput.disabled = false;
      }
      if (elements.commentsClearFilter instanceof HTMLButtonElement) {
        elements.commentsClearFilter.disabled = false;
      }
      if (elements.adminNotificationsSearchInput instanceof HTMLInputElement) {
        elements.adminNotificationsSearchInput.disabled = false;
      }
      if (elements.adminNotificationsStatusFilter instanceof HTMLSelectElement) {
        elements.adminNotificationsStatusFilter.disabled = false;
      }
      if (elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement) {
        elements.adminNotificationsSeverityFilter.disabled = false;
      }
      if (elements.adminNotificationsClearFilter instanceof HTMLButtonElement) {
        elements.adminNotificationsClearFilter.disabled = false;
      }
      setRefreshingState(elements, false);
    }
  };

  attachRoleChangeHandlers(elements, refreshDashboard, showFeedback);
  attachUsersFilterHandler(elements);
  attachPostsFilterHandler(elements);
  attachCommentsFilterHandler(elements);
  attachAdminNotificationsFilterHandler(elements, adminSession.user.id);
  attachPopstateHandler(elements);
  attachDeleteHandlers(elements, confirmController, refreshDashboard, showFeedback);
  attachAdminNotificationHandlers(elements, adminSession.user.id, refreshDashboard, showFeedback);

  cleanupAutoRefresh();
  cleanupAdminNotificationsSubscription();

  adminState.unsubscribeAdminNotifications = subscribeToAdminNotifications(async () => {
    await refreshDashboard({ forceRefresh: true });
  });

  adminState.autoRefreshIntervalId = window.setInterval(async () => {
    await refreshDashboard({ forceRefresh: true });
  }, 45000);

  if (window && window.addEventListener) {
    window.addEventListener('beforeunload', () => {
      cleanupAutoRefresh();
      cleanupAdminNotificationsSubscription();
    }, { once: true });
  }

  await refreshDashboard({ forceRefresh: true });
}

loadDashboard();