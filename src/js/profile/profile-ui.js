import {
  getAuthenticatedUser,
  getMyComments,
  getMyPosts,
  getMyProfile,
  getMyProfilePreferences,
  getMyProfileStats,
  updateMyProfile,
  updateMyProfilePreferences
} from './profile-service.js';
import { deleteProfileAvatar, uploadProfileAvatar } from '../services/storage-service.js';
import {
  renderComments,
  renderPosts,
  renderPreferences,
  renderProfileForm,
  renderProfileSummary
} from './profile-ui-render.js';

const state = {
  user: null,
  profile: null
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
    website: document.querySelector('[data-profile-website]'),
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
    statPosts: document.querySelector('[data-profile-stat-posts]'),
    statComments: document.querySelector('[data-profile-stat-comments]'),
    postsList: document.querySelector('[data-profile-posts-list]'),
    commentsList: document.querySelector('[data-profile-comments-list]')
  };
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

  if (payload.website && !/^https?:\/\//i.test(payload.website)) {
    return 'Website must start with http:// or https://';
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
    location: elements.location?.value.trim() || '',
    website: elements.website?.value.trim() || '',
    isPublic: Boolean(elements.isPublic?.checked),
    avatarUrl: state.profile.avatarUrl || '',
    avatarStoragePath: state.profile.avatarStoragePath || ''
  };

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

    const [profile, stats, posts, comments] = await Promise.all([
      getMyProfile(state.user.id),
      getMyProfileStats(state.user.id),
      getMyPosts(state.user.id),
      getMyComments(state.user.id)
    ]);

    let preferences = {
      notifyComments: true,
      notifyReplies: true,
      notifyModeration: true,
      showEmail: false,
      showActivity: true
    };

    try {
      preferences = await getMyProfilePreferences(state.user.id);
    } catch {
    }

    state.profile = profile;

    renderProfileSummary(profile, stats, elements);
    renderProfileForm(profile, elements);
    renderPosts(posts, elements);
    renderComments(comments, elements);
    renderPreferences(preferences, elements);
    bindEvents(elements);
  } catch (error) {
    showFeedback(elements, error.message || 'Unable to load profile.', 'danger');
  } finally {
    setLoading(false, elements);
  }
}
