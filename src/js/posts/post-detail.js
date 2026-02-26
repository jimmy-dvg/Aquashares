import { getCurrentUserRole } from '../auth/auth-guard.js';
import { cleanupCommentsUi, createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';
import { supabase } from '../services/supabase-client.js';
import { deletePost, getPostById } from './posts-service.js';

const DEFAULT_AVATAR = '/assets/avatars/default-avatar.svg';

function getElements() {
  return {
    page: document.querySelector('[data-post-detail-page]'),
    loading: document.querySelector('[data-post-detail-loading]'),
    error: document.querySelector('[data-post-detail-error]'),
    card: document.querySelector('[data-post-detail-card]'),
    authorAvatar: document.querySelector('[data-post-author-avatar]'),
    authorLink: document.querySelector('[data-post-author-link]'),
    authorRole: document.querySelector('[data-post-author-role]'),
    createdAt: document.querySelector('[data-post-created-at]'),
    category: document.querySelector('[data-post-category]'),
    title: document.querySelector('[data-post-title]'),
    body: document.querySelector('[data-post-body]'),
    galleryMain: document.querySelector('[data-post-gallery-main]'),
    galleryThumbs: document.querySelector('[data-post-gallery-thumbs]'),
    commentsRoot: document.querySelector('[data-post-comments-root]'),
    actions: document.querySelector('[data-post-actions]'),
    editButton: document.querySelector('[data-post-edit]'),
    deleteButton: document.querySelector('[data-post-delete]')
  };
}

function getPostIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('id');
  return value && value.trim() ? value.trim() : null;
}

function getCommentIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('comment');
  return value && value.trim() ? value.trim() : null;
}

async function resolvePostId(postId, commentId) {
  if (postId) {
    return postId;
  }

  if (!commentId) {
    return null;
  }

  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .eq('id', commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to resolve post from comment.');
  }

  return data?.post_id || null;
}

function setLoading(elements, isLoading) {
  if (!elements.loading) {
    return;
  }

  elements.loading.classList.toggle('d-none', !isLoading);
}

function showError(elements, message) {
  if (!elements.error) {
    return;
  }

  elements.error.textContent = message;
  elements.error.classList.remove('d-none');
}

function clearError(elements) {
  if (!elements.error) {
    return;
  }

  elements.error.textContent = '';
  elements.error.classList.add('d-none');
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getRoleLabel(role) {
  return role === 'admin' ? 'Admin' : 'User';
}

async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const viewerUserId = data?.session?.user?.id || null;

  if (!viewerUserId) {
    return {
      userId: null,
      role: null,
      isAdmin: false
    };
  }

  let role = null;

  try {
    role = await getCurrentUserRole(viewerUserId);
  } catch {
    role = 'user';
  }

  return {
    userId: viewerUserId,
    role,
    isAdmin: role === 'admin'
  };
}

async function getAuthorData(authorId) {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', authorId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authorId)
      .maybeSingle()
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Unable to load author profile.');
  }

  const profile = profileResult.data;

  return {
    id: authorId,
    username: profile?.username || 'user',
    displayName: profile?.display_name || profile?.username || 'Aquashares User',
    avatarUrl: profile?.avatar_url || DEFAULT_AVATAR,
    role: roleResult.error ? 'user' : (roleResult.data?.role || 'user')
  };
}

