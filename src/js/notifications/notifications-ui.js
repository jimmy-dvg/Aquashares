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
  initialized: false
};

function getNotificationHref(notification) {
  const referenceType = notification.referenceType || 'post';

  if (referenceType === 'comment' && notification.referenceId) {
    return `/index.html?comment=${encodeURIComponent(notification.referenceId)}`;
  }

  if (notification.referenceId) {
    return `/index.html#post-${encodeURIComponent(notification.referenceId)}`;
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
    return 'Just now';
  }

  if (deltaMs < hour) {
    return `${Math.floor(deltaMs / minute)}m ago`;
  }

  if (deltaMs < day) {
    return `${Math.floor(deltaMs / hour)}h ago`;
  }

  return `${Math.floor(deltaMs / day)}d ago`;
}

export function renderNotificationItem(notification) {
  const item = document.createElement('a');
  item.href = getNotificationHref(notification);
  item.className = `dropdown-item text-wrap py-2 ${notification.isRead ? '' : 'fw-semibold'}`.trim();
  item.dataset.notificationId = notification.id;

  const message = document.createElement('div');
  message.className = 'small';
  message.textContent = notification.message;

  const meta = document.createElement('div');
  meta.className = 'text-secondary small';
  meta.textContent = formatRelativeDate(notification.createdAt);

  item.append(message, meta);
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

    state.pollingId = window.setInterval(async () => {
      try {
        await refreshNotificationsFromServer();
      } catch {
      }
    }, 5000);
  } catch {
    state.notifications = [];
    renderNotificationDropdown();

    state.pollingId = window.setInterval(async () => {
      try {
        await refreshNotificationsFromServer();
      } catch {
      }
    }, 5000);
  }
}

export function cleanupNotifications() {
  if (typeof state.unsubscribe === 'function') {
    state.unsubscribe();
  }

  if (state.pollingId) {
    window.clearInterval(state.pollingId);
  }

  state.unsubscribe = null;
  state.pollingId = null;
  state.notifications = [];
  state.initialized = false;
}
