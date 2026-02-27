import { getCurrentUser, getCurrentUserRole, requireAdmin, requireAuth } from './auth/auth-guard.js';
import { initializeLoginForm } from './auth/login.js';
import { initializeLogout } from './auth/logout.js';
import { initializeRegisterForm } from './auth/register.js';
import { initializeChatPage } from './chat/chat-ui.js';
import { cleanupNotifications, initializeNotifications } from './notifications/notifications-ui.js';
import { initializePostDetailPage } from './posts/post-detail.js';
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

function setActiveNavbarLink() {
  const pathname = window.location.pathname;
  const navLinks = document.querySelectorAll('#mainNavbar .navbar-nav .nav-link[href]');

  navLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const isActive = link.pathname === pathname;
    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
      return;
    }

    link.removeAttribute('aria-current');
  });
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