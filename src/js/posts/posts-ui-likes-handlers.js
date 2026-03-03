export function updateCachedPostLikeState(feedState, postId, likeState) {
  const posts = feedState.cache.postsWithUiData;
  if (!posts?.length) {
    return;
  }

  const index = posts.findIndex((post) => post.id === postId);
  if (index < 0) {
    return;
  }

  posts[index] = {
    ...posts[index],
    likeCount: likeState.likeCount,
    likedByViewer: likeState.likedByViewer
  };
}

export async function refreshPostLikeState(postId, viewerUserId, getLikesSummaryByPostIds) {
  const likesSummaryByPostId = await getLikesSummaryByPostIds([postId], viewerUserId).catch(() => new Map());
  const likesSummary = likesSummaryByPostId.get(postId) || {
    likeCount: 0,
    likedByViewer: false
  };

  return {
    postId,
    likeCount: likesSummary.likeCount,
    likedByViewer: likesSummary.likedByViewer
  };
}

export function applyLikeStateToVisibleButtons(container, viewer, likeState, setLikeButtonState) {
  if (!container) {
    return;
  }

  const buttons = container.querySelectorAll(`[data-action="toggle-like"][data-post-id="${likeState.postId}"]`);

  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const isPending = button.dataset.pending === 'true';

    setLikeButtonState(button, {
      ...likeState,
      isAuthenticated: Boolean(viewer?.userId),
      isPending
    });
  });
}

export function applyLikeStateToQuickView(feedState, likeState, viewer, setLikeButtonState) {
  const modalState = feedState.modalState;
  if (!modalState || modalState.currentPostId !== likeState.postId) {
    return;
  }

  const likeButton = modalState.quickBody?.querySelector('[data-post-quick-like] [data-action="toggle-like"]');
  if (!(likeButton instanceof HTMLButtonElement)) {
    return;
  }

  const isPending = likeButton.dataset.pending === 'true';
  setLikeButtonState(likeButton, {
    ...likeState,
    isAuthenticated: Boolean(viewer?.userId),
    isPending
  });

  const summary = modalState.quickBody?.querySelector('[data-post-quick-like-count]');
  if (summary instanceof HTMLElement) {
    summary.textContent = `${likeState.likeCount} likes`;
  }
}

export function bindLikesRealtime({
  feedState,
  container,
  viewer,
  posts,
  cleanupLikesRealtime,
  subscribeToPostLikes,
  getLikesSummaryByPostIds,
  setLikeButtonState
}) {
  cleanupLikesRealtime();

  const postIds = (posts || []).map((post) => post.id).filter(Boolean);
  if (!postIds.length) {
    return;
  }

  feedState.unsubscribeLikesRealtime = subscribeToPostLikes(postIds, async (postId) => {
    try {
      const nextState = await refreshPostLikeState(postId, viewer?.userId || null, getLikesSummaryByPostIds);
      updateCachedPostLikeState(feedState, postId, nextState);
      applyLikeStateToVisibleButtons(container, viewer, nextState, setLikeButtonState);
      applyLikeStateToQuickView(feedState, nextState, viewer, setLikeButtonState);
    } catch {
    }
  });
}

export function attachEditHandler({ container, getPostFromCache, getPostManageState, openEditModal }) {
  if (!container || container.dataset.editBound === 'true') {
    return;
  }

  container.dataset.editBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const editButton = target.closest('[data-action="edit-post"]');
    if (!(editButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = editButton.dataset.postId;
    if (!postId) {
      return;
    }

    const post = getPostFromCache(postId);
    if (!post || !getPostManageState(post)) {
      return;
    }

    openEditModal(post);
  });
}

