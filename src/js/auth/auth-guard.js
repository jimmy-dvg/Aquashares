import { supabase } from '../services/supabase-client.js';

export async function requireAuth(redirectTo = '/login.html') {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.replace(redirectTo);
    return null;
  }

  return data.session;
}