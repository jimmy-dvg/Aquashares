import { changeUserRole, deleteComment, deletePost } from './admin-service.js';
import { formatDate } from './admin-ui-render.js';

export function createConfirmationController(elements) {
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

export function attachRoleChangeHandlers(elements, refreshDashboard, showFeedback) {
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

export function attachDeleteHandlers(elements, confirmController, refreshDashboard, showFeedback) {
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
