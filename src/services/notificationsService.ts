import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type { Notification } from '@/types/models';

/** My in-app notifications, newest first. */
export async function listNotifications(limit = 50): Promise<Notification[]> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const profileId = await getCurrentProfileId();

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('read', false);

  if (error) throw error;
  return count ?? 0;
}

export async function markRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });

  if (error) throw error;
}

/** Deactivate a push token (e.g. on sign out). */
export async function unregisterPushToken(expoPushToken: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ active: false })
    .eq('expo_push_token', expoPushToken);

  if (error) throw error;
}
