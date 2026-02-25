import {
  changeUserRole,
  deleteComment,
  deletePost,
  getAllComments,
  getAllPosts,
  getAllUsers
} from './admin-service.js';
import { requireAdmin } from '../auth/auth-guard.js';

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
    commentsBody: document.querySelector('[data-comments-body]'),
    usersEmpty: document.querySelector('[data-users-empty]'),
    postsEmpty: document.querySelector('[data-posts-empty]'),
    commentsEmpty: document.querySelector('[data-comments-empty]'),
    confirmModalElement: document.getElementById('adminConfirmModal'),
    confirmTitle: document.querySelector('[data-confirm-title]'),
    confirmText: document.querySelector('[data-confirm-text]'),
    confirmAction: document.querySelector('[data-confirm-action]')
  };
}

function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text || '';
  return td;
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
      createCell(user.id),
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
    elements.postsBody.append(createEmptyRow('No posts found.', 5));
    setVisible(elements.postsEmpty, true);
    return;
  }

  setVisible(elements.postsEmpty, false);
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const row = document.createElement('tr');

    row.append(
      createCell(post.title),
      createCell(post.userId),
      createCell(post.body.length > 120 ? `${post.body.slice(0, 120)}...` : post.body),
      createCell(formatDate(post.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.append(createDeleteButton('delete-post', post.id));
    row.append(actionsCell);

    fragment.append(row);
  });

  elements.postsBody.append(fragment);
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

    row.append(
      createCell(comment.postId),
      createCell(comment.userId),
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
      await refreshDashboard();
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
            await refreshDashboard();
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
            await refreshDashboard();
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

  const refreshDashboard = async () => {
    clearFeedback(elements);
    setVisible(elements.usersLoading, true);
    setVisible(elements.postsLoading, true);
    setVisible(elements.commentsLoading, true);

    try {
      const [users, posts, comments] = await Promise.all([
        getAllUsers(),
        getAllPosts(),
        getAllComments()
      ]);

      renderUsersTable(users, elements);
      renderPostsTable(posts, elements);
      renderCommentsTable(comments, elements);
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to load admin dashboard.');
    } finally {
      setVisible(elements.usersLoading, false);
      setVisible(elements.postsLoading, false);
      setVisible(elements.commentsLoading, false);
    }
  };

  attachRoleChangeHandlers(elements, refreshDashboard);
  attachDeleteHandlers(elements, confirmController, refreshDashboard);
  await refreshDashboard();
}

loadDashboard();