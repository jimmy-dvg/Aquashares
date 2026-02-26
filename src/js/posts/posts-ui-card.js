import { createCommentsBlock } from '../comments/comments-ui.js';

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

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diff = timestamp - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diff) < hour) {
    return rtf.format(Math.round(diff / minute), 'minute');
  }

  if (Math.abs(diff) < day) {
    return rtf.format(Math.round(diff / hour), 'hour');
  }

  return rtf.format(Math.round(diff / day), 'day');
}

function getRoleLabel(author) {
  if (author.role === 'admin') {
    return 'Admin';
  }

  return 'User';
}

function getCategoryLabel(post) {
  return post.categoryName || 'Uncategorized';
}

function getPostDetailHref(postId) {
  return `/post-detail.html?id=${encodeURIComponent(postId)}`;
}

function createAvatar(author) {
  const avatar = document.createElement('img');
  avatar.className = 'rounded-circle flex-shrink-0 aqua-post-avatar';
  avatar.width = 40;
  avatar.height = 40;
  avatar.loading = 'lazy';
  avatar.alt = `${author.displayName} avatar`;
  avatar.src = author.avatarUrl || '/assets/avatars/default-avatar.svg';

  avatar.addEventListener('error', () => {
    avatar.src = '/assets/avatars/default-avatar.svg';
  }, { once: true });

  return avatar;
}

function createPostImage(post) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ratio ratio-16x9 aqua-post-media';

  const photos = post.photos?.filter((photo) => Boolean(photo?.publicUrl)) || [];
  const primaryPhoto = photos[0];

  if (!primaryPhoto?.publicUrl) {
    const placeholder = document.createElement('div');
    placeholder.className = 'aqua-post-media-placeholder';

    const icon = document.createElement('i');
    icon.className = 'bi bi-image';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'small';
    text.textContent = 'No image';

    placeholder.append(icon, text);
    wrapper.append(placeholder);
    return wrapper;
  }

  const image = document.createElement('img');
  image.className = 'aqua-post-media-img aqua-media-fade';
  image.src = primaryPhoto.publicUrl;
  image.alt = post.title;
  image.loading = 'lazy';

  image.addEventListener('error', () => {
    wrapper.replaceChildren();

    const placeholder = document.createElement('div');
    placeholder.className = 'aqua-post-media-placeholder';

    const icon = document.createElement('i');
    icon.className = 'bi bi-image';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'small';
    text.textContent = 'Image unavailable';

    placeholder.append(icon, text);
    wrapper.append(placeholder);
  }, { once: true });

  if (photos.length > 1) {
    let activeIndex = 0;
    let intervalId = null;

    const swapToPhoto = (nextPhoto) => {
      if (!nextPhoto?.publicUrl) {
        return;
      }

      image.classList.add('is-fading');

      const handleLoaded = () => {
        image.classList.remove('is-fading');
      };

      image.addEventListener('load', handleLoaded, { once: true });
      image.src = nextPhoto.publicUrl;
    };

    const updateImage = (nextIndex) => {
      const nextPhoto = photos[nextIndex];
      if (!nextPhoto?.publicUrl) {
        return;
      }

      activeIndex = nextIndex;
      swapToPhoto(nextPhoto);
    };

    const startCarousel = () => {
      if (intervalId) {
        return;
      }

      intervalId = window.setInterval(() => {
        if (!document.body.contains(wrapper)) {
          window.clearInterval(intervalId);
          intervalId = null;
          return;
        }

        const nextIndex = (activeIndex + 1) % photos.length;
        updateImage(nextIndex);
      }, 1200);
    };

    const stopCarousel = () => {
      if (!intervalId) {
        return;
      }

      window.clearInterval(intervalId);
      intervalId = null;
      updateImage(0);
    };

    wrapper.addEventListener('mouseenter', startCarousel);
    wrapper.addEventListener('mouseleave', stopCarousel);
  }

  wrapper.append(image);
  return wrapper;
}

