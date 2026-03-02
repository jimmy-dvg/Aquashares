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

function isFeedPagePath(pathname) {
  const normalized = normalizeNavPathname(pathname);
  return normalized === '/index.html' || normalized === '/giveaway.html' || normalized === '/exchange.html';
}

function getNavSectionIcon(sectionKey) {
  if (sectionKey === 'navForum') {
    return '💬';
  }

  if (sectionKey === 'navGiveaway') {
    return '🎁';
  }

  if (sectionKey === 'navExchange') {
    return '🔄';
  }

  return '📂';
}

function applyNavSectionToggleContent(toggle, sectionKey, label) {
  if (!(toggle instanceof HTMLElement)) {
    return;
  }

  const icon = document.createElement('span');
  icon.className = 'aqua-nav-section-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = getNavSectionIcon(sectionKey);

  const text = document.createElement('span');
  text.textContent = label;

  toggle.replaceChildren(icon, text);
}

function createNavSectionDropdown(sectionKey, label) {
  const item = document.createElement('li');
  item.className = 'nav-item dropdown aqua-nav-categories';
  item.dataset[sectionKey] = 'true';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-link btn btn-link dropdown-toggle';
  toggle.setAttribute('data-bs-toggle', 'dropdown');
  toggle.setAttribute('aria-expanded', 'false');

  if (sectionKey === 'navForum') {
    toggle.dataset.navForumToggle = 'true';
  }

  if (sectionKey === 'navGiveaway') {
    toggle.dataset.navGiveawayToggle = 'true';
  }

  if (sectionKey === 'navExchange') {
    toggle.dataset.navExchangeToggle = 'true';
  }

  applyNavSectionToggleContent(toggle, sectionKey, label);

  const menu = document.createElement('ul');
  menu.className = 'dropdown-menu';

  if (sectionKey === 'navForum') {
    menu.dataset.navForumMenu = 'true';
  }

  if (sectionKey === 'navGiveaway') {
    menu.dataset.navGiveawayMenu = 'true';
  }

  if (sectionKey === 'navExchange') {
    menu.dataset.navExchangeMenu = 'true';
  }

  item.append(toggle, menu);
  return item;
}

function ensureRequiredNavbarStructure() {
  const navLists = document.querySelectorAll('#mainNavbar .aqua-nav-pages');

  navLists.forEach((navList) => {
    if (!(navList instanceof HTMLUListElement)) {
      return;
    }

    const feedLink = navList.querySelector('a.nav-link[href="/index.html"]');
    const feedItem = feedLink?.closest('li');
    if (feedItem instanceof HTMLLIElement) {
      feedItem.remove();
    }

    let forumItem = navList.querySelector('[data-nav-forum]');
    if (!(forumItem instanceof HTMLLIElement)) {
      const legacyCategoriesItem = navList.querySelector('[data-nav-categories]');

      if (legacyCategoriesItem instanceof HTMLLIElement) {
        legacyCategoriesItem.dataset.navForum = 'true';
        legacyCategoriesItem.removeAttribute('data-nav-categories');
        forumItem = legacyCategoriesItem;

        const legacyToggle = forumItem.querySelector('[data-nav-categories-toggle]');
        if (legacyToggle instanceof HTMLElement) {
          legacyToggle.removeAttribute('data-nav-categories-toggle');
          legacyToggle.dataset.navForumToggle = 'true';
          applyNavSectionToggleContent(legacyToggle, 'navForum', 'Форум');
        }

        const legacyMenu = forumItem.querySelector('[data-nav-categories-menu]');
        if (legacyMenu instanceof HTMLElement) {
          legacyMenu.removeAttribute('data-nav-categories-menu');
          legacyMenu.dataset.navForumMenu = 'true';
        }
      }
    }

    if (!(forumItem instanceof HTMLLIElement)) {
      forumItem = createNavSectionDropdown('navForum', 'Форум');
      navList.prepend(forumItem);
    }

    let giveawayItem = navList.querySelector('[data-nav-giveaway]');
    if (!(giveawayItem instanceof HTMLLIElement)) {
      giveawayItem = createNavSectionDropdown('navGiveaway', 'Подарявам');
      forumItem.insertAdjacentElement('afterend', giveawayItem);
    }

    let exchangeItem = navList.querySelector('[data-nav-exchange]');
    if (!(exchangeItem instanceof HTMLLIElement)) {
      exchangeItem = createNavSectionDropdown('navExchange', 'Разменям');
      giveawayItem.insertAdjacentElement('afterend', exchangeItem);
    }

    if (forumItem.parentElement === navList && giveawayItem.parentElement === navList && exchangeItem.parentElement === navList) {
      navList.prepend(forumItem);
      forumItem.insertAdjacentElement('afterend', giveawayItem);
      giveawayItem.insertAdjacentElement('afterend', exchangeItem);
    }
  });
}

