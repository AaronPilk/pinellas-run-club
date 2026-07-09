import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Badge, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAdminUpdateEvent } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { usePastEvents, useUpcomingEvents } from '@/hooks/useEvents';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatEventDateTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { EventStatus, EventWithRsvp } from '@/types/models';
import type { AppTabsParamList, MoreStackScreenProps } from '@/types/navigation';

const STATUS_TONES: Record<EventStatus, 'lime' | 'neutral' | 'warning' | 'danger' | 'success'> = {
  published: 'success',
  draft: 'warning',
  cancelled: 'danger',
  completed: 'neutral',
};

export default function AdminEventsScreen({ navigation }: MoreStackScreenProps<'AdminEvents'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const upcomingQuery = useUpcomingEvents();
  const pastQuery = usePastEvents();
  const updateEvent = useAdminUpdateEvent();

  const [qrEvent, setQrEvent] = useState<EventWithRsvp | null>(null);

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  const events = useMemo(
    () => [...(upcomingQuery.data ?? []), ...(pastQuery.data ?? [])],
    [upcomingQuery.data, pastQuery.data]
  );

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const openEditor = (eventId?: string) => {
    hapticLight();
    tabNav?.navigate('EventsTab', {
      screen: 'CreateEditEvent',
      params: eventId ? { eventId } : undefined,
    });
  };

  const cancelEvent = (event: EventWithRsvp) => {
    Alert.alert('Cancel Event', `Cancel "${event.title}"? Members with RSVPs will see it as cancelled.`, [
      { text: 'Keep Event', style: 'cancel' },
      {
        text: 'Cancel Event',
        style: 'destructive',
        onPress: () =>
          updateEvent.mutate(
            { eventId: event.id, input: { status: 'cancelled' } },
            {
              onSuccess: hapticSuccess,
              onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
            }
          ),
      },
    ]);
  };

  const eventActions = (event: EventWithRsvp) => {
    hapticLight();
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Edit', onPress: () => openEditor(event.id) },
    ];

    if (event.qr_checkin_nonce) {
      buttons.push({ text: 'Show Check-In QR', onPress: () => setQrEvent(event) });
    }

    if (event.status === 'published') {
      buttons.push({ text: 'Cancel Event', style: 'destructive', onPress: () => cancelEvent(event) });
    }
    if (event.status === 'draft') {
      buttons.push({
        text: 'Publish',
        onPress: () =>
          updateEvent.mutate(
            { eventId: event.id, input: { status: 'published' } },
            {
              onSuccess: hapticSuccess,
              onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
            }
          ),
      });
    }

    buttons.push({ text: 'Close', style: 'cancel' });
    Alert.alert(event.title, formatEventDateTime(event.starts_at), buttons);
  };

  const isLoading = upcomingQuery.isLoading || pastQuery.isLoading;

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
            flex: 1,
          }}
        >
          Events
        </Text>
        <Pressable
          onPress={() => openEditor()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Create Event"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.lime,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="add" size={16} color={colors.black} />
          <Text style={{ color: colors.black, fontWeight: '900', fontSize: 13, marginLeft: 2 }}>
            Create Event
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : upcomingQuery.isError ? (
        <ErrorState error={upcomingQuery.error} onRetry={() => upcomingQuery.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No events yet"
          message="Create the first run and get it on the calendar."
          actionLabel="Create Event"
          onAction={() => openEditor()}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => eventActions(item)}
              accessibilityRole="button"
              accessibilityLabel={`Event ${item.title}`}
              style={({ pressed }) => ({
                backgroundColor: colors.darkCard,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.xs,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {formatEventDateTime(item.starts_at)}
                    {item.location_name ? ` · ${item.location_name}` : ''}
                  </Text>
                  <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }}>
                    {item.going_count} going · {item.checkin_count} checked in
                  </Text>
                </View>
                <Badge label={item.status} tone={STATUS_TONES[item.status]} />
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={qrEvent != null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrEvent(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.darkCard,
              borderRadius: radius.xl,
              padding: spacing.lg,
              alignItems: 'center',
              alignSelf: 'stretch',
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: '900',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {qrEvent?.title}
            </Text>
            <Text style={{ color: colors.gray500, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Members scan this to check in on site.
            </Text>
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: radius.md,
                padding: spacing.md,
                marginTop: spacing.md,
              }}
            >
              {qrEvent?.qr_checkin_nonce ? (
                <QRCode
                  value={`prc-checkin:${qrEvent.id}:${qrEvent.qr_checkin_nonce}`}
                  size={220}
                  backgroundColor={colors.white}
                  color={colors.black}
                />
              ) : null}
            </View>
            <Button title="Close" variant="secondary" onPress={() => setQrEvent(null)} style={{ marginTop: spacing.md, alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
