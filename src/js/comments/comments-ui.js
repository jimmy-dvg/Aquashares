import {
  createComment,
  deleteComment,
  getCommentsByPostId,
  subscribeToPostComments,
  updateComment
} from './comments-service.js';
import { showCommentActionModal, showCommentErrorDialog } from './comments-action-modal.js';

const realtimeSubscriptions = new Map();
const pollingIntervals = new Map();
const commentsState = {
  viewerUserId: null
};

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

function createEmptyCommentItem() {
  const empty = document.createElement('div');
  empty.className = 'text-secondary small';
  empty.textContent = 'No comments yet.';
  return empty;
}

async function handleDeleteCommentAction(comment, listElement) {
  const result = await showCommentActionModal({
    mode: 'confirm',
    title: 'Delete Comment',
    message: 'Are you sure you want to delete this comment? This action cannot be undone.',
    confirmLabel: 'Delete',
    confirmClass: 'btn-danger',
    cancelLabel: 'Cancel'
  });

  if (!result.confirmed) {
    return;
  }

  await deleteComment(comment.id);
  await loadPostComments(comment.postId, listElement);
}

async function handleEditCommentAction(comment, listElement) {
  const result = await showCommentActionModal({
    mode: 'input',
    title: 'Edit Comment',
    message: 'Update your comment text:',
    initialValue: comment.body || '',
    placeholder: 'Write your updated comment...',
    confirmLabel: 'Save',
    confirmClass: 'btn-primary',
    cancelLabel: 'Cancel'
  });

  if (!result.confirmed || typeof result.value !== 'string') {
    return;
  }

  await updateComment(comment.id, result.value.trim());
  await loadPostComments(comment.postId, listElement);
}

function renderCommentItem(comment, listElement) {
  const wrapper = document.createElement('article');
  wrapper.className = 'border rounded p-2';
  wrapper.id = `comment-${comment.id}`;
  wrapper.dataset.commentId = comment.id;
  wrapper.dataset.commentPostId = comment.postId;
  wrapper.dataset.commentBody = comment.body;
  wrapper.dataset.commentOwnerId = comment.userId;

  const author = document.createElement('a');
  author.className = 'fw-semibold small text-decoration-none';
  author.href = `/profile.html?user=${encodeURIComponent(comment.userId)}`;
  author.textContent = comment.authorUsername
    ? `@${comment.authorUsername}`
    : (comment.authorName || 'User');

  const body = document.createElement('p');
  body.className = 'mb-1 small';
  body.textContent = comment.body;

  const meta = document.createElement('div');
  meta.className = 'text-secondary small d-flex justify-content-between align-items-center gap-2';
  meta.textContent = formatDate(comment.createdAt);

  if (commentsState.viewerUserId && comment.userId === commentsState.viewerUserId) {
    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn-sm btn-link p-0';
    editButton.dataset.action = 'edit-comment';
    editButton.dataset.commentId = comment.id;
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', async () => {
      editButton.disabled = true;
      try {
        await handleEditCommentAction(comment, listElement);
      } catch (error) {
        await showCommentErrorDialog(error.message || 'Unable to update comment.');
      } finally {
        editButton.disabled = false;
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-sm btn-link text-danger p-0';
    deleteButton.dataset.action = 'delete-comment';
    deleteButton.dataset.commentId = comment.id;
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      try {
        await handleDeleteCommentAction(comment, listElement);
      } catch (error) {
        await showCommentErrorDialog(error.message || 'Unable to delete comment.');
      } finally {
        deleteButton.disabled = false;
      }
    });

    actions.append(editButton, deleteButton);
    meta.append(actions);
  }

  wrapper.append(author, body, meta);
  return wrapper;
}

function renderCommentList(comments, listElement) {
  listElement.replaceChildren();

  if (!comments.length) {
    listElement.append(createEmptyCommentItem());
    return;
  }

  const fragment = document.createDocumentFragment();
  comments.forEach((comment) => {
    fragment.append(renderCommentItem(comment, listElement));
  });

  listElement.append(fragment);
}

async function loadPostComments(postId, listElement) {
  const comments = await getCommentsByPostId(postId);
  renderCommentList(comments, listElement);
}

function bindRealtimeForPost(postId, listElement) {
  if (!postId || realtimeSubscriptions.has(postId)) {
    return;
  }

  const unsubscribe = subscribeToPostComments(postId, async () => {
    try {
      await loadPostComments(postId, listElement);
    } catch {
    }
  });

  realtimeSubscriptions.set(postId, unsubscribe);
}

function bindPollingForPost(postId, listElement) {
  if (!postId || pollingIntervals.has(postId)) {
    return;
  }

  const intervalId = window.setInterval(async () => {
    if (!document.body.contains(listElement)) {
      return;
    }

    try {
      await loadPostComments(postId, listElement);
    } catch {
    }
  }, 4000);

  pollingIntervals.set(postId, intervalId);
}

