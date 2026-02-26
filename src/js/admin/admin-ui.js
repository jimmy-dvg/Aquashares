import {
  changeUserRole,
  deleteComment,
  deletePost,
  getAllComments,
  getAllPosts,
  getAllUsers
} from './admin-service.js';
import { requireAdmin } from '../auth/auth-guard.js';

const adminState = {
  posts: [],
  postsFilterBound: false,
  popstateBound: false,
  cache: {
    users: null,
    posts: null,
    comments: null,
    refreshPromise: null
  }
};

async function getDashboardData(forceRefresh = false) {
  if (!forceRefresh && adminState.cache.users && adminState.cache.posts && adminState.cache.comments) {
    return {
      users: adminState.cache.users,
      posts: adminState.cache.posts,
      comments: adminState.cache.comments
    };
  }

  if (!forceRefresh && adminState.cache.refreshPromise) {
    return adminState.cache.refreshPromise;
  }

  const refreshPromise = (async () => {
    const [users, posts, comments] = await Promise.all([
      getAllUsers(),
      getAllPosts(),
      getAllComments()
    ]);

    adminState.cache.users = users;
    adminState.cache.posts = posts;
    adminState.cache.comments = comments;

    return { users, posts, comments };
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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
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
    usersEmpty: document.querySelector('[data-users-empty]'),
    postsEmpty: document.querySelector('[data-posts-empty]'),
    commentsEmpty: document.querySelector('[data-comments-empty]'),
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

function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text || '';
  return td;
}

function formatUserNameAndEmail(username, email) {
  const safeUsername = username || '-';
  const safeEmail = email || '-';
  return `${safeUsername} (${safeEmail})`;
}

function setVisible(element, isVisible) {
  if (!element) {
    return;
  }

  if (isVisible) {
    element.classList.remove('d-none');
    return;
  }

  element.classList.add('d-none');
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

function createEmptyRow(message, colSpan) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = colSpan;
  cell.className = 'text-secondary text-center';
  cell.textContent = message;
  row.append(cell);
  return row;
}

function createRoleSelect(user) {
  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.dataset.action = 'change-role';
  select.dataset.userId = user.id;

  const userOption = document.createElement('option');
  userOption.value = 'user';
  userOption.textContent = 'user';

  const adminOption = document.createElement('option');
  adminOption.value = 'admin';
  adminOption.textContent = 'admin';

  select.append(userOption, adminOption);
  select.value = user.role === 'admin' ? 'admin' : 'user';
  return select;
}

function createDeleteButton(action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-outline-danger';
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = 'Delete';
  return button;
}

function createActionButton(label, action, id, style = 'btn-outline-primary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-sm ${style}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

export function renderUsersTable(users, elements) {
  if (!elements.usersBody) {
    return;
  }

  elements.usersBody.replaceChildren();

  if (!users.length) {
    elements.usersBody.append(createEmptyRow('No users found.', 5));
    setVisible(elements.usersEmpty, true);
    return;
  }

  setVisible(elements.usersEmpty, false);
  const fragment = document.createDocumentFragment();

  users.forEach((user) => {
    const row = document.createElement('tr');

    row.append(
      createCell(user.username || '-'),
      createCell(user.displayName || '-'),
      createCell(formatUserNameAndEmail(user.username, user.email)),
      createCell(formatDate(user.createdAt))
    );

    const roleCell = document.createElement('td');
    roleCell.append(createRoleSelect(user));
    row.append(roleCell);

    fragment.append(row);
  });

  elements.usersBody.append(fragment);
}

export function renderPostsTable(posts, elements) {
  if (!elements.postsBody) {
    return;
  }

  elements.postsBody.replaceChildren();

  if (!posts.length) {
    elements.postsBody.append(createEmptyRow('No posts found.', 7));
    setVisible(elements.postsEmpty, true);
    return;
  }

  setVisible(elements.postsEmpty, false);
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const row = document.createElement('tr');

    row.append(
      createCell(post.title),
      createCell(post.categoryName || 'Uncategorized'),
      createCell(post.authorUsername),
      createCell(post.authorEmail),
      createCell(post.body.length > 120 ? `${post.body.slice(0, 120)}...` : post.body),
      createCell(formatDate(post.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.className = 'd-flex flex-wrap gap-2';
    actionsCell.append(
      createActionButton('Preview', 'preview-post', post.id, 'btn-outline-secondary'),
      createActionButton('Edit', 'edit-post', post.id, 'btn-outline-primary'),
      createDeleteButton('delete-post', post.id)
    );
    row.append(actionsCell);

    row.dataset.postId = post.id;
    row.dataset.postTitle = post.title;
    row.dataset.postBody = post.body;
    row.dataset.postAuthorUsername = post.authorUsername;
    row.dataset.postAuthorEmail = post.authorEmail;
    row.dataset.postCreatedAt = post.createdAt;

    fragment.append(row);
  });

  elements.postsBody.append(fragment);
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

export function renderCommentsTable(comments, elements) {
  if (!elements.commentsBody) {
    return;
  }

  elements.commentsBody.replaceChildren();

  if (!comments.length) {
    elements.commentsBody.append(createEmptyRow('No comments found.', 6));
    setVisible(elements.commentsEmpty, true);
    return;
  }

  setVisible(elements.commentsEmpty, false);
  const fragment = document.createDocumentFragment();

  comments.forEach((comment) => {
    const row = document.createElement('tr');

    const authorDisplay = `${comment.authorUsername} (${comment.authorEmail})`;

    row.append(
      createCell(comment.postTitle),
      createCell(authorDisplay),
      createCell(comment.body.length > 120 ? `${comment.body.slice(0, 120)}...` : comment.body),
      createCell(formatDate(comment.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.append(createDeleteButton('delete-comment', comment.id));
    row.append(actionsCell);

    fragment.append(row);
  });

  elements.commentsBody.append(fragment);
}

function createConfirmationController(elements) {
  let pendingAction = null;
  const modalInstance = elements.confirmModalElement
    ? new window.bootstrap.Modal(elements.confirmModalElement)
    : null;

  if (elements.confirmAction) {
    elements.confirmAction.addEventListener('click', async () => {
      if (!pendingAction) {
        return;
      }

      const action = pendingAction;
      pendingAction = null;
      elements.confirmAction.disabled = true;

      try {
        await action();
      } finally {
        elements.confirmAction.disabled = false;
        modalInstance?.hide();
      }
    });
  }

  return {
    show(title, text, action) {
      if (!modalInstance || !elements.confirmTitle || !elements.confirmText || !elements.confirmAction) {
        return;
      }

      elements.confirmTitle.textContent = title;
      elements.confirmText.textContent = text;
      pendingAction = action;
      modalInstance.show();
    }
  };
}

function attachRoleChangeHandlers(elements, refreshDashboard) {
  if (!elements.usersBody || elements.usersBody.dataset.roleBound === 'true') {
    return;
  }

  elements.usersBody.dataset.roleBound = 'true';
  elements.usersBody.addEventListener('change', async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement) || target.dataset.action !== 'change-role') {
      return;
    }

    const userId = target.dataset.userId;
    const nextRole = target.value;

    if (!userId) {
      return;
    }

    const previousRole = target.dataset.currentRole || target.value;
    target.disabled = true;

    try {
      await changeUserRole(userId, nextRole);
      target.dataset.currentRole = nextRole;
      showFeedback(elements, 'User role updated successfully.', 'success');
      await refreshDashboard({ forceRefresh: true });
    } catch (error) {
      target.value = previousRole;
      showFeedback(elements, error.message || 'Unable to update role.');
    } finally {
      target.disabled = false;
    }
  });
}

function attachDeleteHandlers(elements, confirmController, refreshDashboard) {
  if (elements.postsBody && elements.postsBody.dataset.deleteBound !== 'true') {
    elements.postsBody.dataset.deleteBound = 'true';
    elements.postsBody.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const previewButton = target.closest('[data-action="preview-post"]');
      if (previewButton instanceof HTMLButtonElement) {
        const row = previewButton.closest('tr');
        if (row instanceof HTMLTableRowElement && elements.previewModalElement) {
          if (elements.previewTitle) {
            elements.previewTitle.textContent = row.dataset.postTitle || '';
          }

          if (elements.previewMeta) {
            const username = row.dataset.postAuthorUsername || '-';
            const email = row.dataset.postAuthorEmail || '-';
            const createdAt = formatDate(row.dataset.postCreatedAt || '');
            elements.previewMeta.textContent = `By ${username} (${email}) • ${createdAt}`;
          }

          if (elements.previewBody) {
            elements.previewBody.textContent = row.dataset.postBody || '';
          }

          const modal = new window.bootstrap.Modal(elements.previewModalElement);
          modal.show();
        }
        return;
      }

      const editButton = target.closest('[data-action="edit-post"]');
      if (editButton instanceof HTMLButtonElement) {
        const postId = editButton.dataset.id;
        if (postId) {
          window.location.assign(`/post-create.html?id=${encodeURIComponent(postId)}`);
        }
        return;
      }

      const button = target.closest('[data-action="delete-post"]');
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const postId = button.dataset.id;
      if (!postId) {
        return;
      }

      confirmController.show(
        'Delete Post',
        'Are you sure you want to delete this post? This action cannot be undone.',
        async () => {
          try {
            await deletePost(postId);
            showFeedback(elements, 'Post deleted successfully.', 'success');
            await refreshDashboard({ forceRefresh: true });
          } catch (error) {
            showFeedback(elements, error.message || 'Unable to delete post.');
          }
        }
      );
    });
  }

  if (elements.commentsBody && elements.commentsBody.dataset.deleteBound !== 'true') {
    elements.commentsBody.dataset.deleteBound = 'true';
    elements.commentsBody.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest('[data-action="delete-comment"]');
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const commentId = button.dataset.id;
      if (!commentId) {
        return;
      }

      confirmController.show(
        'Delete Comment',
        'Are you sure you want to delete this comment? This action cannot be undone.',
        async () => {
          try {
            await deleteComment(commentId);
            showFeedback(elements, 'Comment deleted successfully.', 'success');
            await refreshDashboard({ forceRefresh: true });
          } catch (error) {
            showFeedback(elements, error.message || 'Unable to delete comment.');
          }
        }
      );
    });
  }
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

    try {
      const { users, posts, comments } = await getDashboardData(forceRefresh);

      adminState.posts = posts;
      renderUsersTable(users, elements);
      setPostsFilterOptions(posts, elements);
      renderFilteredPosts(elements);
      renderCommentsTable(comments, elements);
      setLastUpdated(elements);
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to load admin dashboard.');
    } finally {
      setVisible(elements.usersLoading, false);
      setVisible(elements.postsLoading, false);
      setVisible(elements.commentsLoading, false);
      if (elements.postsCategoryFilter instanceof HTMLSelectElement) {
        elements.postsCategoryFilter.disabled = false;
      }
      if (elements.postsClearFilter instanceof HTMLButtonElement) {
        elements.postsClearFilter.disabled = false;
      }
      setRefreshingState(elements, false);
    }
  };

  attachRoleChangeHandlers(elements, refreshDashboard);
  attachPostsFilterHandler(elements);
  attachPopstateHandler(elements);
  attachDeleteHandlers(elements, confirmController, refreshDashboard);
  await refreshDashboard({ forceRefresh: true });
}

loadDashboard();