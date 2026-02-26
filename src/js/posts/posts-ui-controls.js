let categoriesBound = false;
let popstateBound = false;

export function getUiElements() {
  return {
    feedContainer: document.querySelector('[data-feed-list]'),
    loadingElement: document.querySelector('[data-feed-loading]'),
    errorElement: document.querySelector('[data-feed-error]'),
    notificationRoot: document.querySelector('[data-feed-notifications]'),
    categoryFilter: document.querySelector('[data-feed-category-filter]'),
    clearFilterButton: document.querySelector('[data-feed-clear-filter]'),
    filterStatus: document.querySelector('[data-feed-filter-status]')
  };
}

export function updateFeedFilterUi(filterElement, clearFilterButton, filterStatus, categories) {
  const selectedSlug = filterElement instanceof HTMLSelectElement ? filterElement.value || '' : '';

  if (clearFilterButton) {
    clearFilterButton.classList.toggle('d-none', !selectedSlug);
  }

  if (!filterStatus) {
    return;
  }

  if (!selectedSlug) {
    filterStatus.textContent = '';
    filterStatus.classList.add('d-none');
    return;
  }

  const categoryName = (categories || []).find((category) => category.slug === selectedSlug)?.name || 'Selected category';
  filterStatus.textContent = `Filtering by: ${categoryName}`;
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
  allOption.textContent = 'All Categories';
  filterElement.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.slug;
    option.textContent = category.name;
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

  if (clearFilterButton && clearFilterButton.dataset.bound !== 'true') {
    clearFilterButton.dataset.bound = 'true';
    clearFilterButton.addEventListener('click', () => {
      filterElement.value = '';
      onChange('');
    });
  }
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
