import { supabase } from '../services/supabase-client.js';
import { deletePost, getAllPosts } from './posts-service.js';

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function createNotification(message, type = 'danger') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} mb-3`;
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  return alert;
}

function createImagePlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.className = 'bg-light border-bottom d-flex align-items-center justify-content-center text-secondary';
  placeholder.style.height = '180px';
  placeholder.textContent = 'No image';
  return placeholder;
}

function createCardImage(post) {
  const primaryPhoto = post.photos?.[0];

  if (!primaryPhoto?.publicUrl) {
    return createImagePlaceholder();
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'position-relative';

  const image = document.createElement('img');
  image.className = 'card-img-top';
  image.style.height = '180px';
  image.style.objectFit = 'cover';
  image.src = primaryPhoto.publicUrl;
  image.alt = post.title;
  image.loading = 'lazy';

  image.addEventListener('error', () => {
    wrapper.replaceChildren(createImagePlaceholder());
  }, { once: true });

  wrapper.append(image);
  return wrapper;
}

export function renderPostCard(post, canManage = false) {
  const column = document.createElement('div');
  column.className = 'col-12 col-md-6 col-lg-4';
  column.dataset.postId = post.id;

  const article = document.createElement('article');
  article.className = 'card h-100';

  const imageElement = createCardImage(post);

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column';

  const title = document.createElement('h2');
  title.className = 'h5 card-title';
  title.textContent = post.title;

  const body = document.createElement('p');
  body.className = 'card-text text-secondary';
  body.textContent = post.body;

  const meta = document.createElement('small');
  meta.className = 'text-muted mt-auto';
  meta.textContent = formatDate(post.createdAt);

  cardBody.append(title, body, meta);

  if (canManage) {
    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2 mt-3';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn-sm btn-outline-primary';
    editButton.dataset.action = 'edit-post';
    editButton.dataset.postId = post.id;
    editButton.textContent = 'Edit';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-sm btn-outline-danger';
    deleteButton.dataset.action = 'delete-post';
    deleteButton.dataset.postId = post.id;
    deleteButton.textContent = 'Delete';

    actions.append(editButton, deleteButton);
    cardBody.append(actions);
  }
  article.append(imageElement, cardBody);
  column.append(article);

  return column;
}

function renderEmptyState(container) {
  container.replaceChildren();
  const emptyColumn = document.createElement('div');
  emptyColumn.className = 'col-12';

  const emptyCard = document.createElement('article');
  emptyCard.className = 'card';

  const emptyBody = document.createElement('div');
  emptyBody.className = 'card-body';

  const emptyTitle = document.createElement('h2');
  emptyTitle.className = 'h5 card-title';
  emptyTitle.textContent = 'No posts yet';

  const emptyText = document.createElement('p');
  emptyText.className = 'card-text text-secondary mb-0';
  emptyText.textContent = 'Be the first to create a post.';

  emptyBody.append(emptyTitle, emptyText);
  emptyCard.append(emptyBody);
  emptyColumn.append(emptyCard);
  container.append(emptyColumn);
}

function renderFeedPosts(posts, container, canManagePost) {
  container.replaceChildren();

  if (!posts.length) {
    renderEmptyState(container);
    return;
  }

  const fragment = document.createDocumentFragment();
  posts.forEach((post) => {
    fragment.append(renderPostCard(post, canManagePost(post)));
  });

  container.append(fragment);
}

function getUiElements() {
  return {
    feedContainer: document.querySelector('[data-feed-list]'),
    loadingElement: document.querySelector('[data-feed-loading]'),
    errorElement: document.querySelector('[data-feed-error]'),
    notificationRoot: document.querySelector('[data-feed-notifications]')
  };
}

function setLoadingState(isLoading, loadingElement) {
  if (!loadingElement) {
    return;
  }

  if (isLoading) {
    loadingElement.classList.remove('d-none');
    return;
  }

  loadingElement.classList.add('d-none');
}

function clearError(errorElement) {
  if (!errorElement) {
    return;
  }

  errorElement.classList.add('d-none');
  errorElement.textContent = '';
}

function showError(errorElement, message) {
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.remove('d-none');
}

async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.user?.id) {
    return {
      userId: null,
      isAdmin: false
    };
  }

  const viewer = {
    userId: session.user.id,
    isAdmin: false
  };

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (roleData?.role === 'admin') {
    viewer.isAdmin = true;
  }

  return viewer;
}

export function attachEditHandler(container) {
  if (!container || container.dataset.editBound === 'true') {
    return;
  }

  container.dataset.editBound = 'true';
  container.addEventListener('click', (event) => {
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

    window.location.assign(`/post-create.html?id=${encodeURIComponent(postId)}`);
  });
}

export function attachDeleteHandler(container, afterDelete) {
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

    const isConfirmed = window.confirm('Delete this post?');
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

export async function loadFeed() {
  const { feedContainer, loadingElement, errorElement, notificationRoot } = getUiElements();

  if (!feedContainer) {
    return;
  }

  setLoadingState(true, loadingElement);
  clearError(errorElement);
  if (notificationRoot) {
    notificationRoot.replaceChildren();
  }

  try {
    const [posts, viewer] = await Promise.all([getAllPosts(), getViewerState()]);
    const canManagePost = (post) => Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);

    renderFeedPosts(posts, feedContainer, canManagePost);
    attachEditHandler(feedContainer);
    attachDeleteHandler(feedContainer, loadFeed);
  } catch (error) {
    showError(errorElement, error.message || 'Unable to load feed right now. Please try again.');
  } finally {
    setLoadingState(false, loadingElement);
  }
}
