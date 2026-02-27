function formatLikeCount(value) {
  const count = Number(value) || 0;
  return `${count}`;
}

function updateLikeButtonVisualState(button, state) {
  const icon = button.querySelector('[data-like-icon]');
  const text = button.querySelector('[data-like-label]');
  const count = button.querySelector('[data-like-count]');

  if (icon instanceof HTMLElement) {
    icon.className = state.likedByViewer ? 'bi bi-heart-fill' : 'bi bi-heart';
    icon.setAttribute('aria-hidden', 'true');
  }

  if (text instanceof HTMLElement) {
    text.textContent = state.likedByViewer ? 'Liked' : 'Like';
  }

  if (count instanceof HTMLElement) {
    count.textContent = formatLikeCount(state.likeCount);
  }

  button.classList.toggle('btn-outline-secondary', !state.likedByViewer);
  button.classList.toggle('btn-primary', state.likedByViewer);
}

export function setLikeButtonState(button, state) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const isAuthenticated = state.isAuthenticated === true;
  const isPending = state.isPending === true;

  button.dataset.postId = state.postId;
  button.dataset.action = 'toggle-like';
  button.dataset.liked = state.likedByViewer ? 'true' : 'false';
  button.dataset.likeCount = String(state.likeCount || 0);
  button.dataset.pending = isPending ? 'true' : 'false';

  updateLikeButtonVisualState(button, state);

  button.disabled = isPending || !isAuthenticated;

  if (!isAuthenticated) {
    button.setAttribute('title', 'Log in to like posts');
    button.setAttribute('aria-label', 'Log in to like posts');
    return;
  }

  button.removeAttribute('title');
  button.setAttribute('aria-label', state.likedByViewer ? 'Remove like' : 'Like post');
}

export function createLikeButton(state) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm d-inline-flex align-items-center gap-1 aqua-like-button';

  const icon = document.createElement('i');
  icon.dataset.likeIcon = 'true';

  const label = document.createElement('span');
  label.dataset.likeLabel = 'true';

  const count = document.createElement('span');
  count.dataset.likeCount = 'true';
  count.className = 'badge rounded-pill text-bg-light border aqua-like-count';

  button.append(icon, label, count);
  setLikeButtonState(button, state);

  return button;
}
