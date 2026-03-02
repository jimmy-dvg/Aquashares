import { getCurrentUser, getCurrentUserRole, requireAdmin, requireAuth } from './auth/auth-guard.js';
import { initializeLoginForm } from './auth/login.js';
import { initializeLogout } from './auth/logout.js';
import { initializeRegisterForm } from './auth/register.js';
import { initializeChatPage } from './chat/chat-ui.js';
import { cleanupNotifications, initializeNotifications } from './notifications/notifications-ui.js';
import { initializePostDetailPage } from './posts/post-detail.js';
import { getCategories } from './posts/posts-service.js';
import { loadFeed } from './posts/posts-ui.js';
import { initializePostForm } from './posts/post-form.js';
import { initializeProfilePage } from './profile/profile-ui.js';

function toggleElements(elements, isVisible) {
  elements.forEach((element) => {
    if (isVisible) {
      element.classList.remove('d-none');
      return;
    }

    element.classList.add('d-none');
  });
}

function normalizeNavPathname(pathname) {
  return pathname === '/' ? '/index.html' : pathname;
}

function setActiveNavbarLink() {
  const pathname = normalizeNavPathname(window.location.pathname);
  const currentParams = new URLSearchParams(window.location.search);
  const currentCategory = pathname === '/index.html' ? (currentParams.get('category') || '') : '';
  const navLinks = document.querySelectorAll('#mainNavbar .navbar-nav .nav-link[href]');

  navLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const linkUrl = new URL(link.href, window.location.origin);
    const linkPath = normalizeNavPathname(linkUrl.pathname);
    const linkCategory = linkUrl.searchParams.get('category') || '';

    let isActive = false;

    if (linkPath === '/index.html') {
      isActive = pathname === '/index.html' && linkCategory === currentCategory;
    } else {
      isActive = linkPath === pathname;
    }

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
      return;
    }

    link.removeAttribute('aria-current');
  });

  const categoriesToggle = document.querySelector('[data-nav-categories-toggle]');
  if (categoriesToggle instanceof HTMLElement) {
    const categoriesActive = pathname === '/index.html' && Boolean(currentCategory);
    categoriesToggle.classList.toggle('active', categoriesActive);
    if (categoriesActive) {
      categoriesToggle.setAttribute('aria-current', 'page');
    } else {
      categoriesToggle.removeAttribute('aria-current');
    }
  }
}

function getNavbarCategoryHref(categorySlug, searchQuery = '') {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set('q', searchQuery);
  }

  if (categorySlug) {
    params.set('category', categorySlug);
  }

  const query = params.toString();
  return query ? `/index.html?${query}` : '/index.html';
}

function getCategoryIconClass(categorySlug) {
  const iconBySlug = {
    fish: 'bi bi-water',
    plants: 'bi bi-flower1',
    inhabitants: 'bi bi-emoji-smile',
    equipment: 'bi bi-tools',
    shrimp: 'bi bi-bug',
    snails: 'bi bi-circle',
    other: 'bi bi-three-dots'
  };

  return iconBySlug[categorySlug] || 'bi bi-tag';
}

function createCategoryMenuLink({ href, label, iconClass, isActive }) {
  const link = document.createElement('a');
  link.className = 'dropdown-item aqua-nav-category-item';
  link.href = href;

  const icon = document.createElement('i');
  icon.className = `${iconClass} aqua-nav-category-icon`;
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = label;

  link.append(icon, text);

  if (isActive) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }

  return link;
}

function buildNavbarCategoryItem(category, selectedCategory, searchQuery) {
  const item = document.createElement('li');
  const link = createCategoryMenuLink({
    href: getNavbarCategoryHref(category.slug, searchQuery),
    label: category.name,
    iconClass: getCategoryIconClass(category.slug),
    isActive: category.slug === selectedCategory
  });

  item.append(link);
  return item;
}

function renderNavbarCategories(categories) {
  const menuElements = document.querySelectorAll('[data-nav-categories-menu]');
  if (!menuElements.length) {
    return;
  }

  const pathname = normalizeNavPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const selectedCategory = pathname === '/index.html' ? (params.get('category') || '') : '';
  const searchQuery = pathname === '/index.html' ? (params.get('q') || '').trim() : '';

  menuElements.forEach((menuElement) => {
    if (!(menuElement instanceof HTMLElement)) {
      return;
    }

    const allCategoriesItem = document.createElement('li');
    const allCategoriesLink = createCategoryMenuLink({
      href: getNavbarCategoryHref('', searchQuery),
      label: 'All Categories',
      iconClass: 'bi bi-grid-3x3-gap',
      isActive: !selectedCategory && pathname === '/index.html'
    });

    allCategoriesItem.append(allCategoriesLink);
    menuElement.replaceChildren(allCategoriesItem);

    if (!categories.length) {
      const emptyItem = document.createElement('li');
      const emptyState = document.createElement('span');
      emptyState.className = 'dropdown-item-text text-secondary small';
      emptyState.textContent = 'No categories available';
      emptyItem.append(emptyState);
      menuElement.append(emptyItem);
      return;
    }

    const dividerItem = document.createElement('li');
    const divider = document.createElement('hr');
    divider.className = 'dropdown-divider';
    dividerItem.append(divider);
    menuElement.append(dividerItem);

    categories.forEach((category) => {
      menuElement.append(buildNavbarCategoryItem(category, selectedCategory, searchQuery));
    });
  });
}