function renderGallery(mainElement, thumbsElement, photos, title) {
  if (!mainElement || !thumbsElement) {
    return;
  }

  mainElement.replaceChildren();
  thumbsElement.replaceChildren();
  mainElement.removeAttribute('tabindex');
  mainElement.removeAttribute('aria-label');

  const placeholder = document.createElement('div');
  placeholder.className = 'aqua-post-media-placeholder';

  const placeholderIcon = document.createElement('i');
  placeholderIcon.className = 'bi bi-image';
  placeholderIcon.setAttribute('aria-hidden', 'true');

  const placeholderText = document.createElement('span');
  placeholderText.className = 'small';
  placeholderText.textContent = 'No image';

  placeholder.append(placeholderIcon, placeholderText);

  const image = document.createElement('img');
  image.className = 'aqua-post-detail-main-image aqua-media-fade d-none';
  image.alt = title || 'Post image';
  image.loading = 'eager';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'btn btn-dark aqua-post-carousel-nav aqua-post-carousel-nav-prev d-none';
  prevButton.setAttribute('aria-label', 'Previous image');
  prevButton.innerHTML = '<i class="bi bi-chevron-left" aria-hidden="true"></i>';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'btn btn-dark aqua-post-carousel-nav aqua-post-carousel-nav-next d-none';
  nextButton.setAttribute('aria-label', 'Next image');
  nextButton.innerHTML = '<i class="bi bi-chevron-right" aria-hidden="true"></i>';

  const counter = document.createElement('span');
  counter.className = 'badge text-bg-dark aqua-post-carousel-counter d-none';

  mainElement.append(placeholder, image, prevButton, nextButton, counter);

  if (!photos.length) {
    return;
  }

  let activePhotoIndex = 0;

  const setPhoto = (nextIndex, animated = true) => {
    const nextPhoto = photos[nextIndex];
    if (!nextPhoto?.publicUrl) {
      return;
    }

    activePhotoIndex = nextIndex;

    if (animated) {
      image.classList.add('is-fading');
    }

    image.addEventListener('load', () => {
      image.classList.remove('d-none');
      placeholder.classList.add('d-none');
      image.classList.remove('is-fading');
    }, { once: true });

    image.addEventListener('error', () => {
      image.classList.add('d-none');
      placeholder.classList.remove('d-none');
      image.classList.remove('is-fading');
    }, { once: true });

    image.src = nextPhoto.publicUrl;
    image.alt = `${title || 'Post image'} ${nextIndex + 1}`;

    counter.textContent = `${nextIndex + 1} / ${photos.length}`;
  };

  const updateActiveState = () => {
    setPhoto(activePhotoIndex);

    thumbsElement.querySelectorAll('[data-photo-index]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const index = Number(button.dataset.photoIndex || '-1');
      button.classList.toggle('active', index === activePhotoIndex);
      button.setAttribute('aria-pressed', index === activePhotoIndex ? 'true' : 'false');
    });
  };

  const fragment = document.createDocumentFragment();

  photos.forEach((photo, index) => {
    const thumbButton = document.createElement('button');
    thumbButton.type = 'button';
    thumbButton.className = 'btn p-0 border rounded-2 overflow-hidden aqua-post-detail-thumb';
    thumbButton.dataset.photoIndex = String(index);
    thumbButton.setAttribute('aria-label', `View image ${index + 1}`);

    const thumbImage = document.createElement('img');
    thumbImage.src = photo.publicUrl;
    thumbImage.alt = `${title} thumbnail ${index + 1}`;
    thumbImage.loading = 'lazy';
    thumbImage.className = 'aqua-post-detail-thumb-image';

    thumbImage.addEventListener('error', () => {
      thumbButton.remove();
    }, { once: true });

    thumbButton.addEventListener('click', () => {
      activePhotoIndex = index;
      updateActiveState();
    });

    thumbButton.append(thumbImage);
    fragment.append(thumbButton);
  });

  thumbsElement.append(fragment);
  if (photos.length > 1) {
    let autoplayIntervalId = null;

    const stopAutoplay = () => {
      if (!autoplayIntervalId) {
        return;
      }

      window.clearInterval(autoplayIntervalId);
      autoplayIntervalId = null;
    };

    const startAutoplay = () => {
      if (autoplayIntervalId) {
        return;
      }

      autoplayIntervalId = window.setInterval(() => {
        if (!document.body.contains(mainElement)) {
          stopAutoplay();
          return;
        }

        activePhotoIndex = (activePhotoIndex + 1) % photos.length;
        updateActiveState();
      }, 2500);
    };

    prevButton.classList.remove('d-none');
    nextButton.classList.remove('d-none');
    counter.classList.remove('d-none');

    prevButton.addEventListener('click', () => {
      activePhotoIndex = (activePhotoIndex - 1 + photos.length) % photos.length;
      updateActiveState();
    });

    nextButton.addEventListener('click', () => {
      activePhotoIndex = (activePhotoIndex + 1) % photos.length;
      updateActiveState();
    });

    mainElement.addEventListener('mouseenter', stopAutoplay);
    mainElement.addEventListener('mouseleave', startAutoplay);
    mainElement.addEventListener('focusin', stopAutoplay);
    mainElement.addEventListener('focusout', startAutoplay);

    mainElement.setAttribute('tabindex', '0');
    mainElement.setAttribute('aria-label', 'Post image carousel. Use left and right arrow keys to navigate.');
    mainElement.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        activePhotoIndex = (activePhotoIndex - 1 + photos.length) % photos.length;
        updateActiveState();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        activePhotoIndex = (activePhotoIndex + 1) % photos.length;
        updateActiveState();
      }
    });

    startAutoplay();
  }

  updateActiveState();
}

