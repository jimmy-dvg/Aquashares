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

export function getSearchFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('q');
  return value && value.trim() ? value.trim() : '';
}

export function getLocationFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('location');
  return value && value.trim() ? value.trim() : '';
}

export function getAuthorFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('author');
  return value && value.trim() ? value.trim() : '';
}

export function getDateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('date_from');
  return value && value.trim() ? value.trim() : '';
}

export function getDateToQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('date_to');
  return value && value.trim() ? value.trim() : '';
}

export function getNearMeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('near_me') === '1';
}

export function getRadiusKmFromQuery(defaultValue = 25) {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get('radius_km') || '');

  if (!Number.isFinite(value) || value <= 0) {
    return defaultValue;
  }

  return Math.round(value);
}

export function setFeedFiltersInQuery(filters = {}) {
  const params = new URLSearchParams(window.location.search);

  const applyValue = (key, value) => {
    if (value === undefined) {
      return;
    }

    const normalized = (value || '').trim();
    if (normalized) {
      params.set(key, normalized);
      return;
    }

    params.delete(key);
  };

  applyValue('category', filters.category);
  applyValue('q', filters.query);
  applyValue('location', filters.location);
  applyValue('author', filters.author);
  applyValue('date_from', filters.dateFrom);
  applyValue('date_to', filters.dateTo);

  if (filters.nearMe !== undefined) {
    if (filters.nearMe) {
      params.set('near_me', '1');
    } else {
      params.delete('near_me');
    }
  }

  if (filters.radiusKm !== undefined) {
    const radius = Number(filters.radiusKm);
    if (Number.isFinite(radius) && radius > 0) {
      params.set('radius_km', String(Math.round(radius)));
    } else {
      params.delete('radius_km');
    }
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentUrl !== nextUrl) {
    window.history.pushState(null, '', nextUrl);
  }
}

export function setCategoryInQuery(categorySlug) {
  setFeedFiltersInQuery({ category: categorySlug });
}

export function setSearchInQuery(searchText) {
  setFeedFiltersInQuery({ query: searchText });
}
