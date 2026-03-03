import { getCurrentUser, getCurrentUserRole } from '../auth/auth-guard.js';
import { getProfileById } from '../profile/profile-service.js';
import {
  bindNavbarMetricsSync,
  ensureRequiredNavbarStructure,
  initializeNavbarCategories,
  initializeNavbarSearch,
  setActiveNavbarLink,
  toggleElements
} from './navbar-sections.js';
import { getCreatePostHrefForSection, getFeedSectionFromPathname, initializeTooltips } from './navbar-common.js';
import {
  enhanceAccountDropdownItems,
  ensureChatDropdownLink,
  ensureCreatePostDropdownLink,
  ensureMyPostsDropdownLink,
  toggleTopLevelAccountLinks,
  updateNavbarSocialIndicator,
  updateNavbarUserAvatar
} from './navbar-account.js';

export { initializeTooltips };

export async function initializeNavbar() {
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
  bindNavbarMetricsSync();

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

  const createPostHref = getCreatePostHrefForSection(getFeedSectionFromPathname());
  ensureMyPostsDropdownLink(user.id);
  ensureCreatePostDropdownLink(createPostHref);
  ensureChatDropdownLink();
  enhanceAccountDropdownItems();
  updateNavbarUserAvatar(userButton, profile, user);
  updateNavbarSocialIndicator(userButton, user);

  if (userButton instanceof HTMLElement) {
    userButton.setAttribute('aria-label', `Account menu for ${user.email || 'User'}`);
  }

  return user;
}