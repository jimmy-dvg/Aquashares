import { supabase } from '../services/supabase-client.js';

async function getSessionData() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Unable to verify authentication session.');
  }

  return data;
}

export async function getCurrentUser() {
  const data = await getSessionData();
  return data.session?.user ?? null;
}

export async function getCurrentUserRole(userId) {
  const user = userId ? { id: userId } : await getCurrentUser();

  if (!user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to load user role.');
  }

  return data?.role ?? null;
}

export async function requireAuth(redirectTo = '/login.html') {
  const data = await getSessionData();

  if (!data.session) {
    window.location.replace(redirectTo);
    return null;
  }

  return data.session;
}

export async function requireAdmin(redirectTo = '/index.html') {
  const session = await requireAuth('/login.html');

  if (!session?.user?.id) {
    return null;
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== 'admin') {
    window.location.replace(redirectTo);
    return null;
  }

  return session;
}