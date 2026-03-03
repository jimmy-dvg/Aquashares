import { requireAdmin, requireAuth } from './auth/auth-guard.js';
import { initializeLogout } from './auth/logout.js';
import { hydrateNavbarShell } from './nav/navbar-shell.js';
import { initializeNavbar, initializeTooltips } from './nav/navbar-ui.js';
import { cleanupNotifications, initializeNotifications } from './notifications/notifications-ui.js';
import { initializeBulgarianLocalization } from './utils/localization-bg.js';

let formA11yObserver = null;
let generatedFieldIdCounter = 0;

function getCurrentPath() {
  if (window.location.pathname === '/') {
    return '/index.html';
  }

  return window.location.pathname;
}

function isFeedPath(pathname = getCurrentPath()) {
  return pathname === '/index.html'
    || pathname === '/giveaway.html'
    || pathname === '/exchange.html'
    || pathname === '/wanted.html';
}

function getA11yEligibleFields() {
  return document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
  );
}

function generateUniqueFieldId() {
  generatedFieldIdCounter += 1;
  let candidate = `aqua-field-${generatedFieldIdCounter}`;

  while (document.getElementById(candidate)) {
    generatedFieldIdCounter += 1;
    candidate = `aqua-field-${generatedFieldIdCounter}`;
  }

  return candidate;
}

function cleanupStaleGeneratedLabels() {
  const generatedLabels = document.querySelectorAll('label[data-a11y-generated="true"][for]');

  generatedLabels.forEach((label) => {
    const targetId = label.getAttribute('for');
    if (!targetId || !document.getElementById(targetId)) {
      label.remove();
    }
  });
}

function ensureFormFieldAccessibility() {
  cleanupStaleGeneratedLabels();

  const fields = getA11yEligibleFields();

  fields.forEach((field) => {
    const fallbackId = field.id || generateUniqueFieldId();

    if (!field.id) {
      field.id = fallbackId;
    }

    if (!field.getAttribute('name')) {
      field.setAttribute('name', field.id || fallbackId);
    }

    const hasLinkedLabel = Boolean(
      document.querySelector(`label[for="${field.id}"]`)
      || field.closest('label')
    );

    const siblingLabelText = field.previousElementSibling?.textContent?.trim() || '';
    const placeholderText = field.getAttribute('placeholder')?.trim() || '';
    const fallbackLabel = siblingLabelText || placeholderText || 'Поле за въвеждане';

    if (!hasLinkedLabel) {
      const generatedLabelSelector = `label[data-a11y-generated="true"][for="${field.id}"]`;
      const existingGeneratedLabel = document.querySelector(generatedLabelSelector);

      if (!existingGeneratedLabel) {
        const generatedLabel = document.createElement('label');
        generatedLabel.className = 'visually-hidden';
        generatedLabel.setAttribute('for', field.id);
        generatedLabel.setAttribute('data-a11y-generated', 'true');
        generatedLabel.textContent = fallbackLabel;

        field.parentElement?.insertBefore(generatedLabel, field);
      }
    }

    if (!field.getAttribute('aria-label')) {
      field.setAttribute('aria-label', fallbackLabel);
    }
  });
}

function startFormAccessibilityObserver() {
  if (formA11yObserver || !document.body) {
    return;
  }

  formA11yObserver = new MutationObserver(() => {
    ensureFormFieldAccessibility();
  });

  formA11yObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function enforcePageAccess() {
  const path = getCurrentPath();

  if (path.endsWith('/post-create.html') || path.endsWith('/profile.html') || path.endsWith('/chat.html')) {
    await requireAuth('/login.html');
  }

  if (path.endsWith('/admin.html')) {
    await requireAdmin('/index.html');
  }
}

async function initializePageModules(path) {
  if (isFeedPath(path)) {
    const { loadFeed } = await import('./posts/posts-ui.js');
    loadFeed();
  }

  if (path.endsWith('/post-detail.html')) {
    const { initializePostDetailPage } = await import('./posts/post-detail.js');
    initializePostDetailPage();
  }

  if (path.endsWith('/post-create.html')) {
    const { initializePostForm } = await import('./posts/post-form.js');
    initializePostForm();
  }

  if (path.endsWith('/chat.html')) {
    const { initializeChatPage } = await import('./chat/chat-ui.js');
    initializeChatPage();
  }

  if (path.endsWith('/profile.html')) {
    const { initializeProfilePage } = await import('./profile/profile-ui.js');
    initializeProfilePage();
  }

  if (path.endsWith('/login.html')) {
    const { initializeLoginForm } = await import('./auth/login.js');
    initializeLoginForm();
  }

  if (path.endsWith('/register.html')) {
    const { initializeRegisterForm } = await import('./auth/register.js');
    initializeRegisterForm();
  }

  if (path.endsWith('/admin.html')) {
    const { loadDashboard } = await import('./admin/admin-ui.js');
    await loadDashboard();
  }
}

async function bootstrap() {
  const currentPath = getCurrentPath();

  hydrateNavbarShell();
  initializeBulgarianLocalization();
  ensureFormFieldAccessibility();
  startFormAccessibilityObserver();
  initializeTooltips();
  await enforcePageAccess();
  const user = await initializeNavbar();
  initializeLogout();

  if (user?.id) {
    await initializeNotifications(user.id);
  } else {
    cleanupNotifications();
  }

  await initializePageModules(currentPath);
}

bootstrap();