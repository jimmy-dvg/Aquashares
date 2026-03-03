import { requireAuth } from '../auth/auth-guard.js';
import {
  createPost,
  deletePost,
  getCategories,
  getPostById,
  updatePost
} from './posts-service.js';
import { getScopedCategoryDisplayName } from '../utils/category-icons.js';
import {
  getFilesFromInputs,
  getSelectedPhotosForRemoval,
  removePhoto,
  renderExistingModalImages,
  rollbackPhoto,
  uploadAndCreatePhoto
} from './posts-ui-edit-utils.js';

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
    return 'Заглавието трябва да е поне 3 символа.';
  }

  if (title.length > 120) {
    return 'Заглавието трябва да е до 120 символа.';
  }

  if (!body || body.length < 10) {
    return 'Съдържанието трябва да е поне 10 символа.';
  }

  if (body.length > 5000) {
    return 'Съдържанието трябва да е до 5000 символа.';
  }

  if (categoryRequired && !categoryId) {
    return 'Моля, избери категория.';
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
  placeholderOption.textContent = categories.length ? 'Избери категория' : 'Без категория';
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
    submitButton.textContent = isEditMode ? 'Запазване...' : 'Публикуване...';
    return;
  }

  submitButton.textContent = isEditMode ? 'Запази промените' : 'Публикувай';
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
      showError(elements.errorBox, error.message || 'Неуспешно зареждане на публикацията за редакция.');
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
        elements.heading.textContent = 'Редакция на публикация';
      }

      if (elements.submitButton) {
        elements.submitButton.textContent = 'Запази промените';
      }

      populateCategorySelect(elements.categoryInput, categories, post.categoryId, true);
      renderExistingModalImages(elements.currentImageSection, elements.currentImageList, post.photos ?? []);

      if (elements.sectionInput instanceof HTMLSelectElement) {
        elements.sectionInput.value = normalizeSection(post.categorySection) || activeSection;
      }
    } catch (error) {
      showError(elements.errorBox, error.message || 'Неуспешно зареждане на публикацията за редакция.');
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
      showError(elements.errorBox, error.message || 'Неуспешно запазване на публикацията.');
      setSubmittingState(elements.submitButton, false, isEditMode);
      setLoadingState(elements.loadingBox, false);
    }
  });
}
