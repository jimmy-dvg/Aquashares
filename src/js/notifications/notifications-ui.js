import {
  getUserNotifications,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications
} from './notifications-service.js';

const state = {
  notifications: [],
  unsubscribe: null,
  pollingId: null,
  visibilityHandler: null,
  initialized: false
};

const NOTIFICATIONS_POLLING_INTERVAL_MS = 15000;

function getNotificationHref(notification) {
  const referenceType = notification.referenceType || 'post';

  if (referenceType === 'chat' && notification.referenceId) {
    return `/chat.html?conversation=${encodeURIComponent(notification.referenceId)}`;
  }

  if (referenceType === 'comment' && notification.referenceId) {
    return `/post-detail.html?comment=${encodeURIComponent(notification.referenceId)}`;
  }

  if (notification.referenceId) {
    return `/post-detail.html?id=${encodeURIComponent(notification.referenceId)}`;
  }

  return '/index.html';
}

function getElements() {
  return {
    root: document.querySelector('[data-notifications-dropdown]'),
    list: document.querySelector('[data-notifications-list]'),
    empty: document.querySelector('[data-notifications-empty]'),
    badge: document.querySelector('[data-notifications-badge]'),
    markAllButton: document.querySelector('[data-notifications-mark-all]')
  };
}

function formatRelativeDate(value) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const deltaMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < minute) {
    return 'Току-що';
  }

  if (deltaMs < hour) {
    return `преди ${Math.floor(deltaMs / minute)} мин`;
  }

  if (deltaMs < day) {
    return `преди ${Math.floor(deltaMs / hour)} ч`;
  }

  return `преди ${Math.floor(deltaMs / day)} д`;
}

function getNotificationIconClass(notification) {
  const type = (notification.type || '').toLowerCase();
  const referenceType = (notification.referenceType || '').toLowerCase();

  if (type === 'like' || referenceType === 'like') {
    return 'bi bi-heart-fill';
  }

  if (type === 'chat_message' || referenceType === 'chat') {
    return 'bi bi-chat-left-text-fill';
  }

  if (type === 'comment' || referenceType === 'comment') {
    return 'bi bi-chat-dots-fill';
  }

  if (type === 'moderation') {
    return 'bi bi-shield-exclamation';
  }

  return 'bi bi-bell-fill';
}

function getNotificationTypeLabel(notification) {
  const type = (notification.type || '').toLowerCase();
  const referenceType = (notification.referenceType || '').toLowerCase();

  if (type === 'like' || referenceType === 'like') {
    return 'Ново харесване';
  }

  if (type === 'chat_message' || referenceType === 'chat') {
    return 'Ново съобщение';
  }

  if (type === 'comment' || referenceType === 'comment') {
    return 'Нов коментар';
  }

  if (type === 'moderation') {
    return 'Модерация';
  }

  if (type === 'system') {
    return 'Система';
  }

  return 'Известие';
}

function localizeNotificationMessage(message) {
  const value = typeof message === 'string' ? message.trim() : '';

  if (!value) {
    return '';
  }

  const commentedMatch = value.match(/^(.+?)\s+commented on your post\.$/i);
  if (commentedMatch) {
    return `${commentedMatch[1]} коментира твоя публикация.`;
  }

  const likedMatch = value.match(/^(.+?)\s+liked your post\.$/i);
  if (likedMatch) {
    return `${likedMatch[1]} хареса твоя публикация.`;
  }

  const chatMatch = value.match(/^(.+?)\s+sent you a message\.$/i);
  if (chatMatch) {
    return `${chatMatch[1]} ти изпрати съобщение.`;
  }

  return value;
}

export function renderNotificationItem(notification) {
  const item = document.createElement('a');
  item.href = getNotificationHref(notification);
  item.className = `dropdown-item text-wrap py-2 px-3 aqua-notification-item ${notification.isRead ? '' : 'is-unread'}`.trim();
  item.dataset.notificationId = notification.id;

  const topRow = document.createElement('div');
  topRow.className = 'd-flex align-items-center gap-2 mb-1';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'aqua-notification-icon';

  const icon = document.createElement('i');
  icon.className = getNotificationIconClass(notification);
  icon.setAttribute('aria-hidden', 'true');
  iconWrap.append(icon);

  const typeLabel = document.createElement('span');
  typeLabel.className = 'small fw-semibold text-body';
  typeLabel.textContent = getNotificationTypeLabel(notification);

  const meta = document.createElement('span');
  meta.className = 'text-secondary small ms-auto';
  meta.textContent = formatRelativeDate(notification.createdAt);

  topRow.append(iconWrap, typeLabel, meta);

  const message = document.createElement('div');
  message.className = 'small text-secondary-emphasis';
  message.textContent = localizeNotificationMessage(notification.message);

  if (!notification.isRead) {
    const unreadDot = document.createElement('span');
    unreadDot.className = 'aqua-notification-unread-dot';
    unreadDot.setAttribute('aria-hidden', 'true');
    topRow.append(unreadDot);
  }

  item.append(topRow, message);
  return item;
}

