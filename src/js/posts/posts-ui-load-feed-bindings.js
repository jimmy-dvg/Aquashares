export function bindFeedFilterControls(params) {
  const {
    searchInput,
    categoryFilter,
    photoFilter,
    imageFitFilter,
    locationFilter,
    useMyLocationButton,
    authorFilter,
    sortFilter,
    nearbyToggle,
    radiusFilter,
    activeFiltersContainer,
    categories,
    selectedCategorySlugFromQuery,
    feedSection,
    scheduleFiltersLoadFromInputs,
    createNotification,
    notificationRoot,
    getViewerCoordinates,
    reverseGeocodeLocationName,
    feedState,
    setCategoryFilterOptions,
    bindCategoryFilter,
    setFeedFiltersInQuery,
    scheduleFeedLoad,
    applyFeedImageFitMode
  } = params;

  if (typeof applyFeedImageFitMode === 'function') {
    const initialMode = imageFitFilter instanceof HTMLSelectElement
      ? (imageFitFilter.value || '')
      : '';
    applyFeedImageFitMode(initialMode, imageFitFilter);
  }

  if (searchInput instanceof HTMLInputElement && searchInput.dataset.bound !== 'true') {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (locationFilter instanceof HTMLInputElement && locationFilter.dataset.bound !== 'true') {
    locationFilter.dataset.bound = 'true';
    locationFilter.addEventListener('input', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (useMyLocationButton instanceof HTMLButtonElement && useMyLocationButton.dataset.bound !== 'true') {
    useMyLocationButton.dataset.bound = 'true';
    useMyLocationButton.addEventListener('click', async () => {
      useMyLocationButton.disabled = true;

      const icon = useMyLocationButton.querySelector('i');
      const previousIconClass = icon?.className || '';

      if (icon instanceof HTMLElement) {
        icon.className = 'bi bi-hourglass-split';
      }

      try {
        const coords = await getViewerCoordinates(feedState);
        if (!coords) {
          if (notificationRoot) {
            notificationRoot.replaceChildren(createNotification('Нужен е достъп до локация, за да използваш тази функция.', 'warning'));
          }
          return;
        }

        const locationName = await reverseGeocodeLocationName(coords.lat, coords.lng);
        if (!locationName) {
          if (notificationRoot) {
            notificationRoot.replaceChildren(createNotification('Не успяхме да определим населено място от текущата позиция.', 'warning'));
          }
          return;
        }

        if (locationFilter instanceof HTMLInputElement) {
          locationFilter.value = locationName;
        }

        scheduleFiltersLoadFromInputs({
          searchInput,
          categoryFilter,
          locationFilter,
          authorFilter,
          sortFilter,
          nearbyToggle,
          radiusFilter
        });
      } catch (error) {
        if (notificationRoot) {
          notificationRoot.replaceChildren(createNotification(error.message || 'Неуспешно определяне на локация.', 'warning'));
        }
      } finally {
        useMyLocationButton.disabled = false;
        if (icon instanceof HTMLElement) {
          icon.className = previousIconClass || 'bi bi-crosshair';
        }
      }
    });
  }

  if (authorFilter instanceof HTMLInputElement && authorFilter.dataset.bound !== 'true') {
    authorFilter.dataset.bound = 'true';
    authorFilter.addEventListener('input', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (sortFilter instanceof HTMLSelectElement && sortFilter.dataset.bound !== 'true') {
    sortFilter.dataset.bound = 'true';
    sortFilter.addEventListener('change', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (nearbyToggle instanceof HTMLInputElement && nearbyToggle.dataset.bound !== 'true') {
    nearbyToggle.dataset.bound = 'true';
    nearbyToggle.addEventListener('change', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (radiusFilter instanceof HTMLSelectElement && radiusFilter.dataset.bound !== 'true') {
    radiusFilter.dataset.bound = 'true';
    radiusFilter.addEventListener('change', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (categoryFilter) {
    setCategoryFilterOptions(categoryFilter, categories, selectedCategorySlugFromQuery, feedSection);
    bindCategoryFilter(categoryFilter, null, (selectedSlug) => {
      setFeedFiltersInQuery({
        category: selectedSlug,
        photo: photoFilter instanceof HTMLSelectElement ? photoFilter.value : '',
        query: searchInput instanceof HTMLInputElement ? searchInput.value : '',
        location: locationFilter instanceof HTMLInputElement ? locationFilter.value : '',
        author: authorFilter instanceof HTMLInputElement ? authorFilter.value : '',
        sort: sortFilter instanceof HTMLSelectElement ? sortFilter.value : 'newest',
        nearMe: nearbyToggle instanceof HTMLInputElement ? nearbyToggle.checked : false,
        radiusKm: radiusFilter instanceof HTMLSelectElement ? radiusFilter.value : '25'
      });
      scheduleFeedLoad();
    });
  }

  if (photoFilter instanceof HTMLSelectElement && photoFilter.dataset.bound !== 'true') {
    photoFilter.dataset.bound = 'true';
    photoFilter.addEventListener('change', () => {
      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        photoFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }

  if (imageFitFilter instanceof HTMLSelectElement && imageFitFilter.dataset.bound !== 'true') {
    imageFitFilter.dataset.bound = 'true';
    imageFitFilter.addEventListener('change', () => {
      if (typeof applyFeedImageFitMode === 'function') {
        applyFeedImageFitMode(imageFitFilter.value, imageFitFilter);
      }
    });
  }

  if (activeFiltersContainer instanceof HTMLElement && activeFiltersContainer.dataset.bound !== 'true') {
    activeFiltersContainer.dataset.bound = 'true';
    activeFiltersContainer.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('[data-feed-filter-chip-remove]')
        : null;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const key = (target.dataset.feedFilterChipRemove || '').trim();

      if (key === 'category' && categoryFilter instanceof HTMLSelectElement) {
        categoryFilter.value = '';
      }

      if (key === 'photo' && photoFilter instanceof HTMLSelectElement) {
        photoFilter.value = '';
      }

      if (key === 'query' && searchInput instanceof HTMLInputElement) {
        searchInput.value = '';
      }

      if (key === 'location' && locationFilter instanceof HTMLInputElement) {
        locationFilter.value = '';
      }

      if (key === 'author' && authorFilter instanceof HTMLInputElement) {
        authorFilter.value = '';
      }

      if (key === 'sort' && sortFilter instanceof HTMLSelectElement) {
        sortFilter.value = 'newest';
      }

      if (key === 'near_me') {
        if (nearbyToggle instanceof HTMLInputElement) {
          nearbyToggle.checked = false;
        }

        if (radiusFilter instanceof HTMLSelectElement) {
          radiusFilter.value = '25';
        }
      }

      scheduleFiltersLoadFromInputs({
        searchInput,
        categoryFilter,
        photoFilter,
        locationFilter,
        authorFilter,
        sortFilter,
        nearbyToggle,
        radiusFilter
      });
    });
  }
}
