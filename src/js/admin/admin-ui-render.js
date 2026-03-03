export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('bg', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text || '';
  return td;
}

function formatUserNameAndEmail(username, email) {
  const safeUsername = username ? `@${username}` : '-';
  const safeEmail = email || '-';
  return `${safeUsername} (${safeEmail})`;
}

function formatUserHandle(username, fallback = '-') {
  if (username) {
    return `@${username}`;
  }

  return fallback;
}

export function setVisible(element, isVisible) {
  if (!element) {
    return;
  }

  if (isVisible) {
    element.classList.remove('d-none');
    return;
  }

  element.classList.add('d-none');
}

function createEmptyRow(message, colSpan) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = colSpan;
  cell.className = 'text-secondary text-center';
  cell.textContent = message;
  row.append(cell);
  return row;
}

function createRoleSelect(user) {
  const select = document.createElement('select');
  select.className = 'form-select form-select-sm';
  select.dataset.action = 'change-role';
  select.dataset.userId = user.id;

  const userOption = document.createElement('option');
  userOption.value = 'user';
  userOption.textContent = 'user';

  const adminOption = document.createElement('option');
  adminOption.value = 'admin';
  adminOption.textContent = 'admin';

  select.append(userOption, adminOption);
  select.value = user.role === 'admin' ? 'admin' : 'user';
  return select;
}

function createDeleteButton(action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-outline-danger';
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = 'Изтрий';
  return button;
}

