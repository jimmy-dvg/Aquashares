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
import { BULGARIAN_LOCATION_SUGGESTIONS, mergeLocationSuggestions, sanitizeLocation } from '../utils/locations-bg.js';

const state = {
  user: null,
  profile: null,
  profilePosts: [],
  profilePostsSort: 'newest',
  profileComments: [],
  profileCommentsSort: 'newest',
  locationMap: {
    map: null,
    marker: null,
    modalApi: null,
    selectedLat: null,
    selectedLng: null
  }
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
    reddit: document.querySelector('[data-profile-reddit]'),
    telegram: document.querySelector('[data-profile-telegram]'),
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

function getSortFromQueryParam(key, fallback = 'newest') {
  const params = new URLSearchParams(window.location.search);
  return normalizePostsSort(params.get(key) || fallback);
}

function setSortInQueryParam(key, value) {
  const params = new URLSearchParams(window.location.search);
  const normalized = normalizePostsSort(value);

  if (normalized === 'newest') {
    params.delete(key);
  } else {
    params.set(key, normalized);
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `${window.location.pathname}?${queryString}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

function normalizePostsSort(value) {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'oldest' || normalized === 'most_liked' || normalized === 'most_commented' || normalized === 'newest') {
    return normalized;
  }

  return 'newest';
}

function sortProfilePosts(posts, sortOption = 'newest') {
  const normalized = normalizePostsSort(sortOption);
  const items = [...(posts || [])];

  if (normalized === 'oldest') {
    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  if (normalized === 'most_liked') {
    return items.sort((left, right) => {
      const likeDelta = Number(right.likeCount || 0) - Number(left.likeCount || 0);
      if (likeDelta !== 0) {
        return likeDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (normalized === 'most_commented') {
    return items.sort((left, right) => {
      const commentDelta = Number(right.commentCount || 0) - Number(left.commentCount || 0);
      if (commentDelta !== 0) {
        return commentDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function renderSortedPosts(elements) {
  renderPosts(sortProfilePosts(state.profilePosts, state.profilePostsSort), elements);
}

function sortProfileComments(comments, sortOption = 'newest') {
  const normalized = normalizePostsSort(sortOption);
  const items = [...(comments || [])];

  if (normalized === 'oldest') {
    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  if (normalized === 'most_liked') {
    return items.sort((left, right) => {
      const likeDelta = Number(right.postLikeCount || 0) - Number(left.postLikeCount || 0);
      if (likeDelta !== 0) {
        return likeDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  if (normalized === 'most_commented') {
    return items.sort((left, right) => {
      const commentDelta = Number(right.postCommentCount || 0) - Number(left.postCommentCount || 0);
      if (commentDelta !== 0) {
        return commentDelta;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function renderSortedComments(elements) {
  renderComments(sortProfileComments(state.profileComments, state.profileCommentsSort), elements);
}

function updateLocationCoordinatesPreview(elements) {
  if (!(elements.locationCoords instanceof HTMLElement)) {
    return;
  }

  const lat = Number(elements.locationLat?.value || '');
  const lng = Number(elements.locationLng?.value || '');

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    elements.locationCoords.textContent = `Координати: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return;
  }

  elements.locationCoords.textContent = 'Координати: не са избрани';
}

function updateLocationCoordinateInputs(elements, lat, lng) {
  if (elements.locationLat instanceof HTMLInputElement) {
    elements.locationLat.value = Number.isFinite(lat) ? String(lat) : '';
  }

  if (elements.locationLng instanceof HTMLInputElement) {
    elements.locationLng.value = Number.isFinite(lng) ? String(lng) : '';
  }

  updateLocationCoordinatesPreview(elements);
}

async function reverseGeocode(lat, lng) {
  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
  endpoint.searchParams.set('lat', String(lat));
  endpoint.searchParams.set('lon', String(lng));
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('accept-language', 'bg');

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Неуспешно извличане на адрес от картата.');
  }

  const payload = await response.json();
  const address = payload?.address || {};

  return sanitizeLocation(
    address.city
      || address.town
      || address.village
      || address.municipality
      || payload?.display_name
      || ''
  );
}

