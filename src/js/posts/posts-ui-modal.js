import { createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';

export function createPostsModalController(deps) {
  const {
    feedState,
    createLikeButton,
    setLikeButtonState,
    togglePostLike,
    createNotification,
    renderGallery,
    getCategoryDisplayName,
    formatPostTimestamp,
    getPostFromCache,
    getPostManageState,
    updateCachedPostLikeState,
    applyLikeStateToVisibleButtons,
    applyLikeStateToQuickView,
    updatePost,
    getScopedCategoryDisplayName,
    validatePostEditInput,
    getFilesFromInputs,
    getSelectedPhotosForRemoval,
    uploadAndCreatePhoto,
    rollbackPhoto,
    removePhoto,
    renderExistingModalImages,
    forceCloseModal,
    scheduleFeedLoad
  } = deps;

  async function renderQuickViewBody(container, post, viewer) {
    if (!container) {
      return;
    }
    container.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'row g-3';
    const mediaCol = document.createElement('div');
    mediaCol.className = 'col-12 col-lg-7';
    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'ratio ratio-16x9 rounded overflow-hidden border aqua-post-detail-media';
    mediaFrame.dataset.postQuickCarousel = 'true';
    mediaCol.append(mediaFrame);
    const galleryThumbs = document.createElement('div');
    galleryThumbs.className = 'd-flex flex-wrap gap-2 mt-2';
    mediaCol.append(galleryThumbs);
    renderGallery(mediaFrame, galleryThumbs, post.photos || [], post.title);
    const detailsCol = document.createElement('div');
    detailsCol.className = 'col-12 col-lg-5 d-flex flex-column gap-2';
    const category = document.createElement('span');
    category.className = 'badge text-bg-secondary-subtle text-secondary-emphasis align-self-start';
    category.textContent = getCategoryDisplayName(post.categoryName, post.categorySlug);
    const title = document.createElement('h5');
    title.className = 'mb-0';
    title.textContent = post.title;
    const author = document.createElement('div');
    author.className = 'small text-secondary';
    const authorLocation = ` • 📍 ${(post.author?.location || '').trim() || 'Не е посочена'}`;
    author.textContent = `От ${post.author?.displayName || post.author?.username || 'Aquashares User'}${authorLocation} • ${formatPostTimestamp(post.createdAt)}`;
    const body = document.createElement('p');
    body.className = 'mb-0 text-secondary';
    body.textContent = post.body;
    const stats = document.createElement('div');
    stats.className = 'd-flex flex-wrap gap-2 pt-2';
    const likesBadge = document.createElement('span');
    likesBadge.className = 'badge rounded-pill text-bg-light border';
    likesBadge.textContent = `${post.likeCount || 0} likes`;
    const commentsBadge = document.createElement('span');
    commentsBadge.className = 'badge rounded-pill text-bg-light border';
    commentsBadge.textContent = `${post.commentCount || 0} comments`;
    stats.append(likesBadge, commentsBadge);
    detailsCol.append(category, title, author, body, stats);
    const reactionsBar = document.createElement('div');
    reactionsBar.className = 'd-flex align-items-center justify-content-between gap-2 border rounded-3 px-3 py-2';
    reactionsBar.dataset.postQuickLike = 'true';
    const likesSummary = document.createElement('div');
    likesSummary.className = 'small text-secondary';
    likesSummary.dataset.postQuickLikeCount = 'true';
    likesSummary.textContent = `${post.likeCount || 0} likes`;
    const likeButton = createLikeButton({ postId: post.id, likeCount: post.likeCount || 0, likedByViewer: post.likedByViewer === true, isAuthenticated: Boolean(viewer?.userId) });
    let likePending = false;
    likeButton.addEventListener('click', async () => {
      if (!viewer?.userId || likePending) {
        return;
      }
      const previousState = { postId: post.id, likeCount: Number(likeButton.dataset.likeCount || '0'), likedByViewer: likeButton.dataset.liked === 'true' };
      const optimisticState = { ...previousState, likedByViewer: !previousState.likedByViewer, likeCount: Math.max(0, previousState.likeCount + (previousState.likedByViewer ? -1 : 1)) };
      likePending = true;
      setLikeButtonState(likeButton, { ...optimisticState, isAuthenticated: true, isPending: true });
      likesSummary.textContent = `${optimisticState.likeCount} likes`;
      try {
        const nextState = await togglePostLike(post.id, viewer.userId);
        setLikeButtonState(likeButton, { ...nextState, isAuthenticated: true, isPending: false });
        updateCachedPostLikeState(feedState, post.id, nextState);
        applyLikeStateToVisibleButtons(document.querySelector('[data-feed-list]'), viewer, nextState, setLikeButtonState);
        applyLikeStateToQuickView(feedState, nextState, viewer, setLikeButtonState);
      } catch (error) {
        setLikeButtonState(likeButton, { ...previousState, isAuthenticated: true, isPending: false });
        likesSummary.textContent = `${previousState.likeCount} likes`;
        const notificationRoot = document.querySelector('[data-feed-notifications]');
        if (notificationRoot) {
          notificationRoot.replaceChildren(createNotification(error.message || 'Unable to update like.'));
        }
      } finally {
        likePending = false;
      }
    });
    reactionsBar.append(likesSummary, likeButton);
    detailsCol.append(reactionsBar);
    wrapper.append(mediaCol, detailsCol);
    container.append(wrapper);
    const commentsSection = createCommentsBlock(post.id, Boolean(viewer?.userId));
    commentsSection.classList.add('aqua-post-modal-comments');
    container.append(commentsSection);
    await initializeCommentsUi(commentsSection, viewer?.userId || null);
  }

  function ensureModalState(openEditModal, openQuickViewModal) {
    if (feedState.modalState) {
      return feedState.modalState;
    }
    const quickViewModal = document.createElement('div');
    quickViewModal.className = 'modal fade';
    quickViewModal.tabIndex = -1;
    quickViewModal.setAttribute('aria-hidden', 'true');
    quickViewModal.innerHTML = `<div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"><div class="modal-content aqua-post-modal"><div class="modal-header"><h2 class="modal-title fs-5" data-post-quick-title>Post preview</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body" data-post-quick-body></div><div class="modal-footer"><a class="btn btn-outline-secondary" href="/index.html" data-post-open-detail>Open detail page</a><button type="button" class="btn btn-primary d-none" data-post-open-edit>Edit post</button></div></div></div>`;
    const editModal = document.createElement('div');
    editModal.className = 'modal fade';
    editModal.tabIndex = -1;
    editModal.setAttribute('aria-hidden', 'true');
    editModal.innerHTML = `<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content aqua-post-modal"><div class="modal-header"><h2 class="modal-title fs-5">Edit post</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form data-post-edit-form><div class="modal-body d-flex flex-column gap-3"><div class="alert alert-danger d-none mb-0" role="alert" data-post-edit-error></div><div><label class="form-label" for="post-edit-title">Title</label><input id="post-edit-title" type="text" class="form-control" maxlength="120" required data-post-edit-title /></div><div><label class="form-label" for="post-edit-category">Category</label><select id="post-edit-category" class="form-select" data-post-edit-category></select></div><div><label class="form-label" for="post-edit-body">Content</label><textarea id="post-edit-body" class="form-control" rows="6" maxlength="5000" required data-post-edit-body></textarea></div><div><label class="form-label" for="post-edit-image">Post Images</label><input id="post-edit-image" type="file" class="form-control" accept="image/*" capture="environment" multiple data-post-edit-image /></div><div><label class="form-label" for="post-edit-image-camera">Снимка от камера</label><input id="post-edit-image-camera" type="file" class="form-control" accept="image/*" capture="environment" data-post-edit-image-camera /></div><section class="d-none" data-post-edit-current-image-section><h3 class="h6 mb-2">Current Images</h3><div class="row g-2" data-post-edit-current-image-list></div></section></div><div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary" data-post-edit-submit>Save changes</button></div></form></div></div>`;
    document.body.append(quickViewModal, editModal);
    const modalApi = globalThis.bootstrap?.Modal;
    const modalState = {
      quickViewModal,
      editModal,
      quickModalApi: modalApi ? modalApi.getOrCreateInstance(quickViewModal) : null,
      editModalApi: modalApi ? modalApi.getOrCreateInstance(editModal) : null,
      quickTitle: quickViewModal.querySelector('[data-post-quick-title]'),
      quickBody: quickViewModal.querySelector('[data-post-quick-body]'),
      quickDetailLink: quickViewModal.querySelector('[data-post-open-detail]'),
      quickEditButton: quickViewModal.querySelector('[data-post-open-edit]'),
      editForm: editModal.querySelector('[data-post-edit-form]'),
      editError: editModal.querySelector('[data-post-edit-error]'),
      editTitle: editModal.querySelector('[data-post-edit-title]'),
      editCategory: editModal.querySelector('[data-post-edit-category]'),
      editBody: editModal.querySelector('[data-post-edit-body]'),
      editImage: editModal.querySelector('[data-post-edit-image]'),
      editCameraImage: editModal.querySelector('[data-post-edit-image-camera]'),
      editCurrentImageSection: editModal.querySelector('[data-post-edit-current-image-section]'),
      editCurrentImageList: editModal.querySelector('[data-post-edit-current-image-list]'),
      editSubmit: editModal.querySelector('[data-post-edit-submit]'),
      currentPostId: null,
      saveInProgress: false
    };
    modalState.quickEditButton?.addEventListener('click', () => {
      const post = getPostFromCache(modalState.currentPostId);
      if (post) {
        openEditModal(post);
      }
    });
    modalState.editForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (modalState.saveInProgress) {
        return;
      }
      const postId = modalState.currentPostId;
      const sourcePost = getPostFromCache(postId);
      if (!postId || !sourcePost) {
        return;
      }
      const title = modalState.editTitle instanceof HTMLInputElement ? modalState.editTitle.value.trim() : '';
      const body = modalState.editBody instanceof HTMLTextAreaElement ? modalState.editBody.value.trim() : '';
      const categoryId = modalState.editCategory instanceof HTMLSelectElement ? modalState.editCategory.value || null : null;
      const viewerUserId = feedState.cache.viewer?.userId || null;
      const validationError = validatePostEditInput(title, body, categoryId, feedState.cache.categories || []);
      if (validationError) {
        if (modalState.editError) {
          modalState.editError.textContent = validationError;
          modalState.editError.classList.remove('d-none');
        }
        return;
      }
      if (modalState.editError) {
        modalState.editError.textContent = '';
        modalState.editError.classList.add('d-none');
      }
      if (!viewerUserId) {
        if (modalState.editError) {
          modalState.editError.textContent = 'Трябва да сте влезли, за да редактирате публикация.';
          modalState.editError.classList.remove('d-none');
        }
        return;
      }
      modalState.saveInProgress = true;
      if (modalState.editSubmit instanceof HTMLButtonElement) {
        modalState.editSubmit.disabled = true;
        modalState.editSubmit.textContent = 'Saving...';
      }
      try {
        const updated = await updatePost(postId, { title, body, categoryId, section: sourcePost.categorySection || 'forum' });
        const files = getFilesFromInputs(modalState.editImage, modalState.editCameraImage);
        const photosToRemove = getSelectedPhotosForRemoval(modalState.editCurrentImageList);
        const newlyCreatedPhotos = [];
        try {
          for (const file of files) {
            const createdPhoto = await uploadAndCreatePhoto(file, viewerUserId, postId);
            newlyCreatedPhotos.push(createdPhoto);
          }
        } catch (uploadError) {
          await Promise.all(newlyCreatedPhotos.map((photo) => rollbackPhoto(photo)));
          throw uploadError;
        }
        for (const photo of photosToRemove) {
          await removePhoto(photo);
        }
        const removedIds = new Set(photosToRemove.map((photo) => photo.id));
        const remainingPhotos = (sourcePost.photos || []).filter((photo) => !removedIds.has(photo.id));
        const nextPhotos = [...remainingPhotos, ...newlyCreatedPhotos];
        const previousPosts = feedState.cache.postsWithUiData || [];
        feedState.cache.postsWithUiData = previousPosts.map((post) => post.id !== postId ? post : { ...post, ...updated, photos: nextPhotos });
        modalState.editModalApi?.hide();
        window.setTimeout(() => {
          forceCloseModal(modalState.editModal);
          forceCloseModal(modalState.quickViewModal);
        }, 220);
        const notificationRoot = document.querySelector('[data-feed-notifications]');
        if (notificationRoot) {
          notificationRoot.replaceChildren(createNotification('Post updated successfully.', 'success'));
        }
        scheduleFeedLoad({ forceRefresh: true });
      } catch (error) {
        if (modalState.editError) {
          modalState.editError.textContent = error.message || 'Unable to save post changes.';
          modalState.editError.classList.remove('d-none');
        }
      } finally {
        modalState.saveInProgress = false;
        if (modalState.editSubmit instanceof HTMLButtonElement) {
          modalState.editSubmit.disabled = false;
          modalState.editSubmit.textContent = 'Save changes';
        }
      }
    });
    feedState.modalState = modalState;
    return modalState;
  }

  async function openQuickViewModal(post) {
    const modalState = ensureModalState(openEditModal, openQuickViewModal);
    const viewer = feedState.cache.viewer;
    modalState.currentPostId = post.id;
    if (modalState.quickTitle) {
      modalState.quickTitle.textContent = post.title;
    }
    if (modalState.quickDetailLink instanceof HTMLAnchorElement) {
      modalState.quickDetailLink.href = `/post-detail.html?id=${encodeURIComponent(post.id)}`;
    }
    modalState.quickEditButton?.classList.toggle('d-none', !getPostManageState(post));
    await renderQuickViewBody(modalState.quickBody, post, viewer);
    modalState.quickModalApi?.show();
  }

  function openEditModal(post) {
    const modalState = ensureModalState(openEditModal, openQuickViewModal);
    modalState.currentPostId = post.id;
    modalState.quickModalApi?.hide();
    forceCloseModal(modalState.quickViewModal);
    if (modalState.editError) {
      modalState.editError.textContent = '';
      modalState.editError.classList.add('d-none');
    }
    if (modalState.editTitle instanceof HTMLInputElement) {
      modalState.editTitle.value = post.title || '';
    }
    if (modalState.editBody instanceof HTMLTextAreaElement) {
      modalState.editBody.value = post.body || '';
    }
    if (modalState.editImage instanceof HTMLInputElement) {
      modalState.editImage.value = '';
    }
    if (modalState.editCameraImage instanceof HTMLInputElement) {
      modalState.editCameraImage.value = '';
    }
    if (modalState.editCategory instanceof HTMLSelectElement) {
      const categories = feedState.cache.categories || [];
      modalState.editCategory.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = categories.length ? 'Select category' : 'Uncategorized';
      modalState.editCategory.append(placeholder);
      categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = getScopedCategoryDisplayName(category.name, category.slug, category.section);
        modalState.editCategory.append(option);
      });
      modalState.editCategory.value = post.categoryId || '';
    }
    renderExistingModalImages(modalState.editCurrentImageSection, modalState.editCurrentImageList, post.photos || []);
    modalState.editModalApi?.show();
  }

  return {
    openQuickViewModal,
    openEditModal
  };
}