export function cleanupCommentsUi() {
  realtimeSubscriptions.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });

  realtimeSubscriptions.clear();

  pollingIntervals.forEach((intervalId) => {
    window.clearInterval(intervalId);
  });

  pollingIntervals.clear();
}

function setFormSubmittingState(submitButton, textarea, isSubmitting) {
  submitButton.disabled = isSubmitting;
  textarea.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Posting...' : 'Post Comment';
}

function clearFormFeedback(form) {
  const feedback = form.querySelector('[data-comment-form-feedback]');
  if (!feedback) {
    return;
  }

  feedback.classList.add('d-none');
  feedback.textContent = '';
}

function setFormFeedback(form, message) {
  const feedback = form.querySelector('[data-comment-form-feedback]');
  if (!feedback) {
    return;
  }

  feedback.classList.remove('d-none');
  feedback.textContent = message;
}

export async function initializeCommentsUi(container, userId) {
  if (!container) {
    return;
  }

  commentsState.viewerUserId = userId || null;

  const lists = container.querySelectorAll('[data-comments-list][data-post-id]');

  await Promise.all(
    [...lists].map(async (listElement) => {
      const postId = listElement.dataset.postId;
      if (!postId) {
        return;
      }

      try {
        await loadPostComments(postId, listElement);
        bindRealtimeForPost(postId, listElement);
        bindPollingForPost(postId, listElement);
      } catch {
        listElement.replaceChildren();
        const error = document.createElement('div');
        error.className = 'text-danger small';
        error.textContent = 'Unable to load comments.';
        listElement.append(error);
      }
    })
  );

  if (userId && container.dataset.commentFormBound !== 'true') {
    container.dataset.commentFormBound = 'true';

    container.addEventListener('submit', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || target.dataset.commentForm !== 'true') {
        return;
      }

      event.preventDefault();
      clearFormFeedback(target);

      const postId = target.dataset.postId;
      const textarea = target.querySelector('[data-comment-input]');
      const submitButton = target.querySelector('[data-comment-submit]');

      if (!postId || !(textarea instanceof HTMLTextAreaElement) || !(submitButton instanceof HTMLButtonElement)) {
        return;
      }

      const body = textarea.value.trim();

      if (!body) {
        setFormFeedback(target, 'Comment cannot be empty.');
        return;
      }

      if (body.length > 1000) {
        setFormFeedback(target, 'Comment must be 1000 characters or less.');
        return;
      }

      setFormSubmittingState(submitButton, textarea, true);

      try {
        const createdComment = await createComment({
          postId,
          userId,
          body
        });

        textarea.value = '';

        const listElement = container.querySelector(`[data-comments-list][data-post-id="${postId}"]`);
        if (listElement instanceof HTMLElement) {
          const emptyState = listElement.querySelector('.text-secondary.small');
          if (emptyState?.textContent === 'No comments yet.') {
            listElement.replaceChildren();
          }

          listElement.append(renderCommentItem({
            ...createdComment,
            authorName: 'You'
          }));

          await loadPostComments(postId, listElement);
        }
      } catch (error) {
        setFormFeedback(target, error.message || 'Unable to post comment.');
      } finally {
        setFormSubmittingState(submitButton, textarea, false);
      }
    });
  }

}

export function createCommentsBlock(postId, isAuthenticated) {
  const section = document.createElement('section');
  section.className = 'mt-3 pt-3 border-top';

  const title = document.createElement('h3');
  title.className = 'h6 mb-2';
  title.textContent = 'Comments';

  const list = document.createElement('div');
  list.className = 'd-flex flex-column gap-2 mb-2';
  list.dataset.commentsList = 'true';
  list.dataset.postId = postId;

  if (isAuthenticated) {
    const form = document.createElement('form');
    form.className = 'd-flex flex-column gap-2';
    form.dataset.commentForm = 'true';
    form.dataset.postId = postId;

    const textarea = document.createElement('textarea');
    textarea.className = 'form-control form-control-sm';
    textarea.rows = 2;
    textarea.maxLength = 1000;
    textarea.placeholder = 'Write a comment...';
    textarea.setAttribute('aria-label', 'Comment text');
    textarea.dataset.commentInput = 'true';

    const actions = document.createElement('div');
    actions.className = 'd-flex justify-content-between align-items-center';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-sm btn-primary';
    submitButton.textContent = 'Post Comment';
    submitButton.dataset.commentSubmit = 'true';

    const feedback = document.createElement('div');
    feedback.className = 'text-danger small d-none';
    feedback.dataset.commentFormFeedback = 'true';

    actions.append(submitButton);
    form.append(textarea, actions, feedback);

    section.append(title, list, form);
    return section;
  }

  const loginHint = document.createElement('p');
  loginHint.className = 'small text-secondary mb-0';
  loginHint.textContent = 'Log in to add a comment.';

  section.append(title, list, loginHint);
  return section;
}
