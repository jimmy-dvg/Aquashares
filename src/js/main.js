import { supabase } from './services/supabase-client.js';

async function initializeAuthUi() {
  const authStatusElement = document.querySelector('[data-auth-status]');
  const authActionElement = document.querySelector('[data-auth-action]');

  if (!authStatusElement || !authActionElement) {
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    authStatusElement.textContent = 'Guest';
    authActionElement.textContent = 'Login';
    authActionElement.setAttribute('href', '/login.html');
    return;
  }

  authStatusElement.textContent = data.session.user.email;
  authActionElement.textContent = 'Logout';
  authActionElement.setAttribute('href', '#');
  authActionElement.addEventListener('click', async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.replace('/login.html');
  });
}

initializeAuthUi();