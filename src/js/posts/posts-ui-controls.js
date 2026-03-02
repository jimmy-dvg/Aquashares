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
    sortFilter: document.querySelector('[data-feed-sort-filter]'),
    nearbyToggle: document.querySelector('[data-feed-nearby-toggle]'),
    radiusFilter: document.querySelector('[data-feed-radius-filter]'),
    locationList: document.querySelector('[data-feed-location-list]'),
    authorList: document.querySelector('[data-feed-author-list]'),
    clearFilterButton: document.querySelector('[data-feed-clear-filter]'),
    filterStatus: document.querySelector('[data-feed-filter-status]'),
    activeFiltersContainer: document.querySelector('[data-feed-active-filters]'),
    filterCountBadges: document.querySelectorAll('[data-feed-filter-count]')
  };
}

function buildActiveFilterItems(filters, categories) {
  const query = (filters?.query || '').trim();
  const selectedSlug = filters?.selectedSlug || '';
  const location = (filters?.location || '').trim();
  const author = (filters?.author || '').trim();
  const photo = (filters?.photo || '').trim();
  const sort = (filters?.sort || '').trim();
  const nearMeEnabled = filters?.nearMe === true;
  const radiusKm = Number(filters?.radiusKm || 25);
  const nearMeUnavailable = filters?.nearMeUnavailable === true;

  const items = [];

  if (selectedSlug) {
    const selectedCategory = (categories || []).find((category) => category.slug === selectedSlug) || null;
    const categoryName = selectedCategory
      ? getCategoryDisplayName(selectedCategory.name, selectedCategory.slug)
      : 'Категория';
    items.push({
      key: 'category',
      label: `Категория: ${categoryName}`
    });
  }

  if (photo === 'with') {
    items.push({ key: 'photo', label: 'Снимки: със снимка' });
  }

  if (photo === 'without') {
    items.push({ key: 'photo', label: 'Снимки: без снимка' });
  }

  if (query) {
    items.push({ key: 'query', label: `Търсене: ${query}` });
  }

  if (location) {
    items.push({ key: 'location', label: `Локация: ${location}` });
  }

  if (author) {
    items.push({ key: 'author', label: `Потребител: ${author}` });
  }

  if (sort && sort !== 'newest') {
    const sortMap = {
      oldest: 'Най-стари',
      most_liked: 'Най-харесвани',
      most_commented: 'Най-коментирани'
    };
    items.push({ key: 'sort', label: `Подреди: ${sortMap[sort] || 'Най-нови'}` });
  }

  if (nearMeEnabled) {
    items.push({
      key: 'near_me',
      label: nearMeUnavailable
        ? 'Близо до мен: няма достъп до локация'
        : `Близо до мен: ${Number.isFinite(radiusKm) ? radiusKm : 25} км`
    });
  }

  return items;
}

function renderActiveFilterChips(container, items) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.replaceChildren();

  if (!items.length) {
    container.classList.add('d-none');
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'btn btn-sm aqua-feed-filter-chip';
    chip.dataset.feedFilterChipRemove = item.key;
    chip.setAttribute('aria-label', `Премахни филтър: ${item.label}`);
    chip.innerHTML = `<span>${item.label}</span><i class="bi bi-x-lg" aria-hidden="true"></i>`;
    fragment.append(chip);
  });

  container.append(fragment);
  container.classList.remove('d-none');
}

export function updateFeedFilterUi(
  filters,
  clearFilterButton,
  filterStatus,
  activeFiltersContainer,
  filterCountBadges,
  categories,
  filteredCount,
  totalCount
) {
  const activeItems = buildActiveFilterItems(filters, categories);
  const hasFilter = activeItems.length > 0;

  if (clearFilterButton) {
    clearFilterButton.classList.toggle('d-none', !hasFilter);
  }

  if (filterCountBadges) {
    (Array.isArray(filterCountBadges) ? filterCountBadges : Array.from(filterCountBadges)).forEach((badge) => {
      if (!(badge instanceof HTMLElement)) {
        return;
      }

      badge.textContent = String(activeItems.length);
      badge.classList.toggle('d-none', activeItems.length < 1);
    });
  }

  renderActiveFilterChips(activeFiltersContainer, activeItems);

  if (!filterStatus) {
    return;
  }

  if (!hasFilter) {
    filterStatus.textContent = '';
    filterStatus.classList.add('d-none');
    return;
  }

  if (typeof filteredCount === 'number' && typeof totalCount === 'number') {
    filterStatus.textContent = `Показани ${filteredCount} от ${totalCount} публикации`;
  } else {
    filterStatus.textContent = `Активни филтри: ${activeItems.length}`;
  }
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
      || path.endsWith('/exchange.html')
      || path.endsWith('/wanted.html');

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
