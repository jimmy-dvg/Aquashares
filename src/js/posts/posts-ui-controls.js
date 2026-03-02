import { getAllCategoriesLabel, getCategoryLabelWithEmoji } from '../utils/category-icons.js';

let categoriesBound = false;
let popstateBound = false;

export function getUiElements() {
  return {
    feedContainer: document.querySelector('[data-feed-list]'),
    loadingElement: document.querySelector('[data-feed-loading]'),
    errorElement: document.querySelector('[data-feed-error]'),
    notificationRoot: document.querySelector('[data-feed-notifications]'),
    searchInput: document.querySelector('[data-feed-search]'),
    categoryFilter: document.querySelector('[data-feed-category-filter]'),
    clearFilterButton: document.querySelector('[data-feed-clear-filter]'),
    filterStatus: document.querySelector('[data-feed-filter-status]')
  };
}

export function updateFeedFilterUi(filterElement, searchInput, clearFilterButton, filterStatus, categories, filteredCount, totalCount) {
  const query = searchInput instanceof HTMLInputElement ? (searchInput.value || '').trim() : '';
  const selectedSlug = filterElement instanceof HTMLSelectElement ? filterElement.value || '' : '';
  const hasFilter = Boolean(selectedSlug || query);

  if (clearFilterButton) {
    clearFilterButton.classList.toggle('d-none', !hasFilter);
  }

  if (!filterStatus) {
    return;
  }

  if (!hasFilter) {
    filterStatus.textContent = '';
    filterStatus.classList.add('d-none');
    return;
  }

  const labels = [];

  if (selectedSlug) {
    const categoryName = (categories || []).find((category) => category.slug === selectedSlug)?.name || 'Selected category';
    labels.push(`category: ${categoryName}`);
  }

  if (query) {
    labels.push(`search: "${query}"`);
  }

  if (typeof filteredCount === 'number' && typeof totalCount === 'number') {
    labels.push(`${filteredCount}/${totalCount} posts`);
  }

  filterStatus.textContent = `Filtering by ${labels.join(' • ')}`;
  filterStatus.classList.remove('d-none');
}

export function setCategoryFilterOptions(filterElement, categories, selectedSlug) {
  if (!(filterElement instanceof HTMLSelectElement)) {
    return;
  }

  const previousValue = selectedSlug || filterElement.value || '';
  filterElement.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = getAllCategoriesLabel();
  filterElement.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.slug;
    option.textContent = getCategoryLabelWithEmoji(category.name, category.slug);
    filterElement.append(option);
  });

  const hasCurrentValue = categories.some((category) => category.slug === previousValue);
  filterElement.value = hasCurrentValue ? previousValue : '';
}

export function bindCategoryFilter(filterElement, clearFilterButton, onChange) {
  if (!(filterElement instanceof HTMLSelectElement) || categoriesBound) {
    return;
  }

  categoriesBound = true;
  filterElement.addEventListener('change', () => {
    onChange(filterElement.value || '');
  });
}

export function bindFeedPopstate(onChange) {
  if (popstateBound) {
    return;
  }

  popstateBound = true;
  window.addEventListener('popstate', () => {
    if (!window.location.pathname.endsWith('/index.html') && window.location.pathname !== '/') {
      return;
    }

    onChange();
  });
}

export function setLoadingState(isLoading, loadingElement) {
  if (!loadingElement) {
    return;
  }

  if (isLoading) {
    loadingElement.classList.remove('d-none');
    return;
  }

  loadingElement.classList.add('d-none');
}

export function clearError(errorElement) {
  if (!errorElement) {
    return;
  }

  errorElement.classList.add('d-none');
  errorElement.textContent = '';
}

export function showError(errorElement, message) {
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
}
