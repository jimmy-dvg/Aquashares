function normalizeText(value) {
  return (value || '').toLowerCase().trim();
}

export function createAdminFilters({
  adminState,
  elements,
  renderUsersTable,
  renderPostsTable,
  renderCommentsTable,
  renderAdminNotifications,
  getCategoryFilterFromQuery,
  setCategoryFilterInQuery
}) {
  function updateUsersFilterUi(filteredCount, totalCount) {
    const query = elements.usersSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.usersSearchInput.value)
      : '';
    const role = elements.usersRoleFilter instanceof HTMLSelectElement
      ? (elements.usersRoleFilter.value || '')
      : '';

    const hasFilter = Boolean(query || role);

    if (elements.usersClearFilter) {
      elements.usersClearFilter.classList.toggle('d-none', !hasFilter);
    }

    if (!elements.usersFilterStatus) {
      return;
    }

    if (!hasFilter) {
      elements.usersFilterStatus.textContent = '';
      elements.usersFilterStatus.classList.add('d-none');
      return;
    }

    const labels = [];
    if (query) {
      labels.push(`търсене: "${query}"`);
    }
    if (role) {
      labels.push(`роля: ${role}`);
    }

    elements.usersFilterStatus.textContent = `Показани ${filteredCount}/${totalCount} потребители (${labels.join(', ')})`;
    elements.usersFilterStatus.classList.remove('d-none');
  }

  function renderFilteredUsers() {
    const query = elements.usersSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.usersSearchInput.value)
      : '';
    const role = elements.usersRoleFilter instanceof HTMLSelectElement
      ? (elements.usersRoleFilter.value || '')
      : '';

    const filteredUsers = adminState.users.filter((user) => {
      if (role && user.role !== role) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeText(`${user.username} ${user.displayName} ${user.email}`);
      return haystack.includes(query);
    });

    renderUsersTable(filteredUsers, elements);
    updateUsersFilterUi(filteredUsers.length, adminState.users.length);
  }

  function attachUsersFilterHandler() {
    if (adminState.usersFilterBound) {
      return;
    }

    const canBindSearch = elements.usersSearchInput instanceof HTMLInputElement;
    const canBindRole = elements.usersRoleFilter instanceof HTMLSelectElement;

    if (!canBindSearch || !canBindRole) {
      return;
    }

    adminState.usersFilterBound = true;

    elements.usersSearchInput.addEventListener('input', renderFilteredUsers);
    elements.usersRoleFilter.addEventListener('change', renderFilteredUsers);

    if (elements.usersClearFilter && elements.usersClearFilter.dataset.bound !== 'true') {
      elements.usersClearFilter.dataset.bound = 'true';
      elements.usersClearFilter.addEventListener('click', () => {
        elements.usersSearchInput.value = '';
        elements.usersRoleFilter.value = '';
        renderFilteredUsers();
      });
    }
  }

  function updateCommentsFilterUi(filteredCount, totalCount) {
    const query = elements.commentsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.commentsSearchInput.value)
      : '';

    if (elements.commentsClearFilter) {
      elements.commentsClearFilter.classList.toggle('d-none', !query);
    }

    if (!elements.commentsFilterStatus) {
      return;
    }

    if (!query) {
      elements.commentsFilterStatus.textContent = '';
      elements.commentsFilterStatus.classList.add('d-none');
      return;
    }

    elements.commentsFilterStatus.textContent = `Показани ${filteredCount}/${totalCount} коментари за „${query}“`;
    elements.commentsFilterStatus.classList.remove('d-none');
  }

  function renderFilteredComments() {
    const query = elements.commentsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.commentsSearchInput.value)
      : '';

    const filteredComments = adminState.comments.filter((comment) => {
      if (!query) {
        return true;
      }

      const haystack = normalizeText(`${comment.postTitle} ${comment.authorUsername} ${comment.authorEmail} ${comment.body}`);
      return haystack.includes(query);
    });

    renderCommentsTable(filteredComments, elements);
    updateCommentsFilterUi(filteredComments.length, adminState.comments.length);
  }

  function attachCommentsFilterHandler() {
    if (adminState.commentsFilterBound) {
      return;
    }

    if (!(elements.commentsSearchInput instanceof HTMLInputElement)) {
      return;
    }

    adminState.commentsFilterBound = true;

    elements.commentsSearchInput.addEventListener('input', renderFilteredComments);

    if (elements.commentsClearFilter && elements.commentsClearFilter.dataset.bound !== 'true') {
      elements.commentsClearFilter.dataset.bound = 'true';
      elements.commentsClearFilter.addEventListener('click', () => {
        elements.commentsSearchInput.value = '';
        renderFilteredComments();
      });
    }
  }

  function updateAdminNotificationsFilterUi(filteredCount, totalCount) {
    const query = elements.adminNotificationsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.adminNotificationsSearchInput.value)
      : '';
    const status = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement
      ? (elements.adminNotificationsStatusFilter.value || '')
      : '';
    const severity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement
      ? (elements.adminNotificationsSeverityFilter.value || '')
      : '';

    const hasFilter = Boolean(query || status || severity);

    if (elements.adminNotificationsClearFilter) {
      elements.adminNotificationsClearFilter.classList.toggle('d-none', !hasFilter);
    }

    if (!elements.adminNotificationsFilterStatus) {
      return;
    }

    if (!hasFilter) {
      elements.adminNotificationsFilterStatus.textContent = '';
      elements.adminNotificationsFilterStatus.classList.add('d-none');
      return;
    }

    const labels = [];
    if (query) {
      labels.push(`търсене: "${query}"`);
    }
    if (status) {
      labels.push(`статус: ${status}`);
    }
    if (severity) {
      labels.push(`приоритет: ${severity}`);
    }

    elements.adminNotificationsFilterStatus.textContent = `Показани ${filteredCount}/${totalCount} известия (${labels.join(', ')})`;
    elements.adminNotificationsFilterStatus.classList.remove('d-none');
  }

  function renderFilteredAdminNotifications(currentAdminId) {
    const query = elements.adminNotificationsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.adminNotificationsSearchInput.value)
      : '';
    const status = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement
      ? (elements.adminNotificationsStatusFilter.value || '')
      : '';
    const severity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement
      ? (elements.adminNotificationsSeverityFilter.value || '')
      : '';

    const filteredNotifications = adminState.adminNotifications.filter((notification) => {
      if (status && notification.status !== status) {
        return false;
      }

      if (severity && notification.severity !== severity) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeText(`${notification.title} ${notification.message} ${notification.sourceType} ${notification.referenceType}`);
      return haystack.includes(query);
    });

    renderAdminNotifications(filteredNotifications, elements, currentAdminId);
    updateAdminNotificationsFilterUi(filteredNotifications.length, adminState.adminNotifications.length);
  }

  function attachAdminNotificationsFilterHandler(currentAdminId) {
    if (adminState.adminNotificationsFilterBound) {
      return;
    }

    const canBindSearch = elements.adminNotificationsSearchInput instanceof HTMLInputElement;
    const canBindStatus = elements.adminNotificationsStatusFilter instanceof HTMLSelectElement;
    const canBindSeverity = elements.adminNotificationsSeverityFilter instanceof HTMLSelectElement;

    if (!canBindSearch || !canBindStatus || !canBindSeverity) {
      return;
    }

    adminState.adminNotificationsFilterBound = true;

    elements.adminNotificationsSearchInput.addEventListener('input', () => renderFilteredAdminNotifications(currentAdminId));
    elements.adminNotificationsStatusFilter.addEventListener('change', () => renderFilteredAdminNotifications(currentAdminId));
    elements.adminNotificationsSeverityFilter.addEventListener('change', () => renderFilteredAdminNotifications(currentAdminId));

    if (elements.adminNotificationsClearFilter && elements.adminNotificationsClearFilter.dataset.bound !== 'true') {
      elements.adminNotificationsClearFilter.dataset.bound = 'true';
      elements.adminNotificationsClearFilter.addEventListener('click', () => {
        elements.adminNotificationsSearchInput.value = '';
        elements.adminNotificationsStatusFilter.value = '';
        elements.adminNotificationsSeverityFilter.value = '';
        renderFilteredAdminNotifications(currentAdminId);
      });
    }
  }

  function setPostsFilterOptions(posts) {
    if (!(elements.postsCategoryFilter instanceof HTMLSelectElement)) {
      return;
    }

    const queryValue = getCategoryFilterFromQuery();
    const previousValue = queryValue || elements.postsCategoryFilter.value || '';
    elements.postsCategoryFilter.replaceChildren();

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Categories';
    elements.postsCategoryFilter.append(allOption);

    const categoryMap = new Map();
    posts.forEach((post) => {
      const slug = post.categorySlug || 'uncategorized';
      const name = post.categoryName || 'Uncategorized';
      if (!categoryMap.has(slug)) {
        categoryMap.set(slug, name);
      }
    });

    [...categoryMap.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([slug, name]) => {
      const option = document.createElement('option');
      option.value = slug;
      option.textContent = name;
      elements.postsCategoryFilter.append(option);
    });

    const hasPrevious = [...elements.postsCategoryFilter.options].some((option) => option.value === previousValue);
    elements.postsCategoryFilter.value = hasPrevious ? previousValue : '';

    if (queryValue && !hasPrevious) {
      setCategoryFilterInQuery('');
    }
  }

  function updateAdminPostsFilterUi() {
    const query = elements.postsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.postsSearchInput.value)
      : '';
    const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
      ? elements.postsCategoryFilter.value
      : '';

    if (elements.postsClearFilter) {
      elements.postsClearFilter.classList.toggle('d-none', !(selectedCategory || query));
    }

    if (!elements.postsFilterStatus) {
      return;
    }

    if (!selectedCategory) {
      if (!query) {
        elements.postsFilterStatus.textContent = '';
        elements.postsFilterStatus.classList.add('d-none');
        return;
      }
    }

    const labels = [];

    if (selectedCategory) {
      const selectedOption = elements.postsCategoryFilter?.selectedOptions?.[0];
      const label = selectedOption?.textContent?.trim() || 'Selected category';
      labels.push(`category: ${label}`);
    }

    if (query) {
      labels.push(`query: "${query}"`);
    }

    elements.postsFilterStatus.textContent = `Filtering by ${labels.join(', ')}`;
    elements.postsFilterStatus.classList.remove('d-none');
  }

  function renderFilteredPosts() {
    const query = elements.postsSearchInput instanceof HTMLInputElement
      ? normalizeText(elements.postsSearchInput.value)
      : '';
    const selectedCategory = elements.postsCategoryFilter instanceof HTMLSelectElement
      ? elements.postsCategoryFilter.value
      : '';

    const filteredPosts = adminState.posts.filter((post) => {
      if (selectedCategory && (post.categorySlug || 'uncategorized') !== selectedCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeText(`${post.title} ${post.body} ${post.authorUsername} ${post.authorEmail} ${post.categoryName}`);
      return haystack.includes(query);
    });

    renderPostsTable(filteredPosts, elements);
    updateAdminPostsFilterUi();

    if (elements.postsFilterStatus) {
      const baseText = elements.postsFilterStatus.textContent || '';
      if (baseText) {
        elements.postsFilterStatus.textContent = `${baseText} • ${filteredPosts.length}/${adminState.posts.length} posts`;
      }
    }
  }

  function attachPostsFilterHandler() {
    const canBindCategory = elements.postsCategoryFilter instanceof HTMLSelectElement;
    const canBindSearch = elements.postsSearchInput instanceof HTMLInputElement;

    if (adminState.postsFilterBound || !canBindCategory || !canBindSearch) {
      return;
    }

    adminState.postsFilterBound = true;
    elements.postsSearchInput.addEventListener('input', renderFilteredPosts);

    elements.postsCategoryFilter.addEventListener('change', () => {
      setCategoryFilterInQuery(elements.postsCategoryFilter.value || '');
      renderFilteredPosts();
    });

    if (elements.postsClearFilter && elements.postsClearFilter.dataset.bound !== 'true') {
      elements.postsClearFilter.dataset.bound = 'true';
      elements.postsClearFilter.addEventListener('click', () => {
        if (elements.postsSearchInput instanceof HTMLInputElement) {
          elements.postsSearchInput.value = '';
        }
        elements.postsCategoryFilter.value = '';
        setCategoryFilterInQuery('');
        renderFilteredPosts();
      });
    }
  }

  function attachPopstateHandler() {
    if (adminState.popstateBound) {
      return;
    }

    adminState.popstateBound = true;
    window.addEventListener('popstate', () => {
      if (!(elements.postsCategoryFilter instanceof HTMLSelectElement)) {
        return;
      }

      const nextCategory = getCategoryFilterFromQuery();
      const hasOption = [...elements.postsCategoryFilter.options].some((option) => option.value === nextCategory);
      elements.postsCategoryFilter.value = hasOption ? nextCategory : '';
      renderFilteredPosts();
    });
  }

  return {
    attachUsersFilterHandler,
    attachPostsFilterHandler,
    attachCommentsFilterHandler,
    attachAdminNotificationsFilterHandler,
    attachPopstateHandler,
    renderFilteredUsers,
    renderFilteredPosts,
    renderFilteredComments,
    renderFilteredAdminNotifications,
    setPostsFilterOptions
  };
}