export function renderPostCard(post, canManage = false, isAuthenticated = false) {
  const column = document.createElement('div');
  column.className = 'col-12 col-md-6 col-xl-4';
  column.dataset.postId = post.id;
  column.id = `post-${post.id}`;

  const article = document.createElement('article');
  article.className = 'card h-100 aqua-post-card';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column gap-3';

  const header = document.createElement('div');
  header.className = 'd-flex justify-content-between align-items-start gap-2';

  const authorWrap = document.createElement('div');
  authorWrap.className = 'd-flex align-items-center gap-2 min-w-0';

  const avatar = createAvatar(post.author);

  const authorMeta = document.createElement('div');
  authorMeta.className = 'min-w-0';

  const authorLink = document.createElement('a');
  authorLink.href = `/profile.html?user=${encodeURIComponent(post.author.id)}`;
  authorLink.className = 'fw-semibold text-decoration-none d-inline-block aqua-truncate-1';
  authorLink.textContent = post.author.username ? `@${post.author.username}` : '@user';

  const subMeta = document.createElement('div');
  subMeta.className = 'd-flex align-items-center gap-2 text-muted small';

  const roleBadge = document.createElement('span');
  roleBadge.className = 'badge rounded-pill text-bg-light border';
  roleBadge.textContent = getRoleLabel(post.author);

  const timestamp = document.createElement('span');
  timestamp.textContent = formatRelativeTime(post.createdAt);
  timestamp.title = formatDate(post.createdAt);

  subMeta.append(roleBadge, timestamp);
  authorMeta.append(authorLink, subMeta);
  authorWrap.append(avatar, authorMeta);
  header.append(authorWrap);

  if (canManage) {
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'btn btn-sm btn-outline-secondary';
    toggleButton.setAttribute('data-bs-toggle', 'dropdown');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-label', 'Post actions');

    const dotsIcon = document.createElement('i');
    dotsIcon.className = 'bi bi-three-dots-vertical';
    dotsIcon.setAttribute('aria-hidden', 'true');
    toggleButton.append(dotsIcon);

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end';

    const editItemWrap = document.createElement('li');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'dropdown-item';
    editButton.dataset.action = 'edit-post';
    editButton.dataset.postId = post.id;
    editButton.textContent = 'Edit Post';
    editItemWrap.append(editButton);

    const deleteItemWrap = document.createElement('li');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'dropdown-item text-danger';
    deleteButton.dataset.action = 'delete-post';
    deleteButton.dataset.postId = post.id;
    deleteButton.textContent = 'Delete Post';
    deleteItemWrap.append(deleteButton);

    menu.append(editItemWrap, deleteItemWrap);
    dropdown.append(toggleButton, menu);
    header.append(dropdown);
  }

  const media = createPostImage(post);
  const mediaLink = document.createElement('a');
  mediaLink.href = getPostDetailHref(post.id);
  mediaLink.className = 'text-decoration-none';
  mediaLink.append(media);

  const content = document.createElement('div');

  const category = document.createElement(post.categorySlug ? 'a' : 'span');
  category.className = 'badge text-bg-secondary-subtle text-secondary-emphasis mb-2 text-decoration-none';
  category.textContent = getCategoryLabel(post);

  if (post.categorySlug) {
    category.href = `/index.html?category=${encodeURIComponent(post.categorySlug)}`;
    category.classList.add('aqua-category-link');
    category.setAttribute('aria-label', `Filter by ${getCategoryLabel(post)} category`);
  }

  const title = document.createElement('h2');
  title.className = 'h6 mb-1 aqua-truncate-2';

  const titleLink = document.createElement('a');
  titleLink.href = getPostDetailHref(post.id);
  titleLink.className = 'text-decoration-none text-body';
  titleLink.textContent = post.title;

  title.append(titleLink);

  const body = document.createElement('p');
  body.className = 'text-secondary mb-0 aqua-truncate-3';
  body.textContent = post.body;

  content.append(category, title, body);

  const interactionBar = document.createElement('div');
  interactionBar.className = 'd-flex align-items-center justify-content-between mt-auto pt-2 border-top';

  const commentsInfo = document.createElement('div');
  commentsInfo.className = 'd-inline-flex align-items-center gap-1 text-muted small';

  const commentsIcon = document.createElement('i');
  commentsIcon.className = 'bi bi-chat-dots';
  commentsIcon.setAttribute('aria-hidden', 'true');

  const commentsText = document.createElement('span');
  commentsText.textContent = `${post.commentCount} comments`;
  commentsInfo.append(commentsIcon, commentsText);

  const likeButton = document.createElement('button');
  likeButton.type = 'button';
  likeButton.className = 'btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1';
  likeButton.disabled = true;
  likeButton.setAttribute('aria-label', 'Like post (coming soon)');

  const likeIcon = document.createElement('i');
  likeIcon.className = 'bi bi-heart';
  likeIcon.setAttribute('aria-hidden', 'true');

  const likeText = document.createElement('span');
  likeText.textContent = 'Like';
  likeButton.append(likeIcon, likeText);

  interactionBar.append(commentsInfo, likeButton);

  cardBody.append(header, mediaLink, content, interactionBar, createCommentsBlock(post.id, isAuthenticated));
  article.append(cardBody);
  column.append(article);

  return column;
}
