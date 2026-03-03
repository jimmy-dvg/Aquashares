import { requireAuth } from '../auth/auth-guard.js';
import {
  createPost,
  createPhotoRecord,
  deletePhotoRecord,
  deletePost,
  getCategories,
  getPostById,
  updatePost
} from './posts-service.js';
import { deletePostImage, getPublicUrl, uploadPostImage } from '../services/storage-service.js';
import { getScopedCategoryDisplayName } from '../utils/category-icons.js';

function getElements() {
  return {
    form: document.querySelector('[data-post-form]'),
    sectionInput: document.querySelector('[data-post-section]'),
    titleInput: document.querySelector('[data-post-title]'),
    categoryInput: document.querySelector('[data-post-category]'),
    bodyInput: document.querySelector('[data-post-body]'),
    imageInput: document.querySelector('[data-post-image]'),
    cameraInput: document.querySelector('[data-post-image-camera]'),
    currentImageSection: document.querySelector('[data-current-image-section]'),
    currentImageList: document.querySelector('[data-current-image-list]'),
    errorBox: document.querySelector('[data-post-form-error]'),
    submitButton: document.querySelector('[data-post-submit]'),
    cancelButton: document.querySelector('[data-post-cancel]'),
    heading: document.querySelector('[data-post-form-title]'),
    loadingBox: document.querySelector('[data-post-form-loading]')
  };
}

const VALID_SECTIONS = new Set(['forum', 'giveaway', 'exchange', 'wanted']);

const SECTION_OPTIONS = [
  { value: 'forum', label: 'Форум' },
  { value: 'giveaway', label: 'Подарявам' },
  { value: 'exchange', label: 'Разменям' },
  { value: 'wanted', label: 'Търся' }
];

function normalizeSection(section) {
  const normalized = (section || '').trim().toLowerCase();
  return VALID_SECTIONS.has(normalized) ? normalized : '';
}

function getSectionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return normalizeSection(params.get('section'));
}

function getFeedPathBySection(section) {
  if (section === 'giveaway') {
    return '/giveaway.html';
  }

  if (section === 'exchange') {
    return '/exchange.html';
  }

  if (section === 'wanted') {
    return '/wanted.html';
  }

  return '/index.html';
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

function validateForm(title, body, categoryId, categoryRequired) {
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

  if (categoryRequired && !categoryId) {
    return 'Please select a category.';
  }

  return null;
}

function populateSectionSelect(selectElement, selectedSection = 'forum') {
  if (!(selectElement instanceof HTMLSelectElement)) {
    return;
  }

  const normalizedSection = normalizeSection(selectedSection) || 'forum';
  selectElement.replaceChildren();

  SECTION_OPTIONS.forEach((sectionOption) => {
    const option = document.createElement('option');
    option.value = sectionOption.value;
    option.textContent = sectionOption.label;
    selectElement.append(option);
  });

  selectElement.value = normalizedSection;
}

async function loadCategoriesBySection(section) {
  try {
    return await getCategories(section);
  } catch {
    return [];
  }
}

function populateCategorySelect(selectElement, categories, selectedCategoryId = null, isEditMode = false) {
  if (!(selectElement instanceof HTMLSelectElement)) {
    return;
  }

  selectElement.replaceChildren();

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = categories.length ? 'Select category' : 'Uncategorized';
  selectElement.append(placeholderOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = getScopedCategoryDisplayName(category.name, category.slug, category.section);
    selectElement.append(option);
  });

  if (selectedCategoryId) {
    selectElement.value = selectedCategoryId;
    return;
  }

  if (isEditMode) {
    return;
  }

  const fallbackCategory = categories.find((category) => category.slug === 'other') || categories[0] || null;
  if (fallbackCategory?.id) {
    selectElement.value = fallbackCategory.id;
  }
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

function getFilesFromInputs(...inputElements) {
  return inputElements.flatMap((inputElement) => {
    if (!(inputElement instanceof HTMLInputElement) || !inputElement.files?.length) {
      return [];
    }

    return [...inputElement.files];
  });
}

function renderExistingImages(elements, photos) {
  if (!elements.currentImageSection || !elements.currentImageList) {
    return;
  }

  elements.currentImageList.replaceChildren();

  if (!photos.length) {
    elements.currentImageSection.classList.add('d-none');
    return;
  }

  const fragment = document.createDocumentFragment();

  photos.forEach((photo) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6';

    const wrapper = document.createElement('div');
    wrapper.className = 'border rounded p-2 h-100';

    const image = document.createElement('img');
    image.src = photo.publicUrl;
    image.alt = 'Current post image';
    image.className = 'img-fluid rounded mb-2';
    image.style.maxHeight = '220px';
    image.style.objectFit = 'cover';

    const formCheck = document.createElement('div');
    formCheck.className = 'form-check';

    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input';
    checkbox.type = 'checkbox';
    checkbox.id = `remove-photo-${photo.id}`;
    checkbox.dataset.removePhoto = 'true';
    checkbox.dataset.photoId = photo.id;
    checkbox.dataset.photoPath = photo.storagePath;

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.setAttribute('for', checkbox.id);
    label.textContent = 'Delete this image';

    formCheck.append(checkbox, label);
    wrapper.append(image, formCheck);
    col.append(wrapper);
    fragment.append(col);
  });

  elements.currentImageList.append(fragment);
  elements.currentImageSection.classList.remove('d-none');
}

