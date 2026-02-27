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

export function renderGallery(mainElement, thumbsElement, photos, title) {
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

export function renderPost(elements, post, author, defaultAvatar) {
  if (!elements.card) {
    return;
  }

  if (elements.authorAvatar) {
    elements.authorAvatar.src = author.avatarUrl || defaultAvatar;
    elements.authorAvatar.alt = `${author.displayName} avatar`;
    elements.authorAvatar.addEventListener('error', () => {
      elements.authorAvatar.src = defaultAvatar;
    }, { once: true });
  }

  if (elements.authorLink) {
    elements.authorLink.href = `/profile.html?user=${encodeURIComponent(author.id)}`;
    elements.authorLink.textContent = author.username
      ? `@${author.username}`
      : (author.displayName || 'User');
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
