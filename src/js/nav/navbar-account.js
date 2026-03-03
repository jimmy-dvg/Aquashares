import { getConnectedSocialProviderKeysFromUser } from '../auth/social-auth.js';

export function toggleTopLevelAccountLinks({ isAuthenticated, isAdmin }) {
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

export function ensureMyPostsDropdownLink(userId) {
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

export function ensureChatDropdownLink() {
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

export function ensureCreatePostDropdownLink(createPostHref) {
  const dropdownMenus = document.querySelectorAll('.dropdown-menu.dropdown-menu-end');

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

export function enhanceAccountDropdownItems() {
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

export function updateNavbarUserAvatar(userButton, profile, user) {
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

export function updateNavbarSocialIndicator(userButton, user) {
  if (!(userButton instanceof HTMLElement)) {
    return;
  }

  const connectedProviders = getConnectedSocialProviderKeysFromUser(user);
  const existingBadge = userButton.querySelector('[data-nav-social-linked]');

  if (!connectedProviders.length) {
    if (existingBadge instanceof HTMLElement) {
      existingBadge.remove();
    }
    return;
  }

  let badge = existingBadge;
  if (!(badge instanceof HTMLElement)) {
    badge = document.createElement('span');
    badge.className = 'badge text-bg-success ms-1';
    badge.dataset.navSocialLinked = 'true';

    const roleBadge = userButton.querySelector('[data-nav-user-role]');
    if (roleBadge instanceof HTMLElement) {
      roleBadge.insertAdjacentElement('afterend', badge);
    } else {
      userButton.append(badge);
    }
  }

  badge.textContent = `Соц ${connectedProviders.length}`;
  badge.title = `Свързани социални профили: ${connectedProviders.join(', ')}`;
}