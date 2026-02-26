export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
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
  button.textContent = 'Delete';
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
    elements.usersBody.append(createEmptyRow('No users found.', 5));
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
    elements.postsBody.append(createEmptyRow('No posts found.', 7));
    setVisible(elements.postsEmpty, true);
    return;
  }

  setVisible(elements.postsEmpty, false);
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const row = document.createElement('tr');

    row.append(
      createCell(post.title),
      createCell(post.categoryName || 'Uncategorized'),
      createCell(formatUserHandle(post.authorUsername)),
      createCell(post.authorEmail),
      createCell(post.body.length > 120 ? `${post.body.slice(0, 120)}...` : post.body),
      createCell(formatDate(post.createdAt))
    );

    const actionsCell = document.createElement('td');
    actionsCell.className = 'd-flex flex-wrap gap-2';
    actionsCell.append(
      createActionButton('Preview', 'preview-post', post.id, 'btn-outline-secondary'),
      createActionButton('Edit', 'edit-post', post.id, 'btn-outline-primary'),
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
    elements.commentsBody.append(createEmptyRow('No comments found.', 6));
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
