export function getProfileContext(currentUserId) {
  const params = new URLSearchParams(window.location.search);
  const requestedUserId = (params.get('user') || '').trim();
  const targetUserId = requestedUserId || currentUserId;

  return {
    targetUserId,
    isOwnProfile: targetUserId === currentUserId
  };
}

export function toggleEditSections(elements, isVisible) {
  const editableBlocks = [
    elements.avatarInput?.closest('.text-start'),
    elements.profileForm?.closest('.card'),
    elements.preferencesForm?.closest('.card')
  ].filter(Boolean);

  editableBlocks.forEach((block) => {
    if (isVisible) {
      block.classList.remove('d-none');
      return;
    }

    block.classList.add('d-none');
  });
}

export function updateProfileHeadings(elements, isOwnProfile) {
  const pageTitle = document.querySelector('h1.h3');

  if (pageTitle) {
    pageTitle.textContent = isOwnProfile ? 'My Profile' : 'Profile';
  }

  const postsHeading = elements.postsList?.closest('.card-body')?.querySelector('h2.h5');
  if (postsHeading) {
    postsHeading.textContent = isOwnProfile ? 'My Posts' : 'Posts';
  }

  const commentsHeading = elements.commentsList?.closest('.card-body')?.querySelector('h2.h5');
  if (commentsHeading) {
    commentsHeading.textContent = isOwnProfile ? 'My Comments' : 'Comments';
  }
}

function getChatCtaLabel(profile) {
  if (profile.username) {
    return `Chat with @${profile.username}`;
  }

  return `Chat with ${profile.displayName || 'user'}`;
}

export function configureProfileChatCta(elements, isOwnProfile, profile, { clearFeedback, showFeedback, openDirectConversation }) {
  if (!elements.chatCtaWrap || !elements.chatCtaButton) {
    return;
  }

  if (isOwnProfile) {
    elements.chatCtaWrap.classList.add('d-none');
    return;
  }

  elements.chatCtaWrap.classList.remove('d-none');
  elements.chatCtaButton.textContent = getChatCtaLabel(profile);

  if (elements.chatCtaButton.dataset.bound === 'true') {
    elements.chatCtaButton.dataset.targetUserId = profile.id;
    return;
  }

  elements.chatCtaButton.dataset.bound = 'true';
  elements.chatCtaButton.dataset.targetUserId = profile.id;

  elements.chatCtaButton.addEventListener('click', async () => {
    const targetUserId = elements.chatCtaButton?.dataset.targetUserId;
    if (!targetUserId) {
      return;
    }

    clearFeedback(elements);
    elements.chatCtaButton.disabled = true;

    const defaultLabel = elements.chatCtaButton.textContent;
    elements.chatCtaButton.textContent = 'Opening chat...';

    try {
      const conversationId = await openDirectConversation(targetUserId);
      window.location.assign(`/chat.html?conversation=${encodeURIComponent(conversationId)}`);
    } catch (error) {
      showFeedback(elements, error.message || 'Unable to open chat.', 'danger');
      elements.chatCtaButton.disabled = false;
      elements.chatCtaButton.textContent = defaultLabel || 'Chat';
    }
  });
}