function getSelectedPhotosForRemoval(currentImageList) {
  if (!(currentImageList instanceof HTMLElement)) {
    return [];
  }

  const checkedInputs = currentImageList.querySelectorAll('[data-remove-photo="true"]:checked');

  return [...checkedInputs]
    .map((input) => {
      if (!(input instanceof HTMLInputElement)) {
        return null;
      }

      const photoId = input.dataset.photoId;
      const storagePath = input.dataset.photoPath;

      if (!photoId || !storagePath) {
        return null;
      }

      return {
        id: photoId,
        storagePath
      };
    })
    .filter(Boolean);
}

async function removePhoto(photo) {
  await deletePhotoRecord(photo.id);
  await deletePostImage(photo.storagePath);
}

async function uploadAndCreatePhoto(file, userId, postId) {
  const storagePath = await uploadPostImage(file, userId, postId);
  const publicUrl = getPublicUrl(storagePath);

  const createdPhoto = await createPhotoRecord({
    postId,
    userId,
    storagePath,
    publicUrl
  });

  return {
    ...createdPhoto,
    storagePath
  };
}

async function rollbackPhoto(photo) {
  if (!photo) {
    return;
  }

  if (photo.id) {
    try {
      await deletePhotoRecord(photo.id);
    } catch {
    }
  }

  if (photo.storagePath) {
    try {
      await deletePostImage(photo.storagePath);
    } catch {
    }
  }
}

