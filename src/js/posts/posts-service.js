import { supabase } from '../services/supabase-client.js';

export async function getFeedPosts(limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
