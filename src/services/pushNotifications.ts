import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Ask for push permission, register the Expo push token for this member.
 * Returns the token, or null when unavailable (simulator, denied, etc.).
 */
export async function registerForPushNotificationsAsync(profileId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#B6FF00',
    });
  }

  const { error } = await supabase.from('push_tokens').upsert(
    {
      profile_id: profileId,
      expo_push_token: token,
      platform: Platform.OS,
      active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,expo_push_token' }
  );

  if (error) throw error;
  return token;
}

/**
 * Pull a deep link out of a tapped notification. Push payloads should include
 * `data.deep_link` (e.g. "prc://event/123"); notification rows mirror this.
 */
export function getDeepLinkFromResponse(
  response: Notifications.NotificationResponse
): string | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const deepLink = data?.deep_link ?? data?.deepLink ?? data?.url;
  return typeof deepLink === 'string' && deepLink.length > 0 ? deepLink : null;
}

/**
 * Listen for notification taps and route via the app's linking config.
 * Call once (e.g. in AppProviders); returns an unsubscribe function.
 */
export function addNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const deepLink = getDeepLinkFromResponse(response);
    if (deepLink) {
      Linking.openURL(deepLink).catch(() => undefined);
    }
  });

  return () => subscription.remove();
}
