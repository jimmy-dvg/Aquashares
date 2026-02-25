import { requireAuth } from '../auth/auth-guard.js';
import { createPost, createPhotoRecord, deletePost, getPostById, updatePost } from './posts-service.js';
import { deletePostImage, getPublicUrl, uploadPostImage } from '../services/storage-service.js';

function getElements() {
  return {
    form: document.querySelector('[data-post-form]'),
    titleInput: document.querySelector('[data-post-title]'),
    bodyInput: document.querySelector('[data-post-body]'),
    imageInput: document.querySelector('[data-post-image]'),
    errorBox: document.querySelector('[data-post-form-error]'),
    submitButton: document.querySelector('[data-post-submit]'),
    heading: document.querySelector('[data-post-form-title]'),
    loadingBox: document.querySelector('[data-post-form-loading]')
  };
}

function getPostIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('id');
  return value && value.trim() ? value.trim() : null;
}

function showError(errorBox, message) {
  if (!errorBox) {
    return;
  }

  errorBox.textContent = message;
  errorBox.classList.remove('d-none');
}

function clearError(errorBox) {
  if (!errorBox) {
    return;
  }

  errorBox.textContent = '';
  errorBox.classList.add('d-none');
}

function validateForm(title, body) {
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

  return null;
}

function setSubmittingState(submitButton, isSubmitting, isEditMode) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isSubmitting;
  if (isSubmitting) {
    submitButton.textContent = isEditMode ? 'Saving...' : 'Publishing...';
    return;
  }

  submitButton.textContent = isEditMode ? 'Save Changes' : 'Publish Post';
}

function setLoadingState(loadingBox, isLoading) {
  if (!loadingBox) {
    return;
  }

  if (isLoading) {
    loadingBox.classList.remove('d-none');
    return;
  }

  loadingBox.classList.add('d-none');
}

async function prefillFormForEdit(postId, elements) {
  const post = await getPostById(postId);
  elements.titleInput.value = post.title;
  elements.bodyInput.value = post.body;

  if (elements.heading) {
    elements.heading.textContent = 'Edit Post';
  }

  if (elements.submitButton) {
    elements.submitButton.textContent = 'Save Changes';
  }
}

export async function initializePostForm() {
  const elements = getElements();

  if (!elements.form || !elements.titleInput || !elements.bodyInput) {
    return;
  }

  const session = await requireAuth('/login.html');
  if (!session?.user?.id) {
    return;
  }

  const postId = getPostIdFromQuery();
  const isEditMode = Boolean(postId);

  clearError(elements.errorBox);
  setLoadingState(elements.loadingBox, false);

  if (isEditMode) {
    try {
      await prefillFormForEdit(postId, elements);
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to load post for editing.');
      return;
    }
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(elements.errorBox);

    const title = elements.titleInput.value.trim();
    const body = elements.bodyInput.value.trim();

    const validationError = validateForm(title, body);
    if (validationError) {
      showError(elements.errorBox, validationError);
      return;
    }

    setSubmittingState(elements.submitButton, true, isEditMode);
    setLoadingState(elements.loadingBox, true);

    try {
      if (isEditMode) {
        await updatePost(postId, { title, body });
      } else {
        const createdPost = await createPost({
          title,
          body,
          userId: session.user.id
        });

        const file = elements.imageInput?.files?.[0];
        if (file) {
          let storagePath = null;

          try {
            storagePath = await uploadPostImage(file, session.user.id, createdPost.id);
            const publicUrl = getPublicUrl(storagePath);

            await createPhotoRecord({
              postId: createdPost.id,
              userId: session.user.id,
              storagePath,
              publicUrl
            });
          } catch (uploadError) {
            if (storagePath) {
              try {
                await deletePostImage(storagePath);
              } catch {
              }
            }

            try {
              await deletePost(createdPost.id);
            } catch {
            }

            throw uploadError;
          }
        }
      }

      window.location.assign('/index.html');
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to save post.');
      setSubmittingState(elements.submitButton, false, isEditMode);
      setLoadingState(elements.loadingBox, false);
    }
  });
}
