export async function loadFeedController(options = {}, deps) {
  const {
    feedState,
    getUiElements,
    initializeStickyFilterDock,
    bindFeedPopstate,
    isFeedPagePath,
    scheduleFeedLoad,
    setLoadingState,
    clearError,
    cleanupCommentsUi,
    cleanupLikesRealtime,
    getCategoryFromQuery,
    getSearchFromQuery,
    getPhotoFromQuery,
    getLocationFromQuery,
    getAuthorFromQuery,
    getSortFromQuery,
    getNearMeFromQuery,
    getRadiusKmFromQuery,
    normalizePhotoFilter,
    normalizeSortOption,
    normalizeText,
    getFeedData,
    supabase,
    getAllPosts,
    getCategories,
    getViewerState,
    getLikesSummaryByPostIds,
    scheduleFiltersLoadFromInputs,
    createNotification,
    getViewerCoordinates,
    reverseGeocodeLocationName,
    bindFeedFilterControls,
    setCategoryFilterOptions,
    bindCategoryFilter,
    setFeedFiltersInQuery,
    buildFilterSuggestions,
    setDatalistOptions,
    updateFeedFilterUi,
    sortPosts,
    matchesFeedPhoto,
    matchesFeedSearch,
    matchesFeedLocation,
    matchesFeedAuthor,
    matchesNearby,
    renderEmptyState,
    renderPostCard,
    initializeCommentsUi,
    bindLikesRealtimeModule,
    subscribeToPostLikes,
    setLikeButtonState,
    focusPostFromHash,
    focusCommentFromQuery,
    attachEditHandler,
    attachQuickViewHandler,
    attachDeleteHandler,
    attachLikeHandler,
    showError
  } = deps;

  const forceRefresh = options.forceRefresh === true;
  const {
    feedContainer,
    loadingElement,
    errorElement,
    notificationRoot,
    searchInput,
    categoryFilter,
    photoFilter,
    locationFilter,
    useMyLocationButton,
    authorFilter,
    sortFilter,
    nearbyToggle,
    radiusFilter,
    locationList,
    authorList,
    clearFilterButtons,
    filterStatus,
    activeFiltersContainer,
    filterCountBadges
  } = getUiElements();

  if (!feedContainer) {
    return;
  }

  initializeStickyFilterDock(feedState);

  bindFeedPopstate(() => {
    if (!isFeedPagePath()) {
      return;
    }

    scheduleFeedLoad();
  });

  setLoadingState(true, loadingElement);
  if (searchInput instanceof HTMLInputElement) {
    searchInput.disabled = true;
  }
  if (categoryFilter instanceof HTMLSelectElement) {
    categoryFilter.disabled = true;
  }
  if (photoFilter instanceof HTMLSelectElement) {
    photoFilter.disabled = true;
  }
  if (locationFilter instanceof HTMLInputElement) {
    locationFilter.disabled = true;
  }
  if (useMyLocationButton instanceof HTMLButtonElement) {
    useMyLocationButton.disabled = true;
  }
  if (authorFilter instanceof HTMLInputElement) {
    authorFilter.disabled = true;
  }
  if (sortFilter instanceof HTMLSelectElement) {
    sortFilter.disabled = true;
  }
  if (nearbyToggle instanceof HTMLInputElement) {
    nearbyToggle.disabled = true;
  }
  if (radiusFilter instanceof HTMLSelectElement) {
    radiusFilter.disabled = true;
  }
  (Array.isArray(clearFilterButtons) ? clearFilterButtons : Array.from(clearFilterButtons || [])).forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
  });
  clearError(errorElement);
  if (notificationRoot) {
    notificationRoot.replaceChildren();
  }

  try {
    cleanupCommentsUi();
    cleanupLikesRealtime();

    const selectedCategorySlugFromQuery = getCategoryFromQuery();
    const sectionHost = feedContainer.closest('[data-feed-section]');
    const feedSection = ((sectionHost instanceof HTMLElement ? sectionHost.dataset.feedSection : '') || 'forum').trim();
    const searchFromQuery = getSearchFromQuery();
    const photoFromQuery = normalizePhotoFilter(getPhotoFromQuery());
    const locationFromQuery = getLocationFromQuery();
    const authorFromQuery = getAuthorFromQuery();
    const sortFromQuery = normalizeSortOption(getSortFromQuery());
    const nearMeFromQuery = getNearMeFromQuery();
    const radiusKmFromQuery = getRadiusKmFromQuery(25);
    const normalizedSearchQuery = normalizeText(searchFromQuery);
    const normalizedLocationQuery = normalizeText(locationFromQuery);
    const normalizedAuthorQuery = normalizeText(authorFromQuery);

    if (searchInput instanceof HTMLInputElement && searchInput.value !== searchFromQuery) {
      searchInput.value = searchFromQuery;
    }
    if (locationFilter instanceof HTMLInputElement && locationFilter.value !== locationFromQuery) {
      locationFilter.value = locationFromQuery;
    }
    if (photoFilter instanceof HTMLSelectElement && photoFilter.value !== photoFromQuery) {
      photoFilter.value = photoFromQuery;
    }
    if (authorFilter instanceof HTMLInputElement && authorFilter.value !== authorFromQuery) {
      authorFilter.value = authorFromQuery;
    }
    if (sortFilter instanceof HTMLSelectElement && sortFilter.value !== sortFromQuery) {
      sortFilter.value = sortFromQuery;
    }
    if (nearbyToggle instanceof HTMLInputElement && nearbyToggle.checked !== nearMeFromQuery) {
      nearbyToggle.checked = nearMeFromQuery;
    }
    if (radiusFilter instanceof HTMLSelectElement && radiusFilter.value !== String(radiusKmFromQuery)) {
      radiusFilter.value = String(radiusKmFromQuery);
    }

    const { postsWithUiData, viewer, categories } = await getFeedData({
      feedState,
      forceRefresh,
      section: feedSection,
      supabase,
      getAllPosts,
      getCategories,
      getViewerState,
      getLikesSummaryByPostIds
    });

    bindFeedFilterControls({
      searchInput,
      categoryFilter,
      photoFilter,
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
      scheduleFeedLoad
    });

    const filterSuggestions = buildFilterSuggestions(postsWithUiData);
    setDatalistOptions(locationList, filterSuggestions.locations);
    setDatalistOptions(authorList, filterSuggestions.authors);

    (Array.isArray(clearFilterButtons) ? clearFilterButtons : Array.from(clearFilterButtons || [])).forEach((clearFilterButton) => {
      if (!(clearFilterButton instanceof HTMLButtonElement) || clearFilterButton.dataset.bound === 'true') {
        return;
      }

      clearFilterButton.dataset.bound = 'true';
      clearFilterButton.addEventListener('click', () => {
        if (searchInput instanceof HTMLInputElement) {
          searchInput.value = '';
        }

        if (categoryFilter instanceof HTMLSelectElement) {
          categoryFilter.value = '';
        }
        if (photoFilter instanceof HTMLSelectElement) {
          photoFilter.value = '';
        }
        if (locationFilter instanceof HTMLInputElement) {
          locationFilter.value = '';
        }
        if (authorFilter instanceof HTMLInputElement) {
          authorFilter.value = '';
        }
        if (sortFilter instanceof HTMLSelectElement) {
          sortFilter.value = 'newest';
        }
        if (nearbyToggle instanceof HTMLInputElement) {
          nearbyToggle.checked = false;
        }
        if (radiusFilter instanceof HTMLSelectElement) {
          radiusFilter.value = '25';
        }

        setFeedFiltersInQuery({
          category: '',
          photo: '',
          query: '',
          location: '',
          author: '',
          sort: 'newest',
          nearMe: false,
          radiusKm: '25'
        });
        scheduleFeedLoad();
      });
    });

    const categorySlugs = new Set(categories.map((category) => category.slug));
    const categoryFromQuery = categorySlugs.has(selectedCategorySlugFromQuery) ? selectedCategorySlugFromQuery : '';
    const effectiveCategorySlug = categoryFromQuery;
    const effectivePhotoFilter = photoFromQuery;
    const effectiveSort = sortFromQuery;

    if (selectedCategorySlugFromQuery && !categoryFromQuery) {
      setFeedFiltersInQuery({ category: '' });
    }

    const viewerCoords = nearMeFromQuery ? await getViewerCoordinates(feedState) : null;
    const nearMeUnavailable = nearMeFromQuery && !viewerCoords;

    if (nearMeUnavailable && notificationRoot) {
      notificationRoot.replaceChildren(createNotification('Филтърът „Близо до мен“ изисква разрешение за геолокация в браузъра.', 'warning'));
    }

    const filteredPosts = sortPosts(postsWithUiData
      .filter((post) => (post.section || post.categorySection || 'forum') === feedSection)
      .filter((post) => (!effectiveCategorySlug || post.categorySlug === effectiveCategorySlug))
      .filter((post) => matchesFeedPhoto(post, effectivePhotoFilter))
      .filter((post) => matchesFeedSearch(post, normalizedSearchQuery))
      .filter((post) => matchesFeedLocation(post, normalizedLocationQuery))
      .filter((post) => matchesFeedAuthor(post, normalizedAuthorQuery))
      .filter((post) => (!nearMeFromQuery || matchesNearby(post, viewerCoords, radiusKmFromQuery))), effectiveSort);

    const selectedCategorySlugForUi = categoryFromQuery;

    updateFeedFilterUi(
      {
        selectedSlug: selectedCategorySlugForUi,
        photo: effectivePhotoFilter,
        query: searchFromQuery,
        location: locationFromQuery,
        author: authorFromQuery,
        sort: effectiveSort,
        nearMe: nearMeFromQuery,
        radiusKm: radiusKmFromQuery,
        nearMeUnavailable
      },
      clearFilterButtons,
      filterStatus,
      activeFiltersContainer,
      filterCountBadges,
      categories,
      filteredPosts.length,
      postsWithUiData.length
    );
    const canManagePost = (post) => Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);

    feedContainer.replaceChildren();

    if (!filteredPosts.length) {
      renderEmptyState(
        feedContainer,
        (effectiveCategorySlug || normalizedSearchQuery)
          || effectivePhotoFilter
          || normalizedLocationQuery
          || normalizedAuthorQuery
          || (effectiveSort && effectiveSort !== 'newest')
          || nearMeFromQuery
          ? 'Няма публикации по зададените филтри.'
          : 'Бъди първият с нова публикация.'
      );
    } else {
      const fragment = document.createDocumentFragment();
      filteredPosts.forEach((post) => {
        fragment.append(renderPostCard(post, canManagePost(post), Boolean(viewer.userId), viewer.shareNetworks || []));
      });

      feedContainer.append(fragment);
      await initializeCommentsUi(feedContainer, viewer.userId);
      bindLikesRealtimeModule({
        feedState,
        container: feedContainer,
        viewer,
        posts: filteredPosts,
        cleanupLikesRealtime,
        subscribeToPostLikes,
        getLikesSummaryByPostIds,
        setLikeButtonState
      });
      focusPostFromHash();
      focusCommentFromQuery();
    }

    attachEditHandler(feedContainer);
    attachQuickViewHandler(feedContainer);
    attachDeleteHandler(feedContainer, () => deps.loadFeed({ forceRefresh: true }));
    attachLikeHandler(feedContainer, viewer, notificationRoot);
  } catch (error) {
    showError(errorElement, error.message || 'Неуспешно зареждане на публикациите. Опитай отново.');
  } finally {
    if (searchInput instanceof HTMLInputElement) {
      searchInput.disabled = false;
    }
    if (categoryFilter instanceof HTMLSelectElement) {
      categoryFilter.disabled = false;
    }
    if (photoFilter instanceof HTMLSelectElement) {
      photoFilter.disabled = false;
    }
    if (locationFilter instanceof HTMLInputElement) {
      locationFilter.disabled = false;
    }
    if (useMyLocationButton instanceof HTMLButtonElement) {
      useMyLocationButton.disabled = false;
    }
    if (authorFilter instanceof HTMLInputElement) {
      authorFilter.disabled = false;
    }
    if (sortFilter instanceof HTMLSelectElement) {
      sortFilter.disabled = false;
    }
    if (nearbyToggle instanceof HTMLInputElement) {
      nearbyToggle.disabled = false;
    }
    if (radiusFilter instanceof HTMLSelectElement) {
      radiusFilter.disabled = false;
    }
    (Array.isArray(clearFilterButtons) ? clearFilterButtons : Array.from(clearFilterButtons || [])).forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
      }
    });
    setLoadingState(false, loadingElement);
  }
}