async function initializeNavbarCategories() {
  const categoryMenus = document.querySelectorAll('[data-nav-categories-menu]');

  if (!categoryMenus.length) {
    return;
  }

  try {
    const categories = await getCategories();
    renderNavbarCategories(categories);
  } catch {
    renderNavbarCategories([]);
  }
}

function initializeNavbarSearch() {
  const form = document.querySelector('[data-nav-search-form]');
  const input = document.querySelector('[data-nav-search-input]');

  if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const currentQuery = params.get('q') || '';
  input.value = currentQuery;

  if (form.dataset.bound === 'true') {
    return;
  }

  form.dataset.bound = 'true';
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const query = (input.value || '').trim();
    const targetParams = new URLSearchParams();

    if (query) {
      targetParams.set('q', query);
    }

    const isFeedPage = window.location.pathname.endsWith('/index.html') || window.location.pathname === '/';

    if (isFeedPage) {
      const category = new URLSearchParams(window.location.search).get('category') || '';
      if (category) {
        targetParams.set('category', category);
      }

      const queryString = targetParams.toString();
      const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.pushState(null, '', nextUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    const queryString = targetParams.toString();
    const targetUrl = queryString ? `/index.html?${queryString}` : '/index.html';
    window.location.assign(targetUrl);
  });
}

function toggleTopLevelAccountLinks({ isAuthenticated, isAdmin }) {
  const profileLink = document.querySelector('#mainNavbar a.nav-link[href="/profile.html"]');
  const adminLink = document.querySelector('#mainNavbar a.nav-link[href="/admin.html"]');

  const profileItem = profileLink?.closest('.nav-item');
  const adminItem = adminLink?.closest('.nav-item');

  if (isAuthenticated && profileItem instanceof HTMLElement) {
    profileItem.classList.add('d-none');
  }

  if (isAdmin && adminItem instanceof HTMLElement) {
    adminItem.classList.add('d-none');
  }
}

async function initializeNavbar() {
  const guestElements = document.querySelectorAll('[data-nav-guest]');
  const authElements = document.querySelectorAll('[data-nav-auth]');
  const adminElements = document.querySelectorAll('[data-nav-admin]');
  const statusElement = document.querySelector('[data-nav-status]');
  const userRoleBadge = document.querySelector('[data-nav-user-role]');
  const userButton = document.querySelector('[data-nav-user-button]');

  const user = await getCurrentUser();
  await initializeNavbarCategories();
  setActiveNavbarLink();
  initializeNavbarSearch();

  if (!user) {
    toggleElements(guestElements, true);
    toggleElements(authElements, false);
    toggleElements(adminElements, false);
    toggleTopLevelAccountLinks({ isAuthenticated: false, isAdmin: false });

    if (statusElement) {
      statusElement.textContent = 'Guest';
    }

    if (userRoleBadge instanceof HTMLElement) {
      userRoleBadge.classList.add('d-none');
    }

    return null;
  }

  toggleElements(guestElements, false);
  toggleElements(authElements, true);

  const role = await getCurrentUserRole(user.id);
  toggleElements(adminElements, role === 'admin');
  toggleTopLevelAccountLinks({ isAuthenticated: true, isAdmin: role === 'admin' });

  if (statusElement) {
    statusElement.textContent = user.email || 'User';
  }

  if (userRoleBadge instanceof HTMLElement) {
    userRoleBadge.classList.toggle('d-none', role !== 'admin');
  }

  if (userButton instanceof HTMLElement) {
    userButton.setAttribute('aria-label', `Account menu for ${user.email || 'User'}`);
  }

  return user;
}

async function enforcePageAccess() {
  const path = window.location.pathname;

  if (path.endsWith('/post-create.html') || path.endsWith('/profile.html') || path.endsWith('/chat.html')) {
    await requireAuth('/login.html');
  }

  if (path.endsWith('/admin.html')) {
    await requireAdmin('/index.html');
  }
}

async function bootstrap() {
  await enforcePageAccess();
  const user = await initializeNavbar();
  initializeLogout();

  if (user?.id) {
    await initializeNotifications(user.id);
  } else {
    cleanupNotifications();
  }

  loadFeed();
  initializePostDetailPage();
  initializePostForm();
  initializeChatPage();
  initializeProfilePage();
  initializeLoginForm();
  initializeRegisterForm();
}

bootstrap();