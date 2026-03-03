import {
  getAuthenticatedUser,
  getCommentsByUserId,
  getPostsByUserId,
  getProfileById,
  getMyProfilePreferences,
  getSuggestedLocations,
  getProfileStatsByUserId,
  updateMyProfile,
  updateMyProfilePreferences
} from './profile-service.js';
import { openDirectConversation } from '../chat/chat-service.js';
import { deleteProfileAvatar, uploadProfileAvatar } from '../services/storage-service.js';
import {
  renderComments,
  renderPosts,
  renderPreferences,
  renderProfileForm,
  renderProfileSummary
} from './profile-ui-render.js';
import {
  getSortFromQueryParam,
  normalizePostsSort,
  setSortInQueryParam,
  sortProfileComments,
  sortProfilePosts
} from './profile-ui-sorting.js';
import {
  initializeLocationMapPicker,
  initializeLocationPicker,
  updateLocationCoordinateInputs
} from './profile-ui-location.js';
import {
  configureProfileChatCta,
  getProfileContext,
  toggleEditSections,
  updateProfileHeadings
} from './profile-ui-context.js';
import { sanitizeLocation } from '../utils/locations-bg.js';

const state = {
  user: null,
  profile: null,
  profilePosts: [],
  profilePostsSort: 'newest',
  profileComments: [],
  profileCommentsSort: 'newest'
};

function getElements() {
  return {
    root: document.querySelector('[data-profile-page]'),
    loading: document.querySelector('[data-profile-loading]'),
    feedback: document.querySelector('[data-profile-feedback]'),
    avatarImage: document.querySelector('[data-profile-avatar]'),
    avatarInput: document.querySelector('[data-profile-avatar-input]'),
    profileForm: document.querySelector('[data-profile-form]'),
    displayName: document.querySelector('[data-profile-display-name]'),
    username: document.querySelector('[data-profile-username]'),
    bio: document.querySelector('[data-profile-bio]'),
    location: document.querySelector('[data-profile-location]'),
    locationList: document.querySelector('[data-profile-location-list]'),
    locationClear: document.querySelector('[data-profile-location-clear]'),
    locationLat: document.querySelector('[data-profile-location-lat]'),
    locationLng: document.querySelector('[data-profile-location-lng]'),
    locationCoords: document.querySelector('[data-profile-location-coords]'),
    locationMapOpen: document.querySelector('[data-profile-location-map-open]'),
    locationModal: document.querySelector('[data-profile-location-modal]'),
    locationMapRoot: document.querySelector('[data-profile-location-map]'),
    locationMapStatus: document.querySelector('[data-profile-location-map-status]'),
    locationMapApply: document.querySelector('[data-profile-location-map-apply]'),
    locationMapGeolocate: document.querySelector('[data-profile-location-map-geolocate]'),
    facebook: document.querySelector('[data-profile-facebook]'),
    x: document.querySelector('[data-profile-x]'),
    linkedin: document.querySelector('[data-profile-linkedin]'),
    isPublic: document.querySelector('[data-profile-public]'),
    profileSubmit: document.querySelector('[data-profile-submit]'),
    preferencesForm: document.querySelector('[data-profile-preferences-form]'),
    notifyComments: document.querySelector('[data-pref-notify-comments]'),
    notifyReplies: document.querySelector('[data-pref-notify-replies]'),
    notifyModeration: document.querySelector('[data-pref-notify-moderation]'),
    showEmail: document.querySelector('[data-pref-show-email]'),
    showActivity: document.querySelector('[data-pref-show-activity]'),
    preferencesSubmit: document.querySelector('[data-pref-submit]'),
    profileName: document.querySelector('[data-profile-name]'),
    profileUsername: document.querySelector('[data-profile-username-display]'),
    profileJoined: document.querySelector('[data-profile-joined]'),
    chatCtaWrap: document.querySelector('[data-profile-chat-cta-wrap]'),
    chatCtaButton: document.querySelector('[data-profile-chat-cta]'),
    statPosts: document.querySelector('[data-profile-stat-posts]'),
    statComments: document.querySelector('[data-profile-stat-comments]'),
    postsSort: document.querySelector('[data-profile-posts-sort]'),
    commentsSort: document.querySelector('[data-profile-comments-sort]'),
    postsList: document.querySelector('[data-profile-posts-list]'),
    commentsList: document.querySelector('[data-profile-comments-list]')
  };
}

function renderSortedPosts(elements) {
  renderPosts(sortProfilePosts(state.profilePosts, state.profilePostsSort), elements);
}

function renderSortedComments(elements) {
  renderComments(sortProfileComments(state.profileComments, state.profileCommentsSort), elements);
}

