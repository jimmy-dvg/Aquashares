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

async function initializeNavbar() {
  const guestElements = document.querySelectorAll('[data-nav-guest]');
  const authElements = document.querySelectorAll('[data-nav-auth]');
  const adminElements = document.querySelectorAll('[data-nav-admin]');
  const statusElement = document.querySelector('[data-nav-status]');

  const user = await getCurrentUser();
  setActiveNavbarLink();

  if (!user) {
    toggleElements(guestElements, true);
    toggleElements(authElements, false);
    toggleElements(adminElements, false);

    if (statusElement) {
      statusElement.textContent = 'Guest';
    }

    return null;
  }

  toggleElements(guestElements, false);
  toggleElements(authElements, true);

  const role = await getCurrentUserRole(user.id);
  toggleElements(adminElements, role === 'admin');

  if (statusElement) {
    statusElement.textContent = user.email || 'User';
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