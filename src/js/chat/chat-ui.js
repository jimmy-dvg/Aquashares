import {
  getAuthenticatedChatUser,
  getConversationList,
  getConversationMessages,
  markConversationAsRead,
  openDirectConversation,
  searchChatUsers,
  sendChatMessage,
  subscribeToConversation
} from './chat-service.js';
import {
  clearFeedback,
  renderChatHeader,
  renderConversationList,
  renderMessages,
  renderUserSearchResults,
  setComposerState,
  setLoadingState,
  showFeedback
} from './chat-ui-render.js';

const state = {
  user: null,
  conversations: [],
  activeConversationId: '',
  activeMessages: [],
  searchDebounceTimer: null,
  activeConversationSubscription: null,
  lastReadSyncByConversationId: new Map()
};

function getElements() {
  return {
    root: document.querySelector('[data-chat-page]'),
    loading: document.querySelector('[data-chat-loading]'),
    feedback: document.querySelector('[data-chat-feedback]'),
    userSearchInput: document.querySelector('[data-chat-user-search]'),
    userSearchResults: document.querySelector('[data-chat-user-results]'),
    conversationList: document.querySelector('[data-chat-conversation-list]'),
    chatHeaderTitle: document.querySelector('[data-chat-header-title]'),
    chatHeaderMeta: document.querySelector('[data-chat-header-meta]'),
    messagesList: document.querySelector('[data-chat-messages]'),
    composerForm: document.querySelector('[data-chat-composer]'),
    messageInput: document.querySelector('[data-chat-message-input]'),
    messageSubmit: document.querySelector('[data-chat-message-submit]')
  };
}

function getRequestedConversationId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('conversation');

  if (!value) {
    return '';
  }

  return value.trim();
}

function getConversationById(conversationId) {
  return state.conversations.find((conversation) => conversation.id === conversationId) || null;
}

function clearConversationSubscription() {
  if (typeof state.activeConversationSubscription === 'function') {
    state.activeConversationSubscription();
  }

  state.activeConversationSubscription = null;
}

function scrollMessagesToBottom(elements) {
  if (!elements.messagesList) {
    return;
  }

  elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
}

function hasUnreadIncomingMessages(messages, currentUserId) {
  if (!messages.length || !currentUserId) {
    return false;
  }

  const readByUserId = messages[0]?.readByUserId;
  const currentUserReadAt = readByUserId?.get(currentUserId);
  const currentUserReadAtMs = currentUserReadAt ? new Date(currentUserReadAt).getTime() : 0;

  return messages.some((message) => {
    if (message.userId === currentUserId) {
      return false;
    }

    const createdAtMs = new Date(message.createdAt).getTime();
    return createdAtMs > currentUserReadAtMs;
  });
}

function shouldSyncReadStatus(conversationId, messages, currentUserId) {
  if (!conversationId || !hasUnreadIncomingMessages(messages, currentUserId)) {
    return false;
  }

  const previousSyncMs = state.lastReadSyncByConversationId.get(conversationId) || 0;
  const nowMs = Date.now();

  return nowMs - previousSyncMs > 1200;
}

async function refreshConversationList(elements) {
  if (!state.user?.id) {
    return;
  }

  state.conversations = await getConversationList(state.user.id);

  if (state.activeConversationId && !getConversationById(state.activeConversationId)) {
    state.activeConversationId = '';
    state.activeMessages = [];
  }

  renderConversationList(state.conversations, state.activeConversationId, elements);
  renderChatHeader(getConversationById(state.activeConversationId), elements);
}

async function loadActiveConversationMessages(elements, options = {}) {
  const shouldMarkAsRead = options.shouldMarkAsRead !== false;

  if (!state.activeConversationId || !state.user?.id) {
    state.activeMessages = [];
    renderMessages(state.activeMessages, state.user?.id || '', elements);
    setComposerState(false, elements);
    return;
  }

  state.activeMessages = await getConversationMessages(state.activeConversationId);
  renderMessages(state.activeMessages, state.user.id, elements);
  setComposerState(true, elements);
  scrollMessagesToBottom(elements);

  if (shouldMarkAsRead && shouldSyncReadStatus(state.activeConversationId, state.activeMessages, state.user.id)) {
    await markConversationAsRead(state.activeConversationId, state.user.id);
    state.lastReadSyncByConversationId.set(state.activeConversationId, Date.now());
  }
}

async function activateConversation(conversationId, elements) {
  if (!conversationId || !state.user?.id) {
    return;
  }

  clearConversationSubscription();
  state.activeConversationId = conversationId;

  renderConversationList(state.conversations, state.activeConversationId, elements);
  renderChatHeader(getConversationById(state.activeConversationId), elements);

  await loadActiveConversationMessages(elements);

  state.activeConversationSubscription = subscribeToConversation(conversationId, {
    onMessageInsert: async (insertedMessage) => {
      if (insertedMessage?.user_id === state.user?.id) {
        return;
      }

      await loadActiveConversationMessages(elements, { shouldMarkAsRead: true });
      await refreshConversationList(elements);
    },
    onParticipantUpdate: async (updatedParticipant) => {
      if (updatedParticipant?.user_id === state.user?.id) {
        return;
      }

      await loadActiveConversationMessages(elements, { shouldMarkAsRead: false });
    }
  });

  await refreshConversationList(elements);
}

