export { renderPostCard } from './posts-ui-card.js';


export function createNotification(message, type = 'danger') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} mb-3`;
  alert.setAttribute('role', 'alert');
  alert.textContent = message;
  return alert;
}


export function focusPostFromHash() {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#post-')) {
    return;
  }

  const targetId = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(targetId);

  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const card = target.querySelector('.card');
  if (!(card instanceof HTMLElement)) {
    return;
  }

  card.classList.add('border-primary', 'border-2');
  window.setTimeout(() => {
    card.classList.remove('border-primary', 'border-2');
  }, 2200);
}

function getCommentIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('comment');
  return value && value.trim() ? value.trim() : null;
}

export function focusCommentFromQuery() {
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

export function renderEmptyState(container, message = 'Be the first to create a post.') {
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
  emptyText.textContent = message;

  emptyBody.append(emptyTitle, emptyText);
  emptyCard.append(emptyBody);
  emptyColumn.append(emptyCard);
  container.append(emptyColumn);
}

export function getCategoryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('category');
  return value && value.trim() ? value.trim() : '';
}

export function setCategoryInQuery(categorySlug) {
  const params = new URLSearchParams(window.location.search);

  if (categorySlug) {
    params.set('category', categorySlug);
  } else {
    params.delete('category');
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    window.history.pushState(null, '', nextUrl);
  }
}
