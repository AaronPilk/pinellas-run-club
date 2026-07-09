import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';
import { hapticLight } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { Notification, NotificationType } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

const TYPE_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  event: 'calendar-outline',
  rsvp: 'checkmark-circle-outline',
  checkin: 'footsteps-outline',
  badge: 'ribbon-outline',
  perk: 'pricetags-outline',
  announcement: 'megaphone-outline',
  system: 'information-circle-outline',
};

export default function NotificationsScreen({ navigation }: MoreStackScreenProps<'Notifications'>) {
  const { colors } = useTheme();

  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();

  const handlePress = (notification: Notification) => {
    hapticLight();
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.deep_link) {
      Linking.openURL(notification.deep_link).catch(() => undefined);
    }
  };

  return (
    <Screen noPadding>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '900',
            textTransform: 'uppercase',
            marginLeft: spacing.xs,
          }}
        >
          Notifications
        </Text>
      </View>

      {notificationsQuery.isLoading ? (
        <LoadingState />
      ) : notificationsQuery.isError ? (
        <ErrorState error={notificationsQuery.error} onRetry={() => notificationsQuery.refetch()} />
      ) : (notificationsQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="All quiet"
          message="Run reminders, badges, and club news land here."
        />
      ) : (
        <FlatList
          data={notificationsQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => ({
                flexDirection: 'row',
                backgroundColor: colors.darkCard,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.xs,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: colors.charcoal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm,
                }}
              >
                <Ionicons
                  name={TYPE_ICONS[item.type] ?? 'notifications-outline'}
                  size={18}
                  color={item.read ? colors.gray500 : colors.lime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: item.read ? '600' : '800',
                    fontSize: 14,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.body ? (
                  <Text
                    style={{ color: colors.gray500, fontSize: 13, marginTop: 2, lineHeight: 18 }}
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>
                ) : null}
                <Text style={{ color: colors.gray700, fontSize: 11, marginTop: 4, fontWeight: '600' }}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>
              {!item.read ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.lime,
                    marginLeft: spacing.xs,
                    marginTop: 4,
                  }}
                />
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
