import { getAllCategoriesLabel, getCategoryDisplayName, getCategoryLabelWithEmoji } from '../utils/category-icons.js';

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
    photoFilter: document.querySelector('[data-feed-photo-filter]'),
    locationFilter: document.querySelector('[data-feed-location-filter]'),
    useMyLocationButton: document.querySelector('[data-feed-use-my-location]'),
    authorFilter: document.querySelector('[data-feed-author-filter]'),
    dateFromFilter: document.querySelector('[data-feed-date-from]'),
    dateToFilter: document.querySelector('[data-feed-date-to]'),
    nearbyToggle: document.querySelector('[data-feed-nearby-toggle]'),
    radiusFilter: document.querySelector('[data-feed-radius-filter]'),
    locationList: document.querySelector('[data-feed-location-list]'),
    authorList: document.querySelector('[data-feed-author-list]'),
    clearFilterButton: document.querySelector('[data-feed-clear-filter]'),
    filterStatus: document.querySelector('[data-feed-filter-status]')
  };
}

export function updateFeedFilterUi(filters, clearFilterButton, filterStatus, categories, filteredCount, totalCount) {
  const query = (filters?.query || '').trim();
  const selectedSlug = filters?.selectedSlug || '';
  const location = (filters?.location || '').trim();
  const author = (filters?.author || '').trim();
  const photo = (filters?.photo || '').trim();
  const dateFrom = (filters?.dateFrom || '').trim();
  const dateTo = (filters?.dateTo || '').trim();
  const nearMeEnabled = filters?.nearMe === true;
  const radiusKm = Number(filters?.radiusKm || 25);
  const nearMeUnavailable = filters?.nearMeUnavailable === true;
  const hasFilter = Boolean(selectedSlug || photo || query || location || author || dateFrom || dateTo || nearMeEnabled);

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
    const selectedCategory = (categories || []).find((category) => category.slug === selectedSlug) || null;
    const categoryName = selectedCategory
      ? getCategoryDisplayName(selectedCategory.name, selectedCategory.slug)
      : 'Категория';
    labels.push(`Категория: ${categoryName}`);
  }

  if (photo === 'with') {
    labels.push('Снимки: със снимка');
  }

  if (photo === 'without') {
    labels.push('Снимки: без снимка');
  }

  if (query) {
    labels.push(`Търсене: "${query}"`);
  }

  if (location) {
    labels.push(`Локация: ${location}`);
  }

  if (author) {
    labels.push(`Потребител: ${author}`);
  }

  if (dateFrom || dateTo) {
    const fromLabel = dateFrom || '…';
    const toLabel = dateTo || '…';
    labels.push(`Период: ${fromLabel} → ${toLabel}`);
  }

  if (nearMeEnabled) {
    if (nearMeUnavailable) {
      labels.push('Близо до мен: няма достъп до локация');
    } else {
      labels.push(`Близо до мен: ${Number.isFinite(radiusKm) ? radiusKm : 25} км`);
    }
  }

  if (typeof filteredCount === 'number' && typeof totalCount === 'number') {
    labels.push(`${filteredCount}/${totalCount} публикации`);
  }

  filterStatus.textContent = `Активни филтри: ${labels.join(' • ')}`;
  filterStatus.classList.remove('d-none');
}

export function setDatalistOptions(listElement, values) {
  if (!(listElement instanceof HTMLDataListElement)) {
    return;
  }

  listElement.replaceChildren();

  const fragment = document.createDocumentFragment();
  (values || []).forEach((value) => {
    const normalized = (value || '').trim();
    if (!normalized) {
      return;
    }

    const option = document.createElement('option');
    option.value = normalized;
    fragment.append(option);
  });

  listElement.append(fragment);
}

export function setCategoryFilterOptions(filterElement, categories, selectedSlug, section = '') {
  if (!(filterElement instanceof HTMLSelectElement)) {
    return;
  }

  const previousValue = selectedSlug || filterElement.value || '';
  filterElement.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = getAllCategoriesLabel(section);
  filterElement.append(allOption);

  (categories || []).forEach((category) => {
    const option = document.createElement('option');
    option.value = category.slug;
    option.textContent = getCategoryLabelWithEmoji(category.name, category.slug);
    filterElement.append(option);
  });

  const hasCurrentValue = (categories || []).some((category) => category.slug === previousValue);
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
    const path = window.location.pathname;
    const isFeedPath = path === '/'
      || path.endsWith('/index.html')
      || path.endsWith('/giveaway.html')
      || path.endsWith('/exchange.html');

    if (!isFeedPath) {
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
