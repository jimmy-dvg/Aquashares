import { getCategories } from '../posts/posts-service.js';
import { getCategoryDisplayName, getCategoryEmoji } from '../utils/category-icons.js';

export function toggleElements(elements, isVisible) {
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

let navbarMetricsBound = false;

function syncNavbarHeightVariable() {
  const navbar = document.querySelector('.navbar');
  if (!(navbar instanceof HTMLElement)) {
    return;
  }

  const nextHeight = Math.max(56, Math.round(navbar.getBoundingClientRect().height));
  document.documentElement.style.setProperty('--aqua-navbar-height', `${nextHeight}px`);
}

export function bindNavbarMetricsSync() {
  syncNavbarHeightVariable();

  if (navbarMetricsBound) {
    return;
  }

  navbarMetricsBound = true;
  window.addEventListener('resize', syncNavbarHeightVariable, { passive: true });
}

function isFeedPagePath(pathname) {
  const normalized = normalizeNavPathname(pathname);
  return normalized === '/index.html' || normalized === '/giveaway.html' || normalized === '/exchange.html' || normalized === '/wanted.html';
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

  if (sectionKey === 'navWanted') {
    return '🔎';
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

  if (sectionKey === 'navWanted') {
    toggle.dataset.navWantedToggle = 'true';
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

  if (sectionKey === 'navWanted') {
    menu.dataset.navWantedMenu = 'true';
  }

  item.append(toggle, menu);
  return item;
}

export function ensureRequiredNavbarStructure() {
  const navLists = document.querySelectorAll('#mainNavbar .aqua-nav-pages');

  navLists.forEach((navList) => {
    if (!(navList instanceof HTMLUListElement)) {
      return;
    }

    let forumItem = navList.querySelector('[data-nav-forum]');

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

    let wantedItem = navList.querySelector('[data-nav-wanted]');
    if (!(wantedItem instanceof HTMLLIElement)) {
      wantedItem = createNavSectionDropdown('navWanted', 'Търся');
      exchangeItem.insertAdjacentElement('afterend', wantedItem);
    }

    if (forumItem.parentElement === navList && giveawayItem.parentElement === navList && exchangeItem.parentElement === navList && wantedItem.parentElement === navList) {
      navList.prepend(forumItem);
      forumItem.insertAdjacentElement('afterend', giveawayItem);
      giveawayItem.insertAdjacentElement('afterend', exchangeItem);
      exchangeItem.insertAdjacentElement('afterend', wantedItem);
    }

    const forumToggle = forumItem.querySelector('[data-nav-forum-toggle]');
    if (forumToggle instanceof HTMLElement) {
      applyNavSectionToggleContent(forumToggle, 'navForum', 'Форум');
    }

    const giveawayToggle = giveawayItem.querySelector('[data-nav-giveaway-toggle]');
    if (giveawayToggle instanceof HTMLElement) {
      applyNavSectionToggleContent(giveawayToggle, 'navGiveaway', 'Подарявам');
    }

    const exchangeToggle = exchangeItem.querySelector('[data-nav-exchange-toggle]');
    if (exchangeToggle instanceof HTMLElement) {
      applyNavSectionToggleContent(exchangeToggle, 'navExchange', 'Разменям');
    }

    const wantedToggle = wantedItem.querySelector('[data-nav-wanted-toggle]');
    if (wantedToggle instanceof HTMLElement) {
      applyNavSectionToggleContent(wantedToggle, 'navWanted', 'Търся');
    }
  });
}

export function setActiveNavbarLink() {
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
  const wantedToggle = document.querySelector('[data-nav-wanted-toggle]');

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
  setToggleActive(wantedToggle, pathname === '/wanted.html');
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
  const wantedMenus = document.querySelectorAll('[data-nav-wanted-menu]');

  if (!forumMenus.length && !giveawayMenus.length && !exchangeMenus.length && !wantedMenus.length) {
    return;
  }

  const pathname = normalizeNavPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const selectedCategory = params.get('category') || '';
  const searchQuery = (params.get('q') || '').trim();

  const forumCategories = (categories || []).filter((category) => category.section === 'forum');
  const giveawayCategories = (categories || []).filter((category) => category.section === 'giveaway');
  const exchangeCategories = (categories || []).filter((category) => category.section === 'exchange');
  const wantedCategories = (categories || []).filter((category) => category.section === 'wanted');

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
  renderSection(wantedMenus, '/wanted.html', 'Всичко в Търся', wantedCategories);
}

export async function initializeNavbarCategories() {
  const categoryMenus = document.querySelectorAll('[data-nav-forum-menu], [data-nav-giveaway-menu], [data-nav-exchange-menu], [data-nav-wanted-menu]');

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

export function initializeNavbarSearch() {
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

      ['location', 'author', 'photo', 'sort', 'near_me', 'radius_km'].forEach((key) => {
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

