import { supabase } from './services/supabase-client.js';
import { getFeedPosts } from './posts/posts-service.js';
import { renderFeedPosts } from './posts/posts-ui.js';

async function initializeAuthUi() {
  const authStatusElement = document.querySelector('[data-auth-status]');
  const authActionElement = document.querySelector('[data-auth-action]');

  if (!authStatusElement || !authActionElement) {
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    authStatusElement.textContent = 'Guest';
    authStatusElement.setAttribute('href', '/login.html');
    authActionElement.textContent = 'Login';
    authActionElement.setAttribute('href', '/login.html');
    return;
  }

  authStatusElement.textContent = data.session.user.email;
  authStatusElement.setAttribute('href', '/profile.html');
  authActionElement.textContent = 'Logout';
  authActionElement.setAttribute('href', '#');
  authActionElement.addEventListener('click', async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.replace('/login.html');
  });
}

initializeAuthUi();

async function initializeFeed() {
  const feedContainer = document.querySelector('[data-feed-list]');
  const loadingElement = document.querySelector('[data-feed-loading]');
  const errorElement = document.querySelector('[data-feed-error]');

  if (!feedContainer) {
    return;
  }

  if (loadingElement) {
    loadingElement.classList.remove('d-none');
  }

  if (errorElement) {
    errorElement.classList.add('d-none');
  }

  try {
    const posts = await getFeedPosts();
    renderFeedPosts(posts, feedContainer);
  } catch (error) {
    if (errorElement) {
      errorElement.textContent = 'Unable to load feed right now. Please try again.';
      errorElement.classList.remove('d-none');
    }
  } finally {
    if (loadingElement) {
      loadingElement.classList.add('d-none');
    }
  }
}

initializeFeed();