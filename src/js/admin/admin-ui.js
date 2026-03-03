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
  createConfirmationController,
  createPostEditController
} from './admin-ui-handlers.js';
import {
  formatDate,
  renderAdminNotifications,
  renderCommentsTable,
  renderPostsTable,
  renderUsersTable,
  setVisible
} from './admin-ui-render.js';
import { createAdminFilters } from './admin-ui-filters.js';

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
    previewBody: document.querySelector('[data-preview-body]'),
    editModalElement: document.getElementById('adminEditPostModal'),
    editForm: document.querySelector('[data-admin-edit-form]'),
    editPostIdInput: document.querySelector('[data-admin-edit-post-id]'),
    editTitleInput: document.querySelector('[data-admin-edit-title]'),
    editBodyInput: document.querySelector('[data-admin-edit-body]'),
    editSectionInput: document.querySelector('[data-admin-edit-section]'),
    editCategoryInput: document.querySelector('[data-admin-edit-category]'),
    editImageInput: document.querySelector('[data-admin-edit-image]'),
    editCameraInput: document.querySelector('[data-admin-edit-image-camera]'),
    editCurrentImageSection: document.querySelector('[data-admin-edit-current-image-section]'),
    editCurrentImageList: document.querySelector('[data-admin-edit-current-image-list]'),
    editSaveButton: document.querySelector('[data-admin-edit-save]')
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

  target.textContent = `Последно обновяване: ${formatDate(date.toISOString())}`;
}

function setRefreshingState(elements, isRefreshing) {
  const target = elements.lastUpdatedText || elements.lastUpdated;
  if (!target) {
    return;
  }

  if (elements.lastUpdatedIcon) {
    elements.lastUpdatedIcon.classList.toggle('aqua-spin', isRefreshing);
  }

  target.textContent = isRefreshing ? 'Обновяване...' : target.textContent;
}

function setControlDisabled(elements, disabled) {
  const controls = [
    elements.usersSearchInput,
    elements.usersRoleFilter,
    elements.usersClearFilter,
    elements.postsSearchInput,
    elements.postsCategoryFilter,
    elements.postsClearFilter,
    elements.commentsSearchInput,
    elements.commentsClearFilter,
    elements.adminNotificationsSearchInput,
    elements.adminNotificationsStatusFilter,
    elements.adminNotificationsSeverityFilter,
    elements.adminNotificationsClearFilter
  ];

  controls.forEach((control) => {
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLButtonElement) {
      control.disabled = disabled;
    }
  });
}

function setLoadingVisible(elements, isVisible) {
  [elements.usersLoading, elements.postsLoading, elements.commentsLoading, elements.adminNotificationsLoading].forEach((node) => {
    if (node instanceof HTMLElement) {
      node.classList.toggle('aqua-skeleton-line', isVisible);
    }
  });

  setVisible(elements.usersLoading, isVisible);
  setVisible(elements.postsLoading, isVisible);
  setVisible(elements.commentsLoading, isVisible);
  setVisible(elements.adminNotificationsLoading, isVisible);
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
  const filters = createAdminFilters({
    adminState,
    elements,
    renderUsersTable,
    renderPostsTable,
    renderCommentsTable,
    renderAdminNotifications,
    getCategoryFilterFromQuery,
    setCategoryFilterInQuery
  });

  const refreshDashboard = async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;

    clearFeedback(elements);
    setRefreshingState(elements, true);
    setControlDisabled(elements, true);
    setLoadingVisible(elements, true);

    try {
      const { users, posts, comments, adminNotifications } = await getDashboardData(forceRefresh);

      adminState.users = users;
      adminState.posts = posts;
      adminState.comments = comments;
      adminState.adminNotifications = adminNotifications;

      filters.setPostsFilterOptions(posts);
      filters.renderFilteredUsers();
      filters.renderFilteredPosts();
      filters.renderFilteredComments();
      filters.renderFilteredAdminNotifications(adminSession.user.id);
      setLastUpdated(elements);
    } catch (error) {
      showFeedback(elements, error.message || 'Неуспешно зареждане на админ панела.');
    } finally {
      setLoadingVisible(elements, false);
      setControlDisabled(elements, false);
      setRefreshingState(elements, false);
    }
  };

  const postEditController = createPostEditController(elements, adminSession.user.id, refreshDashboard, showFeedback);

  attachRoleChangeHandlers(elements, refreshDashboard, showFeedback);
  filters.attachUsersFilterHandler();
  filters.attachPostsFilterHandler();
  filters.attachCommentsFilterHandler();
  filters.attachAdminNotificationsFilterHandler(adminSession.user.id);
  filters.attachPopstateHandler();
  attachDeleteHandlers(
    elements,
    confirmController,
    postEditController,
    (postId) => adminState.posts.find((post) => post.id === postId) || null,
    refreshDashboard,
    showFeedback
  );
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