function renderPost(elements, post, author) {
  if (!elements.card) {
    return;
  }

  if (elements.authorAvatar) {
    elements.authorAvatar.src = author.avatarUrl || DEFAULT_AVATAR;
    elements.authorAvatar.alt = `${author.displayName} avatar`;
    elements.authorAvatar.addEventListener('error', () => {
      elements.authorAvatar.src = DEFAULT_AVATAR;
    }, { once: true });
  }

  if (elements.authorLink) {
    elements.authorLink.href = `/profile.html?user=${encodeURIComponent(author.id)}`;
    elements.authorLink.textContent = author.username ? `@${author.username}` : '@user';
  }

  if (elements.authorRole) {
    elements.authorRole.textContent = getRoleLabel(author.role);
  }

  if (elements.createdAt) {
    elements.createdAt.textContent = formatDate(post.createdAt);
  }

  if (elements.category) {
    elements.category.textContent = post.categoryName || 'Uncategorized';

    if (post.categorySlug) {
      if (elements.category.tagName !== 'A') {
        const categoryLink = document.createElement('a');
        categoryLink.dataset.postCategory = 'true';
        categoryLink.className = elements.category.className;
        elements.category.replaceWith(categoryLink);
        elements.category = categoryLink;
      }

      elements.category.href = `/index.html?category=${encodeURIComponent(post.categorySlug)}`;
      elements.category.classList.add('text-decoration-none', 'aqua-category-link');
      elements.category.setAttribute('aria-label', `Filter by ${post.categoryName || 'category'}`);
    }
  }

  if (elements.title) {
    elements.title.textContent = post.title;
  }

  if (elements.body) {
    elements.body.textContent = post.body;
  }

  renderGallery(elements.galleryMain, elements.galleryThumbs, post.photos || [], post.title);
}

function bindPostActions(elements, postId) {
  if (!elements.editButton || !elements.deleteButton) {
    return;
  }

  elements.editButton.addEventListener('click', () => {
    window.location.assign(`/post-create.html?id=${encodeURIComponent(postId)}`);
  });

  elements.deleteButton.addEventListener('click', async () => {
    const confirmed = window.confirm('Delete this post?');
    if (!confirmed) {
      return;
    }

    elements.deleteButton.disabled = true;

    try {
      await deletePost(postId);
      window.location.assign('/index.html');
    } catch (error) {
      showError(elements, error.message || 'Unable to delete post.');
      elements.deleteButton.disabled = false;
    }
  });
}

function focusCommentFromQuery() {
  const commentId = getCommentIdFromQuery();
  if (!commentId) {
    return;
  }

  const target = document.getElementById(`comment-${commentId}`);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('border-primary', 'border-2');

  window.setTimeout(() => {
    target.classList.remove('border-primary', 'border-2');
  }, 2200);
}

export async function initializePostDetailPage() {
  const elements = getElements();

  if (!elements.page || !elements.card || !elements.commentsRoot) {
    return;
  }

  const requestedPostId = getPostIdFromQuery();
  const commentId = getCommentIdFromQuery();

  setLoading(elements, true);
  clearError(elements);
  cleanupCommentsUi();

  try {
    const postId = await resolvePostId(requestedPostId, commentId);

    if (!postId) {
      throw new Error('Missing post ID.');
    }

    if (!requestedPostId && commentId) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set('id', postId);
      const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
      window.history.replaceState(null, '', nextUrl);
    }

    const [post, viewer] = await Promise.all([
      getPostById(postId),
      getViewerState()
    ]);

    const author = await getAuthorData(post.userId);
    renderPost(elements, post, author);

    const canManagePost = Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);
    if (elements.actions) {
      elements.actions.classList.toggle('d-none', !canManagePost);
    }

    if (canManagePost) {
      bindPostActions(elements, post.id);
    }

    elements.commentsRoot.replaceChildren(createCommentsBlock(post.id, Boolean(viewer.userId)));
    await initializeCommentsUi(elements.commentsRoot, viewer.userId);

    elements.card.classList.remove('d-none');
    focusCommentFromQuery();
  } catch (error) {
    showError(elements, error.message || 'Unable to load post details right now.');
  } finally {
    setLoading(elements, false);
  }
}