export function attachQuickViewHandler({ container, feedState, getPostFromCache, openQuickViewModal }) {
  if (!container || container.dataset.quickViewBound === 'true') {
    return;
  }

  container.dataset.quickViewBound = 'true';

  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const quickViewTrigger = target.closest('[data-action="open-post-quick-view"]');
    if (!(quickViewTrigger instanceof HTMLElement)) {
      return;
    }

    if (target.closest('[data-action="toggle-like"], [data-action="delete-post"], [data-action="edit-post"], [data-comments-list], .dropdown-menu, .dropdown-toggle, a:not([data-action="open-post-quick-view"]), button:not([data-action="open-post-quick-view"]), input, textarea, select, label')) {
      return;
    }

    if (quickViewTrigger instanceof HTMLAnchorElement) {
      event.preventDefault();
    }

    const postId = quickViewTrigger.dataset.postId || quickViewTrigger.closest('[data-post-id]')?.dataset.postId;
    if (!postId) {
      return;
    }

    const post = getPostFromCache(postId);
    if (!post) {
      return;
    }

    void openQuickViewModal(post);
  });

  if (feedState.quickViewKeyBound) {
    return;
  }

  feedState.quickViewKeyBound = true;
  container.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.action !== 'open-post-quick-view') {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    const postId = target.dataset.postId;
    if (!postId) {
      return;
    }

    const post = getPostFromCache(postId);
    if (!post) {
      return;
    }

    void openQuickViewModal(post);
  });
}

export function attachDeleteHandler({ container, showConfirmModal, deletePost, createNotification, afterDelete }) {
  if (!container || container.dataset.deleteBound === 'true') {
    return;
  }

  container.dataset.deleteBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const deleteButton = target.closest('[data-action="delete-post"]');
    if (!(deleteButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = deleteButton.dataset.postId;
    if (!postId) {
      return;
    }

    const isConfirmed = await showConfirmModal({
      title: 'Delete post',
      message: 'Delete this post? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmButtonClass: 'btn-danger'
    });

    if (!isConfirmed) {
      return;
    }

    deleteButton.disabled = true;

    try {
      await deletePost(postId);
      await afterDelete();
    } catch (error) {
      const notificationRoot = document.querySelector('[data-feed-notifications]');
      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification(error.message || 'Unable to delete post.'));
      }
    } finally {
      deleteButton.disabled = false;
    }
  });
}

export function attachLikeHandler({
  feedState,
  container,
  viewer,
  notificationRoot,
  togglePostLike,
  setLikeButtonState,
  createNotification
}) {
  if (!container || container.dataset.likeBound === 'true') {
    return;
  }

  container.dataset.likeBound = 'true';
  container.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const likeButton = target.closest('[data-action="toggle-like"]');
    if (!(likeButton instanceof HTMLButtonElement)) {
      return;
    }

    const postId = likeButton.dataset.postId;
    if (!postId || !viewer?.userId) {
      return;
    }

    if (feedState.toggleInFlightByPostId.has(postId)) {
      return;
    }

    const previousState = {
      postId,
      likeCount: Number(likeButton.dataset.likeCount || '0'),
      likedByViewer: likeButton.dataset.liked === 'true'
    };

    const optimisticState = {
      ...previousState,
      likedByViewer: !previousState.likedByViewer,
      likeCount: Math.max(0, previousState.likeCount + (previousState.likedByViewer ? -1 : 1))
    };

    feedState.toggleInFlightByPostId.add(postId);
    setLikeButtonState(likeButton, {
      ...optimisticState,
      isAuthenticated: true,
      isPending: true
    });

    try {
      const nextState = await togglePostLike(postId, viewer.userId);
      setLikeButtonState(likeButton, {
        ...nextState,
        isAuthenticated: true,
        isPending: false
      });
      updateCachedPostLikeState(feedState, postId, nextState);
    } catch (error) {
      setLikeButtonState(likeButton, {
        ...previousState,
        isAuthenticated: true,
        isPending: false
      });

      if (notificationRoot) {
        notificationRoot.replaceChildren(createNotification(error.message || 'Unable to update like.'));
      }
    } finally {
      feedState.toggleInFlightByPostId.delete(postId);
    }
  });
}