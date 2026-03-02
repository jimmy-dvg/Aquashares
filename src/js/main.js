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
import { getProfileById } from './profile/profile-service.js';
import { getCategoryDisplayName, getCategoryEmoji } from './utils/category-icons.js';
import { initializeBulgarianLocalization } from './utils/localization-bg.js';

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

function createCategoryMenuLink({ href, label, iconEmoji, isActive }) {
  const link = document.createElement('a');
  link.className = 'dropdown-item aqua-nav-category-item';
  link.href = href;

  const icon = document.createElement('span');
  icon.textContent = iconEmoji;
  icon.className = 'aqua-nav-category-icon';

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
    label: getCategoryDisplayName(category.name, category.slug),
    iconEmoji: getCategoryEmoji(category.slug),
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
      label: 'Всички категории',
      iconEmoji: '🗂️',
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
      const currentParams = new URLSearchParams(window.location.search);
      const category = currentParams.get('category') || '';
      if (category) {
        targetParams.set('category', category);
      }

      ['location', 'author', 'date_from', 'date_to', 'near_me', 'radius_km'].forEach((key) => {
        const value = currentParams.get(key) || '';
        if (value) {
          targetParams.set(key, value);
        }
      });

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

function initializeTooltips() {
  const tooltipApi = globalThis.bootstrap?.Tooltip;
  if (!tooltipApi) {
    return;
  }

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
    tooltipApi.getOrCreateInstance(element);
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

function ensureMyPostsDropdownLink(userId) {
  if (!userId) {
    return;
  }

  const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');
  const myPostsHref = `/profile.html?user=${encodeURIComponent(userId)}#my-posts`;

  dropdownMenus.forEach((menu) => {
    if (!(menu instanceof HTMLUListElement)) {
      return;
    }

    const profileLink = menu.querySelector('a.dropdown-item[href="/profile.html"]');
    if (!(profileLink instanceof HTMLAnchorElement)) {
      return;
    }

    const existingMyPosts = menu.querySelector('[data-nav-my-posts]');
    if (existingMyPosts instanceof HTMLAnchorElement) {
      existingMyPosts.href = myPostsHref;
      return;
    }

    const myPostsItem = document.createElement('li');
    const myPostsLink = document.createElement('a');
    myPostsLink.className = 'dropdown-item';
    myPostsLink.href = myPostsHref;
    myPostsLink.dataset.navMyPosts = 'true';
    myPostsLink.textContent = 'Моите публикации';
    myPostsItem.append(myPostsLink);

    const profileItem = profileLink.closest('li');
    if (profileItem?.parentElement === menu) {
      profileItem.insertAdjacentElement('afterend', myPostsItem);
      return;
    }

    menu.prepend(myPostsItem);
  });
}

function applyIconToDropdownItem(item, iconEmoji) {
  if (!(item instanceof HTMLElement)) {
    return;
  }

  const existingIcon = item.querySelector('[data-nav-item-icon]');
  if (existingIcon instanceof HTMLElement) {
    existingIcon.textContent = iconEmoji;
    return;
  }

  const icon = document.createElement('span');
  icon.className = 'aqua-nav-dropdown-item-icon';
  icon.dataset.navItemIcon = 'true';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = iconEmoji;
  item.prepend(icon);
}

function enhanceAccountDropdownItems() {
  const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');

  dropdownMenus.forEach((menu) => {
    if (!(menu instanceof HTMLUListElement)) {
      return;
    }

    const profileItem = menu.querySelector('a.dropdown-item[href="/profile.html"]');
    const myPostsItem = menu.querySelector('a.dropdown-item[data-nav-my-posts="true"]');
    const adminItem = menu.querySelector('a.dropdown-item[href="/admin.html"]');
    const logoutItem = menu.querySelector('button.dropdown-item[data-nav-logout]');

    applyIconToDropdownItem(profileItem, '👤');
    applyIconToDropdownItem(myPostsItem, '📝');
    applyIconToDropdownItem(adminItem, '🛡️');
    applyIconToDropdownItem(logoutItem, '🚪');
  });
}

function updateNavbarUserAvatar(userButton, profile, user) {
  if (!(userButton instanceof HTMLElement)) {
    return;
  }

  const fallbackIcon = userButton.querySelector('.bi-person-circle');
  const avatarUrl = (profile?.avatarUrl || '').trim();
  const avatarLabel = profile?.displayName || profile?.username || user?.email || 'Потребител';

  const existingAvatar = userButton.querySelector('[data-nav-user-avatar]');

  if (!avatarUrl) {
    if (existingAvatar instanceof HTMLElement) {
      existingAvatar.remove();
    }

    if (fallbackIcon instanceof HTMLElement) {
      fallbackIcon.classList.remove('d-none');
    }

    return;
  }

  let avatarImage = existingAvatar;
  if (!(avatarImage instanceof HTMLImageElement)) {
    avatarImage = document.createElement('img');
    avatarImage.className = 'aqua-nav-user-avatar rounded-circle';
    avatarImage.dataset.navUserAvatar = 'true';

    const statusElement = userButton.querySelector('[data-nav-status]');
    if (statusElement instanceof HTMLElement) {
      userButton.insertBefore(avatarImage, statusElement);
    } else {
      userButton.prepend(avatarImage);
    }
  }

  avatarImage.alt = `Аватар на ${avatarLabel}`;
  avatarImage.src = avatarUrl;
  avatarImage.onerror = () => {
    avatarImage.remove();
    if (fallbackIcon instanceof HTMLElement) {
      fallbackIcon.classList.remove('d-none');
    }
  };

  if (fallbackIcon instanceof HTMLElement) {
    fallbackIcon.classList.add('d-none');
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

  const [role, profile] = await Promise.all([
    getCurrentUserRole(user.id),
    getProfileById(user.id).catch(() => null)
  ]);
  toggleElements(adminElements, role === 'admin');
  toggleTopLevelAccountLinks({ isAuthenticated: true, isAdmin: role === 'admin' });

  if (statusElement) {
    statusElement.textContent = user.email || 'User';
  }

  if (userRoleBadge instanceof HTMLElement) {
    userRoleBadge.classList.toggle('d-none', role !== 'admin');
  }

  ensureMyPostsDropdownLink(user.id);
  enhanceAccountDropdownItems();
  updateNavbarUserAvatar(userButton, profile, user);

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
  initializeBulgarianLocalization();
  initializeTooltips();
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