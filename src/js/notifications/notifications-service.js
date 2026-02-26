import { supabase } from '../services/supabase-client.js';

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    referenceType: row.reference_type || 'post',
    referenceId: row.reference_id,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at
  };
}

function throwServiceError(error, fallbackMessage) {
  throw new Error(error?.message || fallbackMessage);
}

function isMissingNotificationsRelation(error) {
  if (!error) {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  return message.includes("could not find the 'notifications' relation in the schema cache")
    || message.includes('relation "public.notifications" does not exist')
    || message.includes('relation "notifications" does not exist');
}

function isMissingReferenceTypeColumn(error) {
  if (!error) {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toUpperCase();

  return code === '42703'
    || message.includes('reference_type')
    || message.includes('column notifications.reference_type does not exist')
    || message.includes('column "reference_type" does not exist');
}

export async function getUserNotifications(limit = 20) {
  let data = null;
  let error = null;

  ({ data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, reference_type, reference_id, message, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit));

  if (error && isMissingReferenceTypeColumn(error)) {
    ({ data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, reference_id, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(limit));
  }

  if (error) {
    if (isMissingNotificationsRelation(error)) {
      return [];
    }
    throwServiceError(error, 'Failed to load notifications.');
  }

  return (data ?? []).map(mapNotification);
}

export async function markAsRead(notificationId) {
  let data = null;
  let error = null;

  ({ data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('is_read', false)
    .select('id, user_id, type, reference_type, reference_id, message, is_read, created_at')
    .maybeSingle());

  if (error && isMissingReferenceTypeColumn(error)) {
    ({ data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('is_read', false)
      .select('id, user_id, type, reference_id, message, is_read, created_at')
      .maybeSingle());
  }

  if (error) {
    if (isMissingNotificationsRelation(error)) {
      return null;
    }
    throwServiceError(error, 'Failed to mark notification as read.');
  }

  return data ? mapNotification(data) : null;
}

export async function markAllAsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) {
    if (isMissingNotificationsRelation(error)) {
      return;
    }
    throwServiceError(error, 'Failed to mark all notifications as read.');
  }
}

export function subscribeToNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      if (typeof onInsert === 'function' && payload?.new) {
        onInsert(mapNotification(payload.new));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