function setLoading(isLoading, elements) {
  if (!elements.loading) {
    return;
  }

  elements.loading.classList.toggle('aqua-skeleton-line', isLoading);
  elements.loading.classList.toggle('d-none', !isLoading);
}

function showFeedback(elements, message, type = 'success') {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.className = `alert alert-${type}`;
  elements.feedback.textContent = message;
  elements.feedback.classList.remove('d-none');
}

function clearFeedback(elements) {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.classList.add('d-none');
  elements.feedback.textContent = '';
}

function validateProfileInput(payload) {
  if (!payload.displayName || payload.displayName.length < 2) {
    return 'Показваното име трябва да е поне 2 символа.';
  }

  if (!payload.username || !/^[a-zA-Z0-9_]{3,30}$/.test(payload.username)) {
    return 'Потребителското име трябва да е 3-30 символа и да съдържа само букви, цифри и _.';
  }

  if (payload.bio.length > 300) {
    return 'Биографията трябва да е до 300 символа.';
  }

  if (payload.location.length > 80) {
    return 'Локацията трябва да е до 80 символа.';
  }

  const socialNetworks = [
    { key: 'facebookUrl', label: 'Facebook' },
    { key: 'xUrl', label: 'X' },
    { key: 'linkedinUrl', label: 'LinkedIn' }
  ];

  for (const network of socialNetworks) {
    const value = (payload[network.key] || '').trim();
    if (!value) {
      continue;
    }

    if (!/^https?:\/\//i.test(value)) {
      return `${network.label} трябва да започва с http:// или https://`;
    }
  }

  return null;
}

async function handleProfileSave(event, elements) {
  event.preventDefault();
  clearFeedback(elements);

  if (!state.user || !state.profile) {
    return;
  }

  const payload = {
    displayName: elements.displayName?.value.trim() || '',
    username: elements.username?.value.trim() || '',
    bio: elements.bio?.value.trim() || '',
    location: sanitizeLocation(elements.location?.value || ''),
    locationLat: null,
    locationLng: null,
    website: '',
    facebookUrl: elements.facebook?.value.trim() || '',
    xUrl: elements.x?.value.trim() || '',
    linkedinUrl: elements.linkedin?.value.trim() || '',
    isPublic: Boolean(elements.isPublic?.checked),
    avatarUrl: state.profile.avatarUrl || '',
    avatarStoragePath: state.profile.avatarStoragePath || ''
  };

  const locationLatRaw = elements.locationLat?.value?.trim() || '';
  const locationLngRaw = elements.locationLng?.value?.trim() || '';
  const parsedLat = Number(locationLatRaw);
  const parsedLng = Number(locationLngRaw);

  if (locationLatRaw && locationLngRaw && Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
    payload.locationLat = parsedLat;
    payload.locationLng = parsedLng;
  }

  const validationError = validateProfileInput(payload);
  if (validationError) {
    showFeedback(elements, validationError, 'danger');
    return;
  }

  const avatarFile = elements.avatarInput?.files?.[0] ?? null;
  let newAvatar = null;

  if (elements.profileSubmit) {
    elements.profileSubmit.disabled = true;
    elements.profileSubmit.textContent = 'Запазване...';
  }

  try {
    if (avatarFile) {
      newAvatar = await uploadProfileAvatar(avatarFile, state.user.id);
      payload.avatarUrl = newAvatar.publicUrl;
      payload.avatarStoragePath = newAvatar.storagePath;
    }

    const updated = await updateMyProfile(state.user.id, payload);

    if (newAvatar && state.profile.avatarStoragePath && state.profile.avatarStoragePath !== newAvatar.storagePath) {
      await deleteProfileAvatar(state.profile.avatarStoragePath);
    }

    state.profile = updated;

    renderProfileSummary(state.profile, {
      postCount: Number(elements.statPosts?.textContent || '0'),
      commentCount: Number(elements.statComments?.textContent || '0')
    }, elements);

    showFeedback(elements, 'Профилът е обновен успешно.');
    if (elements.avatarInput) {
      elements.avatarInput.value = '';
    }
    updateLocationCoordinateInputs(elements, updated.locationLat, updated.locationLng);
  } catch (error) {
    if (newAvatar?.storagePath) {
      try {
        await deleteProfileAvatar(newAvatar.storagePath);
      } catch {
      }
    }

    showFeedback(elements, error.message || 'Неуспешно обновяване на профила.', 'danger');
  } finally {
    if (elements.profileSubmit) {
      elements.profileSubmit.disabled = false;
      elements.profileSubmit.textContent = 'Запази профила';
    }
  }
}

