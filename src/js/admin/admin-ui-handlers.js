import {
  assignAdminNotification,
  changeUserRole,
  deleteComment,
  deletePost,
  getAdminCategories,
  updatePostByAdmin,
  resolveAdminNotification
} from './admin-service.js';
import { formatDate } from './admin-ui-render.js';
import {
  getFilesFromInputs,
  getSelectedPhotosForRemoval,
  removePhoto,
  renderExistingModalImages,
  rollbackPhoto,
  uploadAndCreatePhoto
} from '../posts/posts-ui-edit-utils.js';

function normalizePostPayload(payload) {
  const title = (payload.title || '').trim();
  const body = (payload.body || '').trim();
  const categoryId = (payload.categoryId || '').trim();
  const section = (payload.section || '').trim();
  return { title, body, categoryId, section };
}

export function createPostEditController(elements, currentAdminId, refreshDashboard, showFeedback) {
  const VALID_SECTIONS = ['forum', 'giveaway', 'exchange', 'wanted'];

  const SECTION_LABELS = {
    forum: 'Форум',
    giveaway: 'Подарявам',
    exchange: 'Разменям',
    wanted: 'Търся'
  };

  let currentPostId = '';
  let currentPost = null;
  const categoriesBySection = new Map();

  const modalInstance = elements.editModalElement
    ? new window.bootstrap.Modal(elements.editModalElement)
    : null;

  async function ensureSectionCategories(section) {
    const normalizedSection = VALID_SECTIONS.includes(section) ? section : 'forum';
    if (categoriesBySection.has(normalizedSection)) {
      return categoriesBySection.get(normalizedSection) || [];
    }

    const categories = await getAdminCategories(normalizedSection);
    categoriesBySection.set(normalizedSection, categories);
    return categories;
  }

  function populateSectionSelect(selectedSection) {
    if (!(elements.editSectionInput instanceof HTMLSelectElement)) {
      return;
    }

    elements.editSectionInput.replaceChildren();
    VALID_SECTIONS.forEach((section) => {
      const option = document.createElement('option');
      option.value = section;
      option.textContent = SECTION_LABELS[section] || section;
      elements.editSectionInput.append(option);
    });

    elements.editSectionInput.value = VALID_SECTIONS.includes(selectedSection) ? selectedSection : 'forum';
  }

  function populateCategorySelect(categories, selectedCategoryId) {
    if (!(elements.editCategoryInput instanceof HTMLSelectElement)) {
      return;
    }

    elements.editCategoryInput.replaceChildren();

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = categories.length ? 'Избери категория' : 'Без категория';
    elements.editCategoryInput.append(placeholder);

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      elements.editCategoryInput.append(option);
    });

    if (selectedCategoryId) {
      elements.editCategoryInput.value = selectedCategoryId;
      return;
    }

    const fallback = categories.find((category) => category.slug === 'other') || categories[0] || null;
    if (fallback?.id) {
      elements.editCategoryInput.value = fallback.id;
    }
  }

  function validatePayload(payload, categories) {
    if (!payload.title || payload.title.length < 3) {
      return 'Заглавието трябва да е поне 3 символа.';
    }
    if (payload.title.length > 120) {
      return 'Заглавието трябва да е до 120 символа.';
    }
    if (!payload.body || payload.body.length < 10) {
      return 'Съдържанието трябва да е поне 10 символа.';
    }
    if (payload.body.length > 5000) {
      return 'Съдържанието трябва да е до 5000 символа.';
    }
    if ((categories || []).length > 0 && !payload.categoryId) {
      return 'Моля, избери категория.';
    }

    return null;
  }

  async function handleSectionChange() {
    if (!(elements.editSectionInput instanceof HTMLSelectElement) || !currentPost) {
      return;
    }

    const section = VALID_SECTIONS.includes(elements.editSectionInput.value)
      ? elements.editSectionInput.value
      : 'forum';

    const categories = await ensureSectionCategories(section);
    populateCategorySelect(categories, currentPost.section === section ? currentPost.categoryId : '');
  }

  if (elements.editSectionInput && elements.editSectionInput.dataset.bound !== 'true') {
    elements.editSectionInput.dataset.bound = 'true';
    elements.editSectionInput.addEventListener('change', async () => {
      try {
        await handleSectionChange();
      } catch (error) {
        showFeedback(elements, error.message || 'Неуспешно зареждане на категориите.');
      }
    });
  }

  if (elements.editForm && elements.editForm.dataset.bound !== 'true') {
    elements.editForm.dataset.bound = 'true';
    elements.editForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!(elements.editTitleInput instanceof HTMLInputElement)
        || !(elements.editBodyInput instanceof HTMLTextAreaElement)
        || !(elements.editSectionInput instanceof HTMLSelectElement)
        || !(elements.editCategoryInput instanceof HTMLSelectElement)
        || !(elements.editSaveButton instanceof HTMLButtonElement)
        || !currentPostId
        || !currentPost) {
        return;
      }

      const selectedSection = VALID_SECTIONS.includes(elements.editSectionInput.value)
        ? elements.editSectionInput.value
        : 'forum';

      const categories = await ensureSectionCategories(selectedSection);

      const payload = normalizePostPayload({
        title: elements.editTitleInput.value,
        body: elements.editBodyInput.value,
        categoryId: elements.editCategoryInput.value,
        section: selectedSection
      });

      const validationError = validatePayload(payload, categories);
      if (validationError) {
        showFeedback(elements, validationError);
        return;
      }

      elements.editSaveButton.disabled = true;

      try {
        await updatePostByAdmin(currentPostId, payload);

        const files = getFilesFromInputs(elements.editImageInput, elements.editCameraInput);
        const photosToRemove = getSelectedPhotosForRemoval(elements.editCurrentImageList);
        const createdPhotos = [];

        try {
          for (const file of files) {
            const createdPhoto = await uploadAndCreatePhoto(file, currentAdminId, currentPostId);
            createdPhotos.push(createdPhoto);
          }
        } catch (uploadError) {
          await Promise.all(createdPhotos.map((photo) => rollbackPhoto(photo)));
          throw uploadError;
        }

        for (const photo of photosToRemove) {
          await removePhoto(photo);
        }

        modalInstance?.hide();
        showFeedback(elements, 'Публикацията е редактирана успешно.', 'success');
        await refreshDashboard({ forceRefresh: true });
      } catch (error) {
        showFeedback(elements, error.message || 'Неуспешно редактиране на публикацията.');
      } finally {
        elements.editSaveButton.disabled = false;
      }
    });
  }

  return {
    async open(post) {
      if (!modalInstance
        || !(elements.editTitleInput instanceof HTMLInputElement)
        || !(elements.editBodyInput instanceof HTMLTextAreaElement)) {
        return;
      }

      currentPost = post;
      currentPostId = post.id;
      elements.editTitleInput.value = post.title || '';
      elements.editBodyInput.value = post.body || '';

      if (elements.editPostIdInput instanceof HTMLInputElement) {
        elements.editPostIdInput.value = post.id || '';
      }

      const section = VALID_SECTIONS.includes(post.section) ? post.section : 'forum';
      populateSectionSelect(section);

      const categories = await ensureSectionCategories(section);
      populateCategorySelect(categories, post.categoryId || '');
      renderExistingModalImages(elements.editCurrentImageSection, elements.editCurrentImageList, post.photos || []);

      if (elements.editImageInput instanceof HTMLInputElement) {
        elements.editImageInput.value = '';
      }

      if (elements.editCameraInput instanceof HTMLInputElement) {
        elements.editCameraInput.value = '';
      }

      modalInstance.show();
    }
  };
}

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

