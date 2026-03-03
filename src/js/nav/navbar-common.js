function normalizeNavPathname(pathname) {
  return pathname === '/' ? '/index.html' : pathname;
}

export function initializeTooltips() {
  const tooltipApi = globalThis.bootstrap?.Tooltip;
  if (!tooltipApi) {
    return;
  }

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
    tooltipApi.getOrCreateInstance(element);
  });
}

export function getFeedSectionFromPathname(pathname = window.location.pathname) {
  const normalized = normalizeNavPathname(pathname);
  if (normalized === '/giveaway.html') {
    return 'giveaway';
  }

  if (normalized === '/exchange.html') {
    return 'exchange';
  }

  if (normalized === '/wanted.html') {
    return 'wanted';
  }

  if (normalized === '/index.html') {
    return 'forum';
  }

  return '';
}

export function getCreatePostHrefForSection(section) {
  const normalizedSection = (section || '').trim().toLowerCase();
  if (!normalizedSection) {
    return '/post-create.html';
  }

  return `/post-create.html?section=${encodeURIComponent(normalizedSection)}`;
}