async function handleUserSearch(query, elements) {
  if (!state.user?.id) {
    return;
  }

  const users = await searchChatUsers(query, state.user.id, 12);
  renderUserSearchResults(users, elements);
}

function bindUserSearch(elements) {
  if (!(elements.userSearchInput instanceof HTMLInputElement) || !elements.userSearchResults) {
    return;
  }

  if (elements.userSearchInput.dataset.bound === 'true') {
    return;
  }

  elements.userSearchInput.dataset.bound = 'true';

  elements.userSearchInput.addEventListener('input', () => {
    const value = elements.userSearchInput.value || '';

    if (state.searchDebounceTimer) {
      window.clearTimeout(state.searchDebounceTimer);
    }

    state.searchDebounceTimer = window.setTimeout(async () => {
      try {
        await handleUserSearch(value, elements);
      } catch (error) {
        showFeedback(error.message || 'Неуспешно търсене на потребители.', 'danger', elements);
      }
    }, 220);
  });

  elements.userSearchResults.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest('[data-chat-start-with-user-id]');
    if (!(actionButton instanceof HTMLButtonElement)) {
      return;
    }

    const otherUserId = actionButton.dataset.chatStartWithUserId;
    if (!otherUserId) {
      return;
    }

    try {
      clearFeedback(elements);
      const conversationId = await openDirectConversation(otherUserId);
      await refreshConversationList(elements);
      await activateConversation(conversationId, elements);
      if (elements.messageInput instanceof HTMLTextAreaElement) {
        elements.messageInput.focus();
      }
    } catch (error) {
      showFeedback(error.message || 'Неуспешно отваряне на чат.', 'danger', elements);
    }
  });
}

function bindConversationList(elements) {
  if (!elements.conversationList || elements.conversationList.dataset.bound === 'true') {
    return;
  }

  elements.conversationList.dataset.bound = 'true';

  elements.conversationList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const conversationButton = target.closest('[data-chat-conversation-id]');
    if (!(conversationButton instanceof HTMLButtonElement)) {
      return;
    }

    const conversationId = conversationButton.dataset.chatConversationId;
    if (!conversationId || conversationId === state.activeConversationId) {
      return;
    }

    try {
      clearFeedback(elements);
      await activateConversation(conversationId, elements);
    } catch (error) {
      showFeedback(error.message || 'Неуспешно зареждане на разговора.', 'danger', elements);
    }
  });
}

function bindComposer(elements) {
  if (!(elements.composerForm instanceof HTMLFormElement) || elements.composerForm.dataset.bound === 'true') {
    return;
  }

  elements.composerForm.dataset.bound = 'true';

  elements.composerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.activeConversationId || !state.user?.id || !(elements.messageInput instanceof HTMLTextAreaElement)) {
      return;
    }

    const body = elements.messageInput.value.trim();

    if (!body) {
      return;
    }

    if (body.length > 4000) {
      showFeedback('Съобщението е твърде дълго. Максимум 4000 символа.', 'danger', elements);
      return;
    }

    clearFeedback(elements);
    setComposerState(false, elements);

    try {
      await sendChatMessage(state.activeConversationId, state.user.id, body);
      elements.messageInput.value = '';
      await loadActiveConversationMessages(elements);
      await refreshConversationList(elements);
      if (elements.messageInput instanceof HTMLTextAreaElement) {
        elements.messageInput.focus();
      }
    } catch (error) {
      showFeedback(error.message || 'Неуспешно изпращане на съобщение.', 'danger', elements);
    } finally {
      setComposerState(Boolean(state.activeConversationId), elements);
    }
  });
}

export async function initializeChatPage() {
  const elements = getElements();

  if (!elements.root) {
    return;
  }

  if (elements.messageSubmit instanceof HTMLButtonElement && !elements.messageSubmit.getAttribute('aria-label')) {
    elements.messageSubmit.setAttribute('aria-label', 'Изпрати съобщение');
  }

  setLoadingState(true, elements);
  clearFeedback(elements);
  setComposerState(false, elements);

  try {
    state.user = await getAuthenticatedChatUser();
    const requestedConversationId = getRequestedConversationId();

    bindUserSearch(elements);
    bindConversationList(elements);
    bindComposer(elements);

    await refreshConversationList(elements);
    await handleUserSearch('', elements);

    if (state.conversations.length) {
      const requestedConversationExists = requestedConversationId
        && state.conversations.some((conversation) => conversation.id === requestedConversationId);
      const initialConversationId = requestedConversationExists
        ? requestedConversationId
        : state.conversations[0].id;

      await activateConversation(initialConversationId, elements);

      if (requestedConversationExists && window.history?.replaceState) {
        window.history.replaceState({}, '', '/chat.html');
      }
    } else {
      renderChatHeader(null, elements);
      renderMessages([], state.user.id, elements);
    }
  } catch (error) {
    showFeedback(error.message || 'Неуспешно инициализиране на чата.', 'danger', elements);
  } finally {
    setLoadingState(false, elements);
  }
}
