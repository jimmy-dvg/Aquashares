import { getLikesSummaryByPostIds, subscribeToPostLikes, togglePostLike } from '../reactions/reactions-service.js';
import { createLikeButton, setLikeButtonState } from '../reactions/reactions-ui.js';
import { buildPostShareTargets, openSocialLinksSetupModal } from '../utils/social-share.js';

let unsubscribePostLikesRealtime = null;

export function cleanupPostLikesRealtime() {
  if (typeof unsubscribePostLikesRealtime !== 'function') {
    return;
  }

  unsubscribePostLikesRealtime();
  unsubscribePostLikesRealtime = null;
}

export function renderPostReactions(elements, post, viewer, showError) {
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
            renderPostReactions(elements, post, viewer, showError);
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
      showError(error.message || 'Unable to update like.');
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