export async function initializePostForm() {
  const elements = getElements();

  if (!elements.form || !elements.titleInput || !elements.bodyInput || !elements.categoryInput) {
    return;
  }

  const session = await requireAuth('/login.html');
  if (!session?.user?.id) {
    return;
  }

  const postId = getPostIdFromQuery();
  const isEditMode = Boolean(postId);
  const requestedSection = getSectionFromQuery();
  let activeSection = requestedSection;
  let categoryRequired = false;
  let editingPost = null;

  if (isEditMode) {
    try {
      editingPost = await getPostById(postId);
      if (!activeSection) {
        activeSection = normalizeSection(editingPost.categorySection) || 'forum';
      }
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to load post for editing.');
      return;
    }
  }

  if (!activeSection) {
    activeSection = 'forum';
  }

  populateSectionSelect(elements.sectionInput, activeSection);

  let categories = await loadCategoriesBySection(activeSection);

  categoryRequired = categories.length > 0;

  clearError(elements.errorBox);
  setLoadingState(elements.loadingBox, false);
  populateCategorySelect(elements.categoryInput, categories, null, isEditMode);

  if (elements.cancelButton instanceof HTMLAnchorElement) {
    elements.cancelButton.href = getFeedPathBySection(activeSection);
  }

  if (elements.sectionInput instanceof HTMLSelectElement) {
    elements.sectionInput.addEventListener('change', async () => {
      activeSection = normalizeSection(elements.sectionInput.value) || 'forum';

      if (elements.cancelButton instanceof HTMLAnchorElement) {
        elements.cancelButton.href = getFeedPathBySection(activeSection);
      }

      elements.categoryInput.disabled = true;
      categories = await loadCategoriesBySection(activeSection);
      categoryRequired = categories.length > 0;
      populateCategorySelect(elements.categoryInput, categories, null, false);
      elements.categoryInput.disabled = false;

      const params = new URLSearchParams(window.location.search);
      params.set('section', activeSection);
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', nextUrl);
    });
  }

  if (isEditMode) {
    try {
      const post = editingPost;
      elements.titleInput.value = post.title;
      elements.bodyInput.value = post.body;

      if (elements.heading) {
        elements.heading.textContent = 'Edit Post';
      }

      if (elements.submitButton) {
        elements.submitButton.textContent = 'Save Changes';
      }

      populateCategorySelect(elements.categoryInput, categories, post.categoryId, true);
      renderExistingImages(elements, post.photos ?? []);

      if (elements.sectionInput instanceof HTMLSelectElement) {
        elements.sectionInput.value = normalizeSection(post.categorySection) || activeSection;
      }
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to load post for editing.');
      return;
    }
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(elements.errorBox);

    const title = elements.titleInput.value.trim();
    const categoryId = elements.categoryInput.value.trim();
    const body = elements.bodyInput.value.trim();

    const validationError = validateForm(title, body, categoryId, categoryRequired);
    if (validationError) {
      showError(elements.errorBox, validationError);
      return;
    }

    setSubmittingState(elements.submitButton, true, isEditMode);
    setLoadingState(elements.loadingBox, true);

    try {
      if (isEditMode) {
        await updatePost(postId, { title, body, categoryId, section: activeSection || 'forum' });

        const files = getFilesFromInputs(elements.imageInput, elements.cameraInput);
        const photosToRemove = getSelectedPhotosForRemoval(elements.currentImageList);
        const newlyCreatedPhotos = [];

        try {
          for (const file of files) {
            const createdPhoto = await uploadAndCreatePhoto(file, session.user.id, postId);
            newlyCreatedPhotos.push(createdPhoto);
          }
        } catch (uploadError) {
          await Promise.all(newlyCreatedPhotos.map((photo) => rollbackPhoto(photo)));
          throw uploadError;
        }

        for (const photo of photosToRemove) {
          await removePhoto(photo);
        }
      } else {
        const createdPost = await createPost({
          title,
          body,
          categoryId,
          section: activeSection || 'forum',
          userId: session.user.id
        });

        const files = getFilesFromInputs(elements.imageInput, elements.cameraInput);
        const uploadedPhotos = [];

        try {
          for (const file of files) {
            const createdPhoto = await uploadAndCreatePhoto(file, session.user.id, createdPost.id);
            uploadedPhotos.push(createdPhoto);
          }
        } catch (uploadError) {
          await Promise.all(uploadedPhotos.map((photo) => rollbackPhoto(photo)));

          try {
            await deletePost(createdPost.id);
          } catch {
          }

          throw uploadError;
        }
      }

      window.location.assign(getFeedPathBySection(activeSection));
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to save post.');
      setSubmittingState(elements.submitButton, false, isEditMode);
      setLoadingState(elements.loadingBox, false);
    }
  });
}
