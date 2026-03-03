const DEFAULT_AVATAR = '/assets/avatars/default-avatar.svg';

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('bg', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDateLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('bg', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
}

function sameDate(a, b) {
  const left = new Date(a);
  const right = new Date(b);

  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return false;
  }

  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function renderConversationPreviewText(conversation) {
  if (!conversation.latestMessage?.body) {
    return 'Все още няма съобщения.';
  }

  return conversation.latestMessage.body.length > 60
    ? `${conversation.latestMessage.body.slice(0, 60)}...`
    : conversation.latestMessage.body;
}

export function renderUserSearchResults(users, elements) {
  if (!elements.userSearchResults) {
    return;
  }

  elements.userSearchResults.replaceChildren();

  if (!users.length) {
    const empty = document.createElement('div');
    empty.className = 'small text-secondary px-2 py-2';
    empty.textContent = 'Няма намерени потребители.';
    elements.userSearchResults.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  users.forEach((user) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-group-item list-group-item-action d-flex align-items-center gap-2';
    button.dataset.chatStartWithUserId = user.id;

    const avatar = document.createElement('img');
    avatar.src = user.avatarUrl || DEFAULT_AVATAR;
    avatar.alt = `${user.label || 'User'} avatar`;
    avatar.className = 'rounded-circle chat-avatar-sm';
    avatar.width = 32;
    avatar.height = 32;
    avatar.addEventListener('error', () => {
      avatar.src = DEFAULT_AVATAR;
    }, { once: true });

    const meta = document.createElement('div');
    meta.className = 'd-flex flex-column text-start min-w-0';

    const label = document.createElement('span');
    label.className = 'fw-semibold aqua-truncate-1';
    label.textContent = user.label;

    const sub = document.createElement('span');
    sub.className = 'small text-secondary aqua-truncate-1';
    sub.textContent = user.displayName;

    meta.append(label, sub);
    button.append(avatar, meta);
    fragment.append(button);
  });

  elements.userSearchResults.append(fragment);
}

export function renderConversationList(conversations, activeConversationId, elements) {
  if (!elements.conversationList) {
    return;
  }

  elements.conversationList.replaceChildren();

  if (!conversations.length) {
    const empty = document.createElement('div');
    empty.className = 'small text-secondary px-2 py-2';
    empty.textContent = 'Започни разговор от търсенето.';
    elements.conversationList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  conversations.forEach((conversation) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-group-item list-group-item-action chat-conversation-item';
    button.dataset.chatConversationId = conversation.id;

    if (conversation.id === activeConversationId) {
      button.classList.add('active');
    }

    const row = document.createElement('div');
    row.className = 'd-flex align-items-center gap-2';

    const avatar = document.createElement('img');
    avatar.className = 'rounded-circle chat-avatar-sm flex-shrink-0';
    avatar.width = 36;
    avatar.height = 36;
    avatar.alt = `${conversation.title} avatar`;
    avatar.src = conversation.peer?.avatarUrl || DEFAULT_AVATAR;
    avatar.addEventListener('error', () => {
      avatar.src = DEFAULT_AVATAR;
    }, { once: true });

    const meta = document.createElement('div');
    meta.className = 'min-w-0 flex-grow-1';

    const top = document.createElement('div');
    top.className = 'd-flex align-items-center justify-content-between gap-2';

    const title = document.createElement('span');
    title.className = 'fw-semibold small aqua-truncate-1';
    title.textContent = conversation.title;

    const time = document.createElement('span');
    time.className = 'small text-secondary';
    time.textContent = conversation.latestMessage?.createdAt
      ? formatTime(conversation.latestMessage.createdAt)
      : '';

    top.append(title, time);

    const bottom = document.createElement('div');
    bottom.className = 'd-flex align-items-center justify-content-between gap-2';

    const preview = document.createElement('span');
    preview.className = 'small text-secondary aqua-truncate-1';
    preview.textContent = renderConversationPreviewText(conversation);

    bottom.append(preview);

    if (conversation.unreadCount > 0) {
      const unread = document.createElement('span');
      unread.className = 'badge rounded-pill text-bg-primary chat-unread-badge';
      unread.textContent = String(conversation.unreadCount);
      bottom.append(unread);
    }

    meta.append(top, bottom);
    row.append(avatar, meta);
    button.append(row);
    fragment.append(button);
  });

  elements.conversationList.append(fragment);
}

export function renderChatHeader(conversation, elements) {
  if (!elements.chatHeaderTitle || !elements.chatHeaderMeta) {
    return;
  }

  if (!conversation) {
    elements.chatHeaderTitle.textContent = 'Избери чат';
    elements.chatHeaderMeta.textContent = 'Потърси потребител, за да започнеш съобщения.';
    return;
  }

  elements.chatHeaderTitle.textContent = conversation.title;
  elements.chatHeaderMeta.textContent = conversation.peer?.displayName || 'Директен разговор';
}

export function renderMessages(messages, currentUserId, elements) {
  if (!elements.messagesList) {
    return;
  }

  elements.messagesList.replaceChildren();

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'text-secondary small chat-empty-state';
    empty.textContent = 'Все още няма съобщения. Кажи „Здрасти“ 👋';
    elements.messagesList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastDate = null;

  messages.forEach((message, index) => {
    if (!lastDate || !sameDate(lastDate, message.createdAt)) {
      const separator = document.createElement('div');
      separator.className = 'chat-date-separator';

      const text = document.createElement('span');
      text.className = 'small text-secondary';
      text.textContent = formatDateLabel(message.createdAt);

      separator.append(text);
      fragment.append(separator);
      lastDate = message.createdAt;
    }

    const isMine = message.userId === currentUserId;

    const row = document.createElement('div');
    row.className = `chat-message-row ${isMine ? 'is-mine' : ''}`;

    const bubble = document.createElement('article');
    bubble.className = `chat-message-bubble ${isMine ? 'is-mine' : ''}`;

    if (!isMine) {
      const author = document.createElement('a');
      author.href = `/profile.html?user=${encodeURIComponent(message.userId)}`;
      author.className = 'small fw-semibold text-decoration-none d-inline-block mb-1';
      author.textContent = message.authorLabel;
      bubble.append(author);
    }

    const body = document.createElement('p');
    body.className = 'mb-1';
    body.textContent = message.body;

    const footer = document.createElement('div');
    footer.className = 'chat-message-meta';

    const time = document.createElement('span');
    time.className = 'small text-secondary';
    time.textContent = formatTime(message.createdAt);

    footer.append(time);

    if (isMine && index === messages.length - 1) {
      const readByOthers = [...message.readByUserId.entries()]
        .filter(([userId, timestamp]) => userId !== currentUserId && timestamp && new Date(timestamp).getTime() >= new Date(message.createdAt).getTime());

      const seen = document.createElement('span');
      seen.className = 'small text-secondary';
      seen.textContent = readByOthers.length ? 'Прочетено' : 'Изпратено';
      footer.append(seen);
    }

    bubble.append(body, footer);
    row.append(bubble);
    fragment.append(row);
  });

  elements.messagesList.append(fragment);
}

export function setComposerState(isEnabled, elements) {
  if (elements.messageInput) {
    elements.messageInput.disabled = !isEnabled;
  }

  if (elements.messageSubmit) {
    elements.messageSubmit.disabled = !isEnabled;
  }
}

export function setLoadingState(isLoading, elements) {
  if (!elements.loading) {
    return;
  }

  if (isLoading) {
    elements.loading.classList.add('aqua-skeleton-line');
    elements.loading.classList.remove('d-none');

    if (elements.messagesList instanceof HTMLElement) {
      elements.messagesList.replaceChildren();
      const skeletonWrap = document.createElement('div');
      skeletonWrap.className = 'aqua-skeleton-chat w-100';

      for (let i = 0; i < 6; i += 1) {
        const line = document.createElement('div');
        line.className = 'aqua-skeleton-line';
        line.style.width = `${70 + ((i % 3) * 10)}%`;
        skeletonWrap.append(line);
      }

      elements.messagesList.append(skeletonWrap);
    }
    return;
  }

  elements.loading.classList.remove('aqua-skeleton-line');
  elements.loading.classList.add('d-none');
}

export function showFeedback(message, type, elements) {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.className = `alert alert-${type}`;
  elements.feedback.textContent = message;
  elements.feedback.classList.remove('d-none');
}

export function clearFeedback(elements) {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.classList.add('d-none');
  elements.feedback.textContent = '';
}