export function attachDeleteHandlers(
  elements,
  confirmController,
  postEditController,
  getPostById,
  refreshDashboard,
  showFeedback
) {
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
          const post = getPostById(postId);
          if (post) {
            postEditController.open(post).catch((error) => {
              showFeedback(elements, error.message || 'Неуспешно отваряне на редакцията.');
            });
          }
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

export function attachAdminNotificationHandlers(elements, currentAdminId, refreshDashboard, showFeedback) {
  if (!elements.adminNotificationsList || elements.adminNotificationsList.dataset.notificationBound === 'true') {
    return;
  }

  elements.adminNotificationsList.dataset.notificationBound = 'true';
  elements.adminNotificationsList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const assignButton = target.closest('[data-action="assign-admin-notification"]');
    if (assignButton instanceof HTMLButtonElement) {
      const notificationId = assignButton.dataset.id;
      if (!notificationId || !currentAdminId) {
        return;
      }

      assignButton.disabled = true;
      try {
        await assignAdminNotification(notificationId, currentAdminId);
        showFeedback(elements, 'Notification assigned to you.', 'success');
        await refreshDashboard({ forceRefresh: true });
      } catch (error) {
        showFeedback(elements, error.message || 'Unable to assign notification.');
      } finally {
        assignButton.disabled = false;
      }

      return;
    }

    const resolveButton = target.closest('[data-action="resolve-admin-notification"]');
    if (!(resolveButton instanceof HTMLButtonElement)) {
      return;
    }

    const notificationId = resolveButton.dataset.id;
    if (!notificationId || !currentAdminId) {
      return;
    }

    resolveButton.disabled = true;
    try {
      await resolveAdminNotification(notificationId, currentAdminId);
      showFeedback(elements, 'Notification resolved.', 'success');
      await refreshDashboard({ forceRefresh: true });
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to resolve notification.');
    } finally {
      resolveButton.disabled = false;
    }
  });
}
