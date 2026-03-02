import { getCurrentUserRole } from '../auth/auth-guard.js';
import { cleanupCommentsUi, createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';
import { getLikesSummaryByPostIds, subscribeToPostLikes, togglePostLike } from '../reactions/reactions-service.js';
import { createLikeButton, setLikeButtonState } from '../reactions/reactions-ui.js';
import { supabase } from '../services/supabase-client.js';
import { buildPostShareTargets, getConnectedShareNetworks, openSocialLinksSetupModal } from '../utils/social-share.js';
import { deletePost, getPostById } from './posts-service.js';
import { showConfirmModal } from '../utils/confirm-modal.js';
import { renderPost } from './post-detail-view.js';

const DEFAULT_AVATAR = '/assets/avatars/default-avatar.svg';
let unsubscribePostLikesRealtime = null;

function getElements() {
  return {
    page: document.querySelector('[data-post-detail-page]'),
    loading: document.querySelector('[data-post-detail-loading]'),
    error: document.querySelector('[data-post-detail-error]'),
    card: document.querySelector('[data-post-detail-card]'),
    authorAvatar: document.querySelector('[data-post-author-avatar]'),
    authorLink: document.querySelector('[data-post-author-link]'),
    authorRole: document.querySelector('[data-post-author-role]'),
    authorLocation: document.querySelector('[data-post-author-location]'),
    createdAt: document.querySelector('[data-post-created-at]'),
    category: document.querySelector('[data-post-category]'),
    title: document.querySelector('[data-post-title]'),
    body: document.querySelector('[data-post-body]'),
    reactionsRoot: document.querySelector('[data-post-reactions]'),
    galleryMain: document.querySelector('[data-post-gallery-main]'),
    galleryThumbs: document.querySelector('[data-post-gallery-thumbs]'),
    commentsRoot: document.querySelector('[data-post-comments-root]'),
    actions: document.querySelector('[data-post-actions]'),
    editButton: document.querySelector('[data-post-edit]'),
    deleteButton: document.querySelector('[data-post-delete]')
  };
}

function getPostIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('id');
  return value && value.trim() ? value.trim() : null;
}

function getCommentIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('comment');
  return value && value.trim() ? value.trim() : null;
}

async function resolvePostId(postId, commentId) {
  if (postId) {
    return postId;
  }

  if (!commentId) {
    return null;
  }

  const { data, error } = await supabase
    .from('comments')
    .select('post_id')
    .eq('id', commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to resolve post from comment.');
  }

  return data?.post_id || null;
}

function setLoading(elements, isLoading) {
  if (!elements.loading) {
    return;
  }

  elements.loading.classList.toggle('d-none', !isLoading);
}

function showError(elements, message) {
  if (!elements.error) {
    return;
  }

  elements.error.textContent = message;
  elements.error.classList.remove('d-none');
}

function clearError(elements) {
  if (!elements.error) {
    return;
  }

  elements.error.textContent = '';
  elements.error.classList.add('d-none');
}

function cleanupPostLikesRealtime() {
  if (typeof unsubscribePostLikesRealtime !== 'function') {
    return;
  }

  unsubscribePostLikesRealtime();
  unsubscribePostLikesRealtime = null;
}


async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const viewerUserId = data?.session?.user?.id || null;

  if (!viewerUserId) {
    return {
      userId: null,
      role: null,
      isAdmin: false,
      shareNetworks: []
    };
  }

  let role = null;

  try {
    role = await getCurrentUserRole(viewerUserId);
  } catch {
    role = 'user';
  }

  const viewer = {
    userId: viewerUserId,
    role,
    isAdmin: role === 'admin',
    shareNetworks: []
  };

  try {
    const { data: socialProfile, error } = await supabase
      .from('profiles')
      .select('facebook_url, x_url, linkedin_url, reddit_url, telegram_url')
      .eq('id', viewerUserId)
      .maybeSingle();

    if (!error && socialProfile) {
      viewer.shareNetworks = getConnectedShareNetworks({
        facebookUrl: socialProfile.facebook_url || '',
        xUrl: socialProfile.x_url || '',
        linkedinUrl: socialProfile.linkedin_url || '',
        redditUrl: socialProfile.reddit_url || '',
        telegramUrl: socialProfile.telegram_url || ''
      });
    }
  } catch {
  }

  return viewer;
}