function initializeLeafletMap(elements) {
  if (state.locationMap.map || !(elements.locationMapRoot instanceof HTMLElement) || !globalThis.L) {
    return;
  }

  const map = globalThis.L.map(elements.locationMapRoot, {
    center: [42.7339, 25.4858],
    zoom: 7,
    zoomControl: true
  });

  globalThis.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    state.locationMap.selectedLat = lat;
    state.locationMap.selectedLng = lng;

    if (!state.locationMap.marker) {
      state.locationMap.marker = globalThis.L.marker([lat, lng]).addTo(map);
    } else {
      state.locationMap.marker.setLatLng([lat, lng]);
    }

    if (elements.locationMapStatus instanceof HTMLElement) {
      elements.locationMapStatus.textContent = `Избрана точка: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  });

  state.locationMap.map = map;
}

function setMapPositionFromProfile(elements) {
  const lat = Number(elements.locationLat?.value || '');
  const lng = Number(elements.locationLng?.value || '');

  if (!state.locationMap.map || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  state.locationMap.selectedLat = lat;
  state.locationMap.selectedLng = lng;

  if (!state.locationMap.marker) {
    state.locationMap.marker = globalThis.L.marker([lat, lng]).addTo(state.locationMap.map);
  } else {
    state.locationMap.marker.setLatLng([lat, lng]);
  }

  state.locationMap.map.setView([lat, lng], 11);
}

function initializeLocationMapPicker(elements) {
  if (!(elements.locationModal instanceof HTMLElement) || !(elements.locationMapOpen instanceof HTMLButtonElement)) {
    return;
  }

  const modalApi = globalThis.bootstrap?.Modal
    ? globalThis.bootstrap.Modal.getOrCreateInstance(elements.locationModal)
    : null;

  state.locationMap.modalApi = modalApi;

  if (elements.locationMapOpen.dataset.bound !== 'true') {
    elements.locationMapOpen.dataset.bound = 'true';
    elements.locationMapOpen.addEventListener('click', () => {
      initializeLeafletMap(elements);
      setMapPositionFromProfile(elements);
      modalApi?.show();
    });
  }

  if (elements.locationModal.dataset.bound !== 'true') {
    elements.locationModal.dataset.bound = 'true';
    elements.locationModal.addEventListener('shown.bs.modal', () => {
      initializeLeafletMap(elements);
      setMapPositionFromProfile(elements);
      if (state.locationMap.map) {
        state.locationMap.map.invalidateSize();
      }
    });
  }

  if (elements.locationMapGeolocate instanceof HTMLButtonElement && elements.locationMapGeolocate.dataset.bound !== 'true') {
    elements.locationMapGeolocate.dataset.bound = 'true';
    elements.locationMapGeolocate.addEventListener('click', () => {
      if (!navigator.geolocation) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Браузърът не поддържа геолокация.';
        }
        return;
      }

      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        initializeLeafletMap(elements);

        state.locationMap.selectedLat = lat;
        state.locationMap.selectedLng = lng;

        if (!state.locationMap.marker) {
          state.locationMap.marker = globalThis.L.marker([lat, lng]).addTo(state.locationMap.map);
        } else {
          state.locationMap.marker.setLatLng([lat, lng]);
        }

        state.locationMap.map?.setView([lat, lng], 13);

        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = `Текуща позиция: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      }, () => {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Нямаме достъп до текущата позиция.';
        }
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    });
  }

  if (elements.locationMapApply instanceof HTMLButtonElement && elements.locationMapApply.dataset.bound !== 'true') {
    elements.locationMapApply.dataset.bound = 'true';
    elements.locationMapApply.addEventListener('click', async () => {
      const lat = state.locationMap.selectedLat;
      const lng = state.locationMap.selectedLng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Първо избери точка от картата.';
        }
        return;
      }

      if (elements.locationMapApply instanceof HTMLButtonElement) {
        elements.locationMapApply.disabled = true;
      }

      try {
        const locationName = await reverseGeocode(lat, lng);

        if (elements.location instanceof HTMLInputElement) {
          elements.location.value = locationName || elements.location.value;
        }

        updateLocationCoordinateInputs(elements, lat, lng);
        updateLocationClearVisibility(elements);
        modalApi?.hide();
      } catch (error) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = error.message || 'Неуспешно извличане на локацията.';
        }
      } finally {
        if (elements.locationMapApply instanceof HTMLButtonElement) {
          elements.locationMapApply.disabled = false;
        }
      }
    });
  }
}

function updateLocationClearVisibility(elements) {
  if (!(elements.locationClear instanceof HTMLButtonElement) || !(elements.location instanceof HTMLInputElement)) {
    return;
  }

  elements.locationClear.classList.toggle('d-none', !elements.location.value.trim());
}