function setActiveNavbarLink() {
  const pathname = normalizeNavPathname(window.location.pathname);
  const currentParams = new URLSearchParams(window.location.search);
  const currentCategory = currentParams.get('category') || '';
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

  const forumToggle = document.querySelector('[data-nav-forum-toggle]');
  const giveawayToggle = document.querySelector('[data-nav-giveaway-toggle]');
  const exchangeToggle = document.querySelector('[data-nav-exchange-toggle]');

  const setToggleActive = (toggle, isActive) => {
    if (!(toggle instanceof HTMLElement)) {
      return;
    }

    toggle.classList.toggle('active', isActive);
    if (isActive) {
      toggle.setAttribute('aria-current', 'page');
    } else {
      toggle.removeAttribute('aria-current');
    }
  };

  setToggleActive(forumToggle, pathname === '/index.html');
  setToggleActive(giveawayToggle, pathname === '/giveaway.html');
  setToggleActive(exchangeToggle, pathname === '/exchange.html');
}

function getNavbarCategoryHref(basePath, categorySlug, searchQuery = '') {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set('q', searchQuery);
  }

  if (categorySlug) {
    params.set('category', categorySlug);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
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

function buildNavbarCategoryItem(category, selectedCategory, searchQuery, basePath) {
  const item = document.createElement('li');
  const link = createCategoryMenuLink({
    href: getNavbarCategoryHref(basePath, category.slug, searchQuery),
    label: getCategoryDisplayName(category.name, category.slug),
    iconEmoji: getCategoryEmoji(category.slug),
    isActive: category.slug === selectedCategory
  });

  item.append(link);
  return item;
}

function renderNavbarCategories(categories) {
  const forumMenus = document.querySelectorAll('[data-nav-forum-menu]');
  const giveawayMenus = document.querySelectorAll('[data-nav-giveaway-menu]');
  const exchangeMenus = document.querySelectorAll('[data-nav-exchange-menu]');

  if (!forumMenus.length && !giveawayMenus.length && !exchangeMenus.length) {
    return;
  }

  const pathname = normalizeNavPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const selectedCategory = params.get('category') || '';
  const searchQuery = (params.get('q') || '').trim();

  const forumCategories = (categories || []).filter((category) => category.section === 'forum');
  const giveawayCategories = (categories || []).filter((category) => category.section === 'giveaway');
  const exchangeCategories = (categories || []).filter((category) => category.section === 'exchange');

  const renderSection = (menuElements, basePath, allLabel, sectionCategories) => {
    menuElements.forEach((menuElement) => {
      if (!(menuElement instanceof HTMLElement)) {
        return;
      }

      const sectionIsActive = pathname === basePath;
      const sectionSearch = sectionIsActive ? searchQuery : '';
      const sectionSelectedCategory = sectionIsActive ? selectedCategory : '';

      const allCategoriesItem = document.createElement('li');
      const allCategoriesLink = createCategoryMenuLink({
        href: getNavbarCategoryHref(basePath, '', sectionSearch),
        label: allLabel,
        iconEmoji: '🗂️',
        isActive: !sectionSelectedCategory && sectionIsActive
      });

      allCategoriesItem.append(allCategoriesLink);
      menuElement.replaceChildren(allCategoriesItem);

      if (!sectionCategories.length) {
        const emptyItem = document.createElement('li');
        const emptyState = document.createElement('span');
        emptyState.className = 'dropdown-item-text text-secondary small';
        emptyState.textContent = 'Няма налични категории';
        emptyItem.append(emptyState);
        menuElement.append(emptyItem);
        return;
      }

      const dividerItem = document.createElement('li');
      const divider = document.createElement('hr');
      divider.className = 'dropdown-divider';
      dividerItem.append(divider);
      menuElement.append(dividerItem);

      sectionCategories.forEach((category) => {
        menuElement.append(buildNavbarCategoryItem(category, sectionSelectedCategory, sectionSearch, basePath));
      });
    });
  };

  renderSection(forumMenus, '/index.html', 'Всички теми', forumCategories);
  renderSection(giveawayMenus, '/giveaway.html', 'Всичко в Подарявам', giveawayCategories);
  renderSection(exchangeMenus, '/exchange.html', 'Всичко в Разменям', exchangeCategories);
}

async function initializeNavbarCategories() {
  const categoryMenus = document.querySelectorAll('[data-nav-forum-menu], [data-nav-giveaway-menu], [data-nav-exchange-menu]');

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

    const isFeedPage = isFeedPagePath(window.location.pathname);

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
  const createPostLink = document.querySelector('#mainNavbar a.nav-link[href^="/post-create.html"]');
  const chatLink = document.querySelector('#mainNavbar a.nav-link[href="/chat.html"]');
  const profileLink = document.querySelector('#mainNavbar a.nav-link[href="/profile.html"]');
  const adminLink = document.querySelector('#mainNavbar a.nav-link[href="/admin.html"]');

  const createPostItem = createPostLink?.closest('.nav-item');
  const chatItem = chatLink?.closest('.nav-item');
  const profileItem = profileLink?.closest('.nav-item');
  const adminItem = adminLink?.closest('.nav-item');

  if (isAuthenticated && createPostItem instanceof HTMLElement) {
    createPostItem.classList.add('d-none');
  }

  if (isAuthenticated && chatItem instanceof HTMLElement) {
    chatItem.classList.add('d-none');
  }

  if (isAuthenticated && profileItem instanceof HTMLElement) {
    profileItem.classList.add('d-none');
  }

  if (isAdmin && adminItem instanceof HTMLElement) {
    adminItem.classList.add('d-none');
  }
}

function getFeedSectionFromPathname(pathname = window.location.pathname) {
  const normalized = normalizeNavPathname(pathname);
  if (normalized === '/giveaway.html') {
    return 'giveaway';
  }

  if (normalized === '/exchange.html') {
    return 'exchange';
  }

  if (normalized === '/index.html') {
    return 'forum';
  }

  return '';
}

function getCreatePostHrefForSection(section) {
  const normalizedSection = (section || '').trim().toLowerCase();
  if (!normalizedSection) {
    return '/post-create.html';
  }

  return `/post-create.html?section=${encodeURIComponent(normalizedSection)}`;
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

function ensureChatDropdownLink() {
  const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');

  dropdownMenus.forEach((menu) => {
    if (!(menu instanceof HTMLUListElement)) {
      return;
    }

    const profileLink = menu.querySelector('a.dropdown-item[href="/profile.html"]');
    if (!(profileLink instanceof HTMLAnchorElement)) {
      return;
    }

    const existingChat = menu.querySelector('[data-nav-chat]');
    if (existingChat instanceof HTMLAnchorElement) {
      existingChat.href = '/chat.html';
      return;
    }

    const chatItem = document.createElement('li');
    const chatLink = document.createElement('a');
    chatLink.className = 'dropdown-item';
    chatLink.href = '/chat.html';
    chatLink.dataset.navChat = 'true';
    chatLink.textContent = 'Чат';
    chatItem.append(chatLink);

    const createPostItem = menu.querySelector('a.dropdown-item[data-nav-create-post="true"]')?.closest('li');
    if (createPostItem?.parentElement === menu) {
      createPostItem.insertAdjacentElement('afterend', chatItem);
      return;
    }

    const myPostsItem = menu.querySelector('a.dropdown-item[data-nav-my-posts="true"]')?.closest('li');
    if (myPostsItem?.parentElement === menu) {
      myPostsItem.insertAdjacentElement('afterend', chatItem);
      return;
    }

    const profileItem = profileLink.closest('li');
    if (profileItem?.parentElement === menu) {
      profileItem.insertAdjacentElement('afterend', chatItem);
      return;
    }

    menu.prepend(chatItem);
  });
}

function ensureCreatePostDropdownLink() {
  const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');
  const section = getFeedSectionFromPathname();
  const createPostHref = getCreatePostHrefForSection(section);

  dropdownMenus.forEach((menu) => {
    if (!(menu instanceof HTMLUListElement)) {
      return;
    }

    const profileLink = menu.querySelector('a.dropdown-item[href="/profile.html"]');
    if (!(profileLink instanceof HTMLAnchorElement)) {
      return;
    }

    const existingCreatePost = menu.querySelector('[data-nav-create-post]');
    if (existingCreatePost instanceof HTMLAnchorElement) {
      existingCreatePost.href = createPostHref;
      return;
    }

    const createPostItem = document.createElement('li');
    const createPostLink = document.createElement('a');
    createPostLink.className = 'dropdown-item';
    createPostLink.href = createPostHref;
    createPostLink.dataset.navCreatePost = 'true';
    createPostLink.textContent = 'Нова публикация';
    createPostItem.append(createPostLink);

    const myPostsItem = menu.querySelector('a.dropdown-item[data-nav-my-posts="true"]')?.closest('li');
    if (myPostsItem?.parentElement === menu) {
      myPostsItem.insertAdjacentElement('afterend', createPostItem);
      return;
    }

    const profileItem = profileLink.closest('li');
    if (profileItem?.parentElement === menu) {
      profileItem.insertAdjacentElement('afterend', createPostItem);
      return;
    }

    menu.prepend(createPostItem);
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
    const createPostItem = menu.querySelector('a.dropdown-item[data-nav-create-post="true"]');
    const chatItem = menu.querySelector('a.dropdown-item[data-nav-chat="true"]');
    const adminItem = menu.querySelector('a.dropdown-item[href="/admin.html"]');
    const logoutItem = menu.querySelector('button.dropdown-item[data-nav-logout]');

    applyIconToDropdownItem(profileItem, '👤');
    applyIconToDropdownItem(myPostsItem, '📝');
    applyIconToDropdownItem(createPostItem, '✍️');
    applyIconToDropdownItem(chatItem, '💬');
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
  ensureRequiredNavbarStructure();
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
  ensureCreatePostDropdownLink();
  ensureChatDropdownLink();
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