async function getAuthorData(authorId) {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, location')
      .eq('id', authorId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authorId)
      .maybeSingle()
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Unable to load author profile.');
  }

  const profile = profileResult.data;

  return {
    id: authorId,
    username: profile?.username || '',
    displayName: profile?.display_name || profile?.username || 'Aquashares User',
    avatarUrl: profile?.avatar_url || DEFAULT_AVATAR,
    location: (profile?.location || '').replace(/\s+/g, ' ').trim(),
    role: roleResult.error ? 'user' : (roleResult.data?.role || 'user')
  };
}


function bindPostActions(elements, postId, categorySection = '') {
  if (!elements.editButton || !elements.deleteButton) {
    return;
  }

  elements.editButton.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Edit post',
      message: 'Open this post in edit mode?',
      confirmLabel: 'Edit',
      confirmButtonClass: 'btn-primary'
    });

    if (!confirmed) {
      return;
    }

    const params = new URLSearchParams();
    params.set('id', postId);

    const section = (categorySection || '').trim();
    if (section) {
      params.set('section', section);
    }

    window.location.assign(`/post-create.html?${params.toString()}`);
  });

  elements.deleteButton.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Delete post',
      message: 'Delete this post? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmButtonClass: 'btn-danger'
    });

    if (!confirmed) {
      return;
    }

    elements.deleteButton.disabled = true;

    try {
      await deletePost(postId);
      window.location.assign('/index.html');
    } catch (error) {
      showError(elements, error.message || 'Unable to delete post.');
      elements.deleteButton.disabled = false;
    }
  });
}

function focusCommentFromQuery() {
  const commentId = getCommentIdFromQuery();
  if (!commentId) {
    return;
  }

  const target = document.getElementById(`comment-${commentId}`);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('border-primary', 'border-2');

  window.setTimeout(() => {
    target.classList.remove('border-primary', 'border-2');
  }, 2200);
}

function renderPostReactions(elements, post, viewer) {
  if (!elements.reactionsRoot) {
    return;
  }

  elements.reactionsRoot.replaceChildren();

  const reactionsBar = document.createElement('div');
  reactionsBar.className = 'd-flex align-items-center justify-content-between gap-2 border rounded-3 px-3 py-2';

  const summary = document.createElement('div');
  summary.className = 'small text-secondary';
  summary.textContent = `${post.likeCount || 0} likes`;

  const likeButton = createLikeButton({
    postId: post.id,
    likeCount: post.likeCount || 0,
    likedByViewer: post.likedByViewer === true,
    isAuthenticated: Boolean(viewer?.userId)
  });

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'd-inline-flex align-items-center gap-2';

  const shareTargets = buildPostShareTargets(post.id, post.title, viewer?.shareNetworks || []);
  if (viewer?.userId) {
    if (shareTargets.length) {
      const shareDropdown = document.createElement('div');
      shareDropdown.className = 'dropdown';

      const shareToggle = document.createElement('button');
      shareToggle.type = 'button';
      shareToggle.className = 'btn btn-sm btn-outline-secondary dropdown-toggle';
      shareToggle.setAttribute('data-bs-toggle', 'dropdown');
      shareToggle.setAttribute('aria-expanded', 'false');
      shareToggle.innerHTML = '<i class="bi bi-share me-1" aria-hidden="true"></i>Сподели';

      const shareMenu = document.createElement('ul');
      shareMenu.className = 'dropdown-menu dropdown-menu-end';

      shareTargets.forEach((target) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dropdown-item';
        link.href = target.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = `<i class="bi ${target.icon} me-2" aria-hidden="true"></i>${target.label}`;
        item.append(link);
        shareMenu.append(item);
      });

      shareDropdown.append(shareToggle, shareMenu);
      actionsWrap.append(shareDropdown);
    } else {
      const shareSetupButton = document.createElement('button');
      shareSetupButton.type = 'button';
      shareSetupButton.className = 'btn btn-sm btn-outline-secondary';
      shareSetupButton.title = 'Добави социална мрежа, за да активираш споделяне.';
      shareSetupButton.innerHTML = '<i class="bi bi-share me-1" aria-hidden="true"></i>Сподели';
      shareSetupButton.addEventListener('click', async () => {
        await openSocialLinksSetupModal({
          onSaved: (connectedNetworks) => {
            post.likeCount = Number(likeButton.dataset.likeCount || post.likeCount || 0);
            post.likedByViewer = likeButton.dataset.liked === 'true';
            viewer.shareNetworks = connectedNetworks;
            renderPostReactions(elements, post, viewer);
          }
        });
      });
      actionsWrap.append(shareSetupButton);
    }
  }

  actionsWrap.append(likeButton);

  reactionsBar.append(summary, actionsWrap);
  elements.reactionsRoot.append(reactionsBar);

  let isPending = false;

  likeButton.addEventListener('click', async () => {
    if (!viewer?.userId || isPending) {
      return;
    }

    const previousState = {
      postId: post.id,
      likeCount: Number(likeButton.dataset.likeCount || '0'),
      likedByViewer: likeButton.dataset.liked === 'true'
    };

    const optimisticState = {
      ...previousState,
      likedByViewer: !previousState.likedByViewer,
      likeCount: Math.max(0, previousState.likeCount + (previousState.likedByViewer ? -1 : 1))
    };

    isPending = true;
    setLikeButtonState(likeButton, {
      ...optimisticState,
      isAuthenticated: true,
      isPending: true
    });
    summary.textContent = `${optimisticState.likeCount} likes`;

    try {
      const nextState = await togglePostLike(post.id, viewer.userId);
      post.likeCount = nextState.likeCount;
      post.likedByViewer = nextState.likedByViewer;

      setLikeButtonState(likeButton, {
        ...nextState,
        isAuthenticated: true,
        isPending: false
      });
      summary.textContent = `${nextState.likeCount} likes`;
    } catch (error) {
      setLikeButtonState(likeButton, {
        ...previousState,
        isAuthenticated: true,
        isPending: false
      });
      summary.textContent = `${previousState.likeCount} likes`;
      showError(elements, error.message || 'Unable to update like.');
    } finally {
      isPending = false;
    }
  });

  cleanupPostLikesRealtime();
  unsubscribePostLikesRealtime = subscribeToPostLikes([post.id], async () => {
    try {
      const likesSummaryByPostId = await getLikesSummaryByPostIds([post.id], viewer?.userId || null).catch(() => new Map());
      const nextState = likesSummaryByPostId.get(post.id) || {
        likeCount: 0,
        likedByViewer: false
      };

      post.likeCount = nextState.likeCount;
      post.likedByViewer = nextState.likedByViewer;

      setLikeButtonState(likeButton, {
        postId: post.id,
        likeCount: nextState.likeCount,
        likedByViewer: nextState.likedByViewer,
        isAuthenticated: Boolean(viewer?.userId),
        isPending: likeButton.dataset.pending === 'true'
      });
      summary.textContent = `${nextState.likeCount} likes`;
    } catch {
    }
  });
}