async function initializeLocationPicker(elements) {
  if (!(elements.location instanceof HTMLInputElement) || !(elements.locationList instanceof HTMLDataListElement)) {
    return;
  }

  let dynamicLocations = [];
  try {
    dynamicLocations = await getSuggestedLocations(50);
  } catch {
    dynamicLocations = [];
  }

  const suggestions = mergeLocationSuggestions(BULGARIAN_LOCATION_SUGGESTIONS, dynamicLocations, 80);
  const fragment = document.createDocumentFragment();

  suggestions.forEach((location) => {
    const option = document.createElement('option');
    option.value = location;
    fragment.append(option);
  });

  elements.locationList.replaceChildren(fragment);

  if (elements.location.dataset.bound !== 'true') {
    elements.location.dataset.bound = 'true';
    elements.location.addEventListener('input', () => {
      elements.location.value = sanitizeLocation(elements.location.value);
      updateLocationCoordinateInputs(elements, null, null);
      updateLocationClearVisibility(elements);
    });

    elements.location.addEventListener('blur', () => {
      elements.location.value = sanitizeLocation(elements.location.value);
      updateLocationClearVisibility(elements);
    });
  }

  if (elements.locationClear instanceof HTMLButtonElement && elements.locationClear.dataset.bound !== 'true') {
    elements.locationClear.dataset.bound = 'true';
    elements.locationClear.addEventListener('click', () => {
      if (!(elements.location instanceof HTMLInputElement)) {
        return;
      }

      elements.location.value = '';
      updateLocationCoordinateInputs(elements, null, null);
      updateLocationClearVisibility(elements);
      elements.location.focus();
    });
  }

  updateLocationClearVisibility(elements);
  updateLocationCoordinatesPreview(elements);
}

function getTargetUserId() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user');

  if (!userId) {
    return '';
  }

  return userId.trim();
}

function getProfileContext(currentUserId) {
  const requestedUserId = getTargetUserId();
  const targetUserId = requestedUserId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;

  return {
    targetUserId,
    isOwnProfile
  };
}

function toggleEditSections(elements, isVisible) {
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

function updateProfileHeadings(elements, isOwnProfile) {
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

function configureProfileChatCta(elements, isOwnProfile, profile) {
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


function setLoading(isLoading, elements) {
  if (!elements.loading) {
    return;
  }

  if (isLoading) {
    elements.loading.classList.remove('d-none');
    return;
  }

  elements.loading.classList.add('d-none');
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
    return 'Display name must be at least 2 characters.';
  }

  if (!payload.username || !/^[a-zA-Z0-9_]{3,30}$/.test(payload.username)) {
    return 'Username must be 3-30 characters and use only letters, numbers, and underscores.';
  }

  if (payload.bio.length > 300) {
    return 'Bio must be 300 characters or less.';
  }

  if (payload.location.length > 80) {
    return 'Location must be 80 characters or less.';
  }

  const socialNetworks = [
    { key: 'facebookUrl', label: 'Facebook' },
    { key: 'xUrl', label: 'X' },
    { key: 'linkedinUrl', label: 'LinkedIn' },
    { key: 'redditUrl', label: 'Reddit' },
    { key: 'telegramUrl', label: 'Telegram' }
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
    redditUrl: elements.reddit?.value.trim() || '',
    telegramUrl: elements.telegram?.value.trim() || '',
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
    elements.profileSubmit.textContent = 'Saving...';
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

    showFeedback(elements, 'Profile updated successfully.');
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

    showFeedback(elements, error.message || 'Unable to update profile.', 'danger');
  } finally {
    if (elements.profileSubmit) {
      elements.profileSubmit.disabled = false;
      elements.profileSubmit.textContent = 'Save Profile';
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
    elements.preferencesSubmit.textContent = 'Saving...';
  }

  try {
    await updateMyProfilePreferences(state.user.id, payload);
    showFeedback(elements, 'Preferences saved.');
  } catch (error) {
    showFeedback(elements, error.message || 'Unable to save preferences.', 'danger');
  } finally {
    if (elements.preferencesSubmit) {
      elements.preferencesSubmit.disabled = false;
      elements.preferencesSubmit.textContent = 'Save Preferences';
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
    configureProfileChatCta(elements, isOwnProfile, profile);

    renderProfileSummary(profile, stats, elements);
    if (isOwnProfile) {
      renderProfileForm(profile, elements);
      await initializeLocationPicker(elements);
      initializeLocationMapPicker(elements);
      updateLocationCoordinateInputs(elements, profile.locationLat, profile.locationLng);
      renderPreferences(preferences, elements);
    }

    renderSortedPosts(elements);
    renderSortedComments(elements);

    bindEvents(elements);
  } catch (error) {
    showFeedback(elements, error.message || 'Unable to load profile.', 'danger');
  } finally {
    setLoading(false, elements);
  }
}
