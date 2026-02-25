import { supabase } from '../services/supabase-client.js';

export function initializeLogout() {
  const logoutButtons = document.querySelectorAll('[data-nav-logout]');

  if (!logoutButtons.length) {
    return;
  }

  logoutButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();

      const { error } = await supabase.auth.signOut();
      if (error) {
        return;
      }

      window.location.assign('/login.html');
    });
  });
}