export async function initializePostDetailPage() {
  const elements = getElements();

  if (!elements.page || !elements.card || !elements.commentsRoot) {
    return;
  }

  const requestedPostId = getPostIdFromQuery();
  const commentId = getCommentIdFromQuery();

  setLoading(elements, true);
  clearError(elements);
  cleanupCommentsUi();
  cleanupPostLikesRealtime();

  try {
    const postId = await resolvePostId(requestedPostId, commentId);

    if (!postId) {
      throw new Error('Missing post ID.');
    }

    if (!requestedPostId && commentId) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set('id', postId);
      const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
      window.history.replaceState(null, '', nextUrl);
    }

    const [post, viewer] = await Promise.all([
      getPostById(postId),
      getViewerState()
    ]);

    const likesSummaryByPostId = await getLikesSummaryByPostIds([post.id], viewer.userId).catch(() => new Map());
    const likesSummary = likesSummaryByPostId.get(post.id) || {
      likeCount: 0,
      likedByViewer: false
    };

    const postWithLikes = {
      ...post,
      likeCount: likesSummary.likeCount,
      likedByViewer: likesSummary.likedByViewer
    };

    const author = await getAuthorData(post.userId);
    renderPost(elements, postWithLikes, author, DEFAULT_AVATAR);
    renderPostReactions(elements, postWithLikes, viewer);

    const canManagePost = Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);
    if (elements.actions) {
      elements.actions.classList.toggle('d-none', !canManagePost);
    }

    if (canManagePost) {
      bindPostActions(elements, post.id, post.categorySection || '');
    }

    elements.commentsRoot.replaceChildren(createCommentsBlock(post.id, Boolean(viewer.userId)));
    await initializeCommentsUi(elements.commentsRoot, viewer.userId);

    elements.card.classList.remove('d-none');
    focusCommentFromQuery();
  } catch (error) {
    showError(elements, error.message || 'Unable to load post details right now.');
  } finally {
    setLoading(elements, false);
  }
}