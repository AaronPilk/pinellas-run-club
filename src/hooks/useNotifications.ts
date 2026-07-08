import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { getUnreadCount, listNotifications, markRead } from '@/services/notificationsService';
import { registerForPushNotificationsAsync } from '@/services/pushNotifications';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => listNotifications(),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Registers a push token for the given profile (call after approval). */
export function useRegisterPush() {
  return useMutation({
    mutationFn: (profileId: string) => registerForPushNotificationsAsync(profileId),
  });
}