export function updateUnreadBadge() {
  const { badge } = getElements();
  if (!badge) {
    return;
  }

  const unreadCount = state.notifications.reduce((sum, item) => {
    if (!item.isRead) {
      return sum + 1;
    }

    return sum;
  }, 0);

  if (unreadCount <= 0) {
    badge.classList.add('d-none');
    badge.textContent = '0';
    return;
  }

  badge.classList.remove('d-none');
  badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
}

export function renderNotificationDropdown() {
  const { list, empty, markAllButton } = getElements();
  if (!list || !empty) {
    return;
  }

  list.replaceChildren();

  if (!state.notifications.length) {
    empty.classList.remove('d-none');
    if (markAllButton) {
      markAllButton.disabled = true;
    }
    updateUnreadBadge();
    return;
  }

  empty.classList.add('d-none');

  const fragment = document.createDocumentFragment();
  state.notifications.forEach((notification) => {
    fragment.append(renderNotificationItem(notification));
  });
  list.append(fragment);

  if (markAllButton) {
    const hasUnread = state.notifications.some((item) => !item.isRead);
    markAllButton.disabled = !hasUnread;
  }

  updateUnreadBadge();
}

function mergeNewNotification(notification) {
  state.notifications = [notification, ...state.notifications.filter((item) => item.id !== notification.id)].slice(0, 20);
}

function replaceNotifications(nextNotifications) {
  state.notifications = [...nextNotifications].slice(0, 20);
}

function getNotificationsFingerprint(items) {
  return items
    .map((item) => `${item.id}:${item.isRead ? 1 : 0}`)
    .join('|');
}

async function refreshNotificationsFromServer() {
  const nextNotifications = await getUserNotifications();
  const currentFingerprint = getNotificationsFingerprint(state.notifications);
  const nextFingerprint = getNotificationsFingerprint(nextNotifications);

  if (currentFingerprint === nextFingerprint) {
    return;
  }

  replaceNotifications(nextNotifications);
  renderNotificationDropdown();
}

export async function handleMarkAsRead(notificationId) {
  const updated = await markAsRead(notificationId);

  if (!updated) {
    return;
  }

  state.notifications = state.notifications.map((item) => {
    if (item.id === notificationId) {
      return {
        ...item,
        isRead: true
      };
    }

    return item;
  });

  renderNotificationDropdown();
}

function bindEvents() {
  const { root, list, markAllButton } = getElements();

  if (root && root.dataset.notificationsBound !== 'true') {
    root.dataset.notificationsBound = 'true';

    root.addEventListener('show.bs.dropdown', async () => {
      try {
        await refreshNotificationsFromServer();
      } catch {
      }
    });
  }

  if (list && list.dataset.notificationsBound !== 'true') {
    list.dataset.notificationsBound = 'true';

    list.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const item = target.closest('[data-notification-id]');
      if (!(item instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();

      const notificationId = item.dataset.notificationId;
      if (!notificationId) {
        return;
      }

      const href = item.getAttribute('href') || '/index.html';

      item.classList.add('disabled');
      item.setAttribute('aria-disabled', 'true');
      try {
        await handleMarkAsRead(notificationId);
      } catch {
      } finally {
        item.classList.remove('disabled');
        item.removeAttribute('aria-disabled');
      }

      window.location.assign(href);
    });
  }

  if (markAllButton && markAllButton.dataset.notificationsBound !== 'true') {
    markAllButton.dataset.notificationsBound = 'true';

    markAllButton.addEventListener('click', async (event) => {
      event.preventDefault();

      markAllButton.disabled = true;
      try {
        await markAllAsRead();
        state.notifications = state.notifications.map((item) => ({ ...item, isRead: true }));
        renderNotificationDropdown();
      } catch {
      } finally {
        markAllButton.disabled = false;
      }
    });
  }
}

function startPolling() {
  if (state.pollingId) {
    window.clearInterval(state.pollingId);
  }

  state.pollingId = window.setInterval(async () => {
    if (document.visibilityState === 'hidden') {
      return;
    }

    try {
      await refreshNotificationsFromServer();
    } catch {
    }
  }, NOTIFICATIONS_POLLING_INTERVAL_MS);

  if (typeof state.visibilityHandler !== 'function') {
    state.visibilityHandler = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        await refreshNotificationsFromServer();
      } catch {
      }
    };

    document.addEventListener('visibilitychange', state.visibilityHandler);
  }
}

export async function initializeNotifications(userId) {
  const { root } = getElements();
  if (!root || !userId || state.initialized) {
    return;
  }

  state.initialized = true;

  try {
    state.notifications = await getUserNotifications();
    renderNotificationDropdown();
    bindEvents();

    state.unsubscribe = subscribeToNotifications(userId, (notification) => {
      mergeNewNotification(notification);
      renderNotificationDropdown();
    });

    startPolling();
  } catch {
    state.notifications = [];
    renderNotificationDropdown();

    startPolling();
  }
}

export function cleanupNotifications() {
  if (typeof state.unsubscribe === 'function') {
    state.unsubscribe();
  }

  if (state.pollingId) {
    window.clearInterval(state.pollingId);
  }

  if (typeof state.visibilityHandler === 'function') {
    document.removeEventListener('visibilitychange', state.visibilityHandler);
  }

  state.unsubscribe = null;
  state.pollingId = null;
  state.visibilityHandler = null;
  state.notifications = [];
  state.initialized = false;
}