function createActionButton(label, action, id, style = 'btn-outline-primary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-sm ${style}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

export function renderUsersTable(users, elements) {
  if (!elements.usersBody) {
    return;
  }

  elements.usersBody.replaceChildren();

  if (!users.length) {
    elements.usersBody.append(createEmptyRow('Няма намерени потребители.', 5));
    setVisible(elements.usersEmpty, true);
    return;
  }

  setVisible(elements.usersEmpty, false);
  const fragment = document.createDocumentFragment();

  users.forEach((user) => {
    const row = document.createElement('tr');

    row.append(
      createCell(formatUserHandle(user.username, user.displayName || '-')),
      createCell(user.displayName || '-'),
      createCell(formatUserNameAndEmail(user.username, user.email)),
      createCell(formatDate(user.createdAt))
    );

    const roleCell = document.createElement('td');
    roleCell.append(createRoleSelect(user));
    row.append(roleCell);

    fragment.append(row);
  });

  elements.usersBody.append(fragment);
}

export function renderPostsTable(posts, elements) {
  if (!elements.postsBody) {
    return;
  }

  elements.postsBody.replaceChildren();

  if (!posts.length) {
    elements.postsBody.append(createEmptyRow('Няма намерени публикации.', 7));
    setVisible(elements.postsEmpty, true);
    return;
  }

  setVisible(elements.postsEmpty, false);
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const row = document.createElement('tr');

    row.append(
      createCell(post.title),
      createCell(post.categoryName || 'Без категория'),
      createCell(formatUserHandle(post.authorUsername)),
      createCell(post.authorEmail),
      createCell(post.body.length > 120 ? `${post.body.slice(0, 120)}...` : post.body),
      createCell(formatDate(post.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.className = 'd-flex flex-wrap gap-2';
    actionsCell.append(
      createActionButton('Преглед', 'preview-post', post.id, 'btn-outline-secondary'),
      createActionButton('Редактирай', 'edit-post', post.id, 'btn-outline-primary'),
      createDeleteButton('delete-post', post.id)
    );
    row.append(actionsCell);

    row.dataset.postId = post.id;
    row.dataset.postTitle = post.title;
    row.dataset.postBody = post.body;
    row.dataset.postAuthorUsername = post.authorUsername;
    row.dataset.postAuthorEmail = post.authorEmail;
    row.dataset.postCreatedAt = post.createdAt;

    fragment.append(row);
  });

  elements.postsBody.append(fragment);
}

export function renderCommentsTable(comments, elements) {
  if (!elements.commentsBody) {
    return;
  }

  elements.commentsBody.replaceChildren();

  if (!comments.length) {
    elements.commentsBody.append(createEmptyRow('Няма намерени коментари.', 6));
    setVisible(elements.commentsEmpty, true);
    return;
  }

  setVisible(elements.commentsEmpty, false);
  const fragment = document.createDocumentFragment();

  comments.forEach((comment) => {
    const row = document.createElement('tr');

    const authorDisplay = `${formatUserHandle(comment.authorUsername)} (${comment.authorEmail})`;

    row.append(
      createCell(comment.postTitle),
      createCell(authorDisplay),
      createCell(comment.body.length > 120 ? `${comment.body.slice(0, 120)}...` : comment.body),
      createCell(formatDate(comment.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.append(createDeleteButton('delete-comment', comment.id));
    row.append(actionsCell);

    fragment.append(row);
  });

  elements.commentsBody.append(fragment);
}

function getSeverityBadgeClass(severity) {
  if (severity === 'critical') {
    return 'text-bg-danger';
  }

  if (severity === 'high') {
    return 'text-bg-warning';
  }

  if (severity === 'medium') {
    return 'text-bg-primary';
  }

  return 'text-bg-secondary';
}

function getReferenceHref(notification) {
  if (notification.referenceType === 'post' && notification.referenceId) {
    return `/post-detail.html?id=${encodeURIComponent(notification.referenceId)}`;
  }

  if (notification.referenceType === 'comment' && notification.referenceId) {
    return `/post-detail.html?comment=${encodeURIComponent(notification.referenceId)}`;
  }

  if (notification.referenceType === 'chat' && notification.referenceId) {
    return `/chat.html?conversation=${encodeURIComponent(notification.referenceId)}`;
  }

  if (notification.referenceType === 'user' && notification.referenceId) {
    return `/profile.html?user=${encodeURIComponent(notification.referenceId)}`;
  }

  return '/admin.html';
}

function getAssigneeLabel(notification, currentAdminId) {
  if (!notification.assigneeId) {
    return 'Неназначено';
  }

  if (notification.assigneeId === currentAdminId) {
    return 'Назначено на теб';
  }

  return 'Назначено';
}

export function renderAdminNotifications(notifications, elements, currentAdminId) {
  if (!elements.adminNotificationsList) {
    return;
  }

  elements.adminNotificationsList.replaceChildren();

  if (!notifications.length) {
    setVisible(elements.adminNotificationsEmpty, true);
    return;
  }

  setVisible(elements.adminNotificationsEmpty, false);

  const fragment = document.createDocumentFragment();
  notifications.forEach((notification) => {
    const item = document.createElement('article');
    item.className = `border rounded-3 p-3 mb-2 aqua-admin-notification ${notification.status === 'resolved' ? 'is-resolved' : 'is-open'}`;

    const top = document.createElement('div');
    top.className = 'd-flex align-items-center flex-wrap gap-2 mb-2';

    const severityBadge = document.createElement('span');
    severityBadge.className = `badge ${getSeverityBadgeClass(notification.severity)}`;
    severityBadge.textContent = (notification.severity || 'low').toUpperCase();

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${notification.status === 'resolved' ? 'text-bg-success' : 'text-bg-dark'}`;
    statusBadge.textContent = notification.status === 'resolved' ? 'Решено' : 'Отворено';

    const occurrences = document.createElement('span');
    occurrences.className = 'badge text-bg-light border';
    occurrences.textContent = `${notification.occurrenceCount || 1} събития`;

    const seenAt = document.createElement('span');
    seenAt.className = 'small text-secondary ms-auto';
    seenAt.textContent = `Последно: ${formatDate(notification.lastSeenAt || notification.createdAt)}`;

    top.append(severityBadge, statusBadge, occurrences, seenAt);

    const title = document.createElement('h3');
    title.className = 'h6 mb-1';
    title.textContent = notification.title;

    const message = document.createElement('p');
    message.className = 'mb-2 text-secondary';
    message.textContent = notification.message;

    const meta = document.createElement('div');
    meta.className = 'small text-secondary mb-2';
    meta.textContent = `${getAssigneeLabel(notification, currentAdminId)} • Създадено: ${formatDate(notification.createdAt)}`;

    const actions = document.createElement('div');
    actions.className = 'd-flex flex-wrap gap-2';

    const openButton = document.createElement('a');
    openButton.className = 'btn btn-sm btn-outline-primary';
    openButton.href = getReferenceHref(notification);
    openButton.textContent = 'Отвори целта';

    const assignButton = document.createElement('button');
    assignButton.type = 'button';
    assignButton.className = 'btn btn-sm btn-outline-secondary';
    assignButton.dataset.action = 'assign-admin-notification';
    assignButton.dataset.id = notification.id;
    assignButton.textContent = 'Назначи на мен';
    assignButton.disabled = notification.status === 'resolved'
      || (notification.assigneeId === currentAdminId && notification.status === 'open');

    const resolveButton = document.createElement('button');
    resolveButton.type = 'button';
    resolveButton.className = 'btn btn-sm btn-success';
    resolveButton.dataset.action = 'resolve-admin-notification';
    resolveButton.dataset.id = notification.id;
    resolveButton.textContent = 'Маркирай като решено';
    resolveButton.disabled = notification.status === 'resolved';

    actions.append(openButton, assignButton, resolveButton);
    item.append(top, title, message, meta, actions);
    fragment.append(item);
  });

  elements.adminNotificationsList.append(fragment);
}
