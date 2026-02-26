import { getCurrentUserRole } from '../auth/auth-guard.js';
import { cleanupCommentsUi, createCommentsBlock, initializeCommentsUi } from '../comments/comments-ui.js';
import { supabase } from '../services/supabase-client.js';
import { deletePost, getPostById } from './posts-service.js';
import { showConfirmModal } from '../utils/confirm-modal.js';
import { renderPost } from './post-detail-view.js';

const DEFAULT_AVATAR = '/assets/avatars/default-avatar.svg';

function getElements() {
  return {
    page: document.querySelector('[data-post-detail-page]'),
    loading: document.querySelector('[data-post-detail-loading]'),
    error: document.querySelector('[data-post-detail-error]'),
    card: document.querySelector('[data-post-detail-card]'),
    authorAvatar: document.querySelector('[data-post-author-avatar]'),
    authorLink: document.querySelector('[data-post-author-link]'),
    authorRole: document.querySelector('[data-post-author-role]'),
    createdAt: document.querySelector('[data-post-created-at]'),
    category: document.querySelector('[data-post-category]'),
    title: document.querySelector('[data-post-title]'),
    body: document.querySelector('[data-post-body]'),
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


async function getViewerState() {
  const { data } = await supabase.auth.getSession();
  const viewerUserId = data?.session?.user?.id || null;

  if (!viewerUserId) {
    return {
      userId: null,
      role: null,
      isAdmin: false
    };
  }

  let role = null;

  try {
    role = await getCurrentUserRole(viewerUserId);
  } catch {
    role = 'user';
  }

  return {
    userId: viewerUserId,
    role,
    isAdmin: role === 'admin'
  };
}

async function getAuthorData(authorId) {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
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
    username: profile?.username || 'user',
    displayName: profile?.display_name || profile?.username || 'Aquashares User',
    avatarUrl: profile?.avatar_url || DEFAULT_AVATAR,
    role: roleResult.error ? 'user' : (roleResult.data?.role || 'user')
  };
}


function bindPostActions(elements, postId) {
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

    window.location.assign(`/post-create.html?id=${encodeURIComponent(postId)}`);
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

    const author = await getAuthorData(post.userId);
    renderPost(elements, post, author, DEFAULT_AVATAR);

    const canManagePost = Boolean(viewer.userId) && (viewer.isAdmin || viewer.userId === post.userId);
    if (elements.actions) {
      elements.actions.classList.toggle('d-none', !canManagePost);
    }

    if (canManagePost) {
      bindPostActions(elements, post.id);
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