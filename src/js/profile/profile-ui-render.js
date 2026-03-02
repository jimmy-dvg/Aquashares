const DEFAULT_AVATAR = '/assets/avatars/default-avatar.svg';

function formatDate(value) {
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

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return `${text.slice(0, maxLength)}...`;
}

export function renderProfileSummary(profile, stats, elements) {
  if (elements.profileName) {
    elements.profileName.textContent = profile.displayName || 'Aquashares User';
  }

  if (elements.profileUsername) {
    elements.profileUsername.textContent = profile.username ? `@${profile.username}` : '@user';
  }

  if (elements.profileJoined) {
    elements.profileJoined.textContent = profile.createdAt ? `Joined ${formatDate(profile.createdAt)}` : '';
  }

  if (elements.statPosts) {
    elements.statPosts.textContent = String(stats.postCount);
  }

  if (elements.statComments) {
    elements.statComments.textContent = String(stats.commentCount);
  }

  if (elements.avatarImage) {
    elements.avatarImage.src = profile.avatarUrl || DEFAULT_AVATAR;
    elements.avatarImage.alt = `${profile.displayName || 'User'} avatar`;
  }
}

export function renderProfileForm(profile, elements) {
  if (elements.displayName) {
    elements.displayName.value = profile.displayName || '';
  }

  if (elements.username) {
    elements.username.value = profile.username || '';
  }

  if (elements.bio) {
    elements.bio.value = profile.bio || '';
  }

  if (elements.location) {
    elements.location.value = profile.location || '';
  }

  if (elements.facebook) {
    elements.facebook.value = profile.facebookUrl || '';
  }

  if (elements.x) {
    elements.x.value = profile.xUrl || '';
  }

  if (elements.linkedin) {
    elements.linkedin.value = profile.linkedinUrl || '';
  }

  if (elements.reddit) {
    elements.reddit.value = profile.redditUrl || '';
  }

  if (elements.telegram) {
    elements.telegram.value = profile.telegramUrl || '';
  }

  if (elements.isPublic) {
    elements.isPublic.checked = Boolean(profile.isPublic);
  }
}

export function renderPreferences(preferences, elements) {
  if (elements.notifyComments) {
    elements.notifyComments.checked = Boolean(preferences.notifyComments);
  }

  if (elements.notifyReplies) {
    elements.notifyReplies.checked = Boolean(preferences.notifyReplies);
  }

  if (elements.notifyModeration) {
    elements.notifyModeration.checked = Boolean(preferences.notifyModeration);
  }

  if (elements.showEmail) {
    elements.showEmail.checked = Boolean(preferences.showEmail);
  }

  if (elements.showActivity) {
    elements.showActivity.checked = Boolean(preferences.showActivity);
  }
}

export function renderPosts(posts, elements) {
  if (!elements.postsList) {
    return;
  }

  elements.postsList.replaceChildren();

  if (!posts.length) {
    const empty = document.createElement('div');
    empty.className = 'text-secondary';
    empty.textContent = 'No posts yet.';
    elements.postsList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const item = document.createElement('a');
    item.href = `/post-detail.html?id=${encodeURIComponent(post.id)}`;
    item.className = 'list-group-item list-group-item-action';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = post.title;

    const meta = document.createElement('div');
    meta.className = 'small text-secondary';
    meta.textContent = `${formatDate(post.createdAt)} • ❤️ ${Number(post.likeCount || 0)} • 💬 ${Number(post.commentCount || 0)} • ${truncate(post.body, 100)}`;

    item.append(title, meta);
    fragment.append(item);
  });

  elements.postsList.append(fragment);
}

export function renderComments(comments, elements) {
  if (!elements.commentsList) {
    return;
  }

  elements.commentsList.replaceChildren();

  if (!comments.length) {
    const empty = document.createElement('div');
    empty.className = 'text-secondary';
    empty.textContent = 'No comments yet.';
    elements.commentsList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  comments.forEach((comment) => {
    const item = document.createElement('a');
    item.href = `/post-detail.html?id=${encodeURIComponent(comment.postId)}&comment=${encodeURIComponent(comment.id)}`;
    item.className = 'list-group-item list-group-item-action';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = comment.postTitle;

    const body = document.createElement('div');
    body.className = 'small';
    body.textContent = truncate(comment.body, 180);

    const meta = document.createElement('div');
    meta.className = 'small text-secondary';
    meta.textContent = formatDate(comment.createdAt);

    item.append(title, body, meta);
    fragment.append(item);
  });

  elements.commentsList.append(fragment);
}