async function handlePreferencesSave(event, elements) {
  event.preventDefault();
  clearFeedback(elements);

  if (!state.user) {
    return;
  }

  const payload = {
    notifyComments: Boolean(elements.notifyComments?.checked),
    notifyReplies: Boolean(elements.notifyReplies?.checked),
    notifyModeration: Boolean(elements.notifyModeration?.checked),
    showEmail: Boolean(elements.showEmail?.checked),
    showActivity: Boolean(elements.showActivity?.checked)
  };

  if (elements.preferencesSubmit) {
    elements.preferencesSubmit.disabled = true;
    elements.preferencesSubmit.textContent = 'Запазване...';
  }

  try {
    await updateMyProfilePreferences(state.user.id, payload);
    showFeedback(elements, 'Предпочитанията са запазени.');
  } catch (error) {
    showFeedback(elements, error.message || 'Неуспешно запазване на предпочитанията.', 'danger');
  } finally {
    if (elements.preferencesSubmit) {
      elements.preferencesSubmit.disabled = false;
      elements.preferencesSubmit.textContent = 'Запази предпочитанията';
    }
  }
}

function bindEvents(elements) {
  if (elements.postsSort instanceof HTMLSelectElement && elements.postsSort.dataset.bound !== 'true') {
    elements.postsSort.dataset.bound = 'true';
    elements.postsSort.addEventListener('change', () => {
      state.profilePostsSort = normalizePostsSort(elements.postsSort.value);
      setSortInQueryParam('my_posts_sort', state.profilePostsSort);
      renderSortedPosts(elements);
    });
  }

  if (elements.commentsSort instanceof HTMLSelectElement && elements.commentsSort.dataset.bound !== 'true') {
    elements.commentsSort.dataset.bound = 'true';
    elements.commentsSort.addEventListener('change', () => {
      state.profileCommentsSort = normalizePostsSort(elements.commentsSort.value);
      setSortInQueryParam('my_comments_sort', state.profileCommentsSort);
      renderSortedComments(elements);
    });
  }

  if (elements.profileForm && elements.profileForm.dataset.bound !== 'true') {
    elements.profileForm.dataset.bound = 'true';
    elements.profileForm.addEventListener('submit', (event) => {
      handleProfileSave(event, elements);
    });
  }

  if (elements.preferencesForm && elements.preferencesForm.dataset.bound !== 'true') {
    elements.preferencesForm.dataset.bound = 'true';
    elements.preferencesForm.addEventListener('submit', (event) => {
      handlePreferencesSave(event, elements);
    });
  }
}

export async function initializeProfilePage() {
  const elements = getElements();

  if (!elements.root) {
    return;
  }

  setLoading(true, elements);
  clearFeedback(elements);

  try {
    state.user = await getAuthenticatedUser();

    const profileContext = getProfileContext(state.user.id);
    const targetUserId = profileContext.targetUserId;
    const isOwnProfile = profileContext.isOwnProfile;

    const [profile, stats, posts, comments] = await Promise.all([
      getProfileById(targetUserId),
      getProfileStatsByUserId(targetUserId),
      getPostsByUserId(targetUserId),
      getCommentsByUserId(targetUserId)
    ]);

    let preferences = {
      notifyComments: true,
      notifyReplies: true,
      notifyModeration: true,
      showEmail: false,
      showActivity: true
    };

    if (isOwnProfile) {
      try {
        preferences = await getMyProfilePreferences(state.user.id);
      } catch {
      }
    }

    state.profile = profile;
    state.profilePosts = posts;
    state.profileComments = comments;
    state.profilePostsSort = getSortFromQueryParam('my_posts_sort', 'newest');
    state.profileCommentsSort = getSortFromQueryParam('my_comments_sort', 'newest');

    if (elements.postsSort instanceof HTMLSelectElement) {
      elements.postsSort.value = state.profilePostsSort;
    }

    if (elements.commentsSort instanceof HTMLSelectElement) {
      elements.commentsSort.value = state.profileCommentsSort;
    }

    toggleEditSections(elements, isOwnProfile);
    updateProfileHeadings(elements, isOwnProfile);
    configureProfileChatCta(elements, isOwnProfile, profile, {
      clearFeedback,
      showFeedback,
      openDirectConversation
    });

    renderProfileSummary(profile, stats, elements);
    if (isOwnProfile) {
      renderProfileForm(profile, elements);
      await initializeLocationPicker(elements, getSuggestedLocations);
      initializeLocationMapPicker(elements);
      updateLocationCoordinateInputs(elements, profile.locationLat, profile.locationLng);
      renderPreferences(preferences, elements);
    }

    renderSortedPosts(elements);
    renderSortedComments(elements);

    bindEvents(elements);
  } catch (error) {
    showFeedback(elements, error.message || 'Неуспешно зареждане на профила.', 'danger');
  } finally {
    setLoading(false, elements);
  }
}