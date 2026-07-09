import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useEvent, useRsvp } from '@/hooks/useEvents';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { formatEventDateTime, formatEventTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { EventDetail, RsvpStatus } from '@/types/models';
import type { AppTabsParamList, EventsStackScreenProps } from '@/types/navigation';

const RSVP_OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: 'going', label: copy.events.imIn },
  { status: 'maybe', label: copy.events.maybe },
  { status: 'not_going', label: copy.events.cantMakeIt },
];

function isCheckinOpen(event: EventDetail): boolean {
  const now = Date.now();
  const opens = event.checkin_opens_at
    ? new Date(event.checkin_opens_at).getTime()
    : new Date(event.starts_at).getTime() - 60 * 60 * 1000;
  const closes = event.checkin_closes_at
    ? new Date(event.checkin_closes_at).getTime()
    : new Date(event.ends_at ?? event.starts_at).getTime() + 2 * 60 * 60 * 1000;
  return now >= opens && now <= closes;
}

export default function EventDetailScreen({
  navigation,
  route,
}: EventsStackScreenProps<'EventDetail'>) {
  const { colors } = useTheme();

  const { eventId } = route.params;
  const { isAdmin } = useAuth();
  const event = useEvent(eventId);
  const rsvp = useRsvp(eventId);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<RsvpStatus | null>(null);

  const handleRsvp = (status: RsvpStatus) => {
    if (rsvp.isPending) return;
    setRsvpError(null);
    setPendingStatus(status);
    rsvp.mutate(status, {
      onSuccess: () => hapticSuccess(),
      onError: (err) => {
        hapticError();
        setRsvpError(getErrorMessage(err));
      },
      onSettled: () => setPendingStatus(null),
    });
  };

  const handleShare = (data: EventDetail) => {
    void Share.share({
      message: `${data.title} — ${formatEventDateTime(data.starts_at)}${
        data.location_name ? ` at ${data.location_name}` : ''
      }. Run with us. ${copy.brand.together}`,
    });
  };

  let body: React.ReactNode;

  if (event.isPending) {
    body = <LoadingState />;
  } else if (event.isError) {
    body = <ErrorState error={event.error} onRetry={() => void event.refetch()} />;
  } else {
    const data = event.data;
    const attendees = data.attendees.filter((a) => a.rsvp.status === 'going');
    const checkinOpen = isCheckinOpen(data);

    body = (
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {data.image_url ? (
          <Image
            source={{ uri: data.image_url }}
            style={{ width: '100%', height: 220, backgroundColor: colors.charcoal }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 180,
              backgroundColor: colors.charcoal,
              justifyContent: 'flex-end',
              padding: spacing.md,
            }}
          >
            <Text
              style={{
                color: colors.lime,
                fontWeight: '900',
                fontSize: 34,
                textTransform: 'uppercase',
                letterSpacing: -0.5,
              }}
            >
              Run Club
            </Text>
          </View>
        )}

        <View style={{ padding: spacing.md }}>
          {/* Title + badges */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs }}>
            <Badge label={data.event_type.replace(/_/g, ' ')} tone="neutral" />
            {data.featured ? <Badge label="Featured" tone="warning" /> : null}
            {data.checked_in ? <Badge label="Checked In" tone="success" /> : null}
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 28,
              textTransform: 'uppercase',
            }}
            accessibilityRole="header"
          >
            {data.title}
          </Text>

          {/* When / where */}
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="calendar-outline" size={18} color={colors.lime} />
              <Text style={{ color: colors.gray100, fontWeight: '700', fontSize: 15 }}>
                {formatEventDateTime(data.starts_at)}
                {data.ends_at ? ` – ${formatEventTime(data.ends_at)}` : ''}
              </Text>
            </View>
            {data.location_name || data.address ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <Ionicons name="location-outline" size={18} color={colors.lime} />
                <View style={{ flex: 1 }}>
                  {data.location_name ? (
                    <Text style={{ color: colors.gray100, fontWeight: '700', fontSize: 15 }}>
                      {data.location_name}
                    </Text>
                  ) : null}
                  {data.address ? (
                    <Text style={{ color: colors.gray500, fontSize: 13 }}>{data.address}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {data.distance_miles ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="footsteps-outline" size={18} color={colors.lime} />
                <Text style={{ color: colors.gray100, fontWeight: '700', fontSize: 15 }}>
                  {data.distance_miles} miles
                  {data.course ? ` · ${data.course.name}` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Map preview */}
          {data.latitude != null && data.longitude != null ? (
            <View
              style={{
                borderRadius: radius.lg,
                overflow: 'hidden',
                marginTop: spacing.md,
                height: 150,
              }}
              pointerEvents="none"
            >
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: data.latitude,
                  longitude: data.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker coordinate={{ latitude: data.latitude, longitude: data.longitude }} />
              </MapView>
            </View>
          ) : null}

          {/* RSVP */}
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 18,
              textTransform: 'uppercase',
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            {copy.events.areYouComing}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {RSVP_OPTIONS.map((option) => {
              const selected = data.my_rsvp === option.status;
              const isLoading = pendingStatus === option.status && rsvp.isPending;
              return (
                <Pressable
                  key={option.status}
                  onPress={() => handleRsvp(option.status)}
                  disabled={rsvp.isPending}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: selected ? colors.lime : colors.charcoal,
                    borderWidth: 1,
                    borderColor: selected ? colors.lime : colors.gray700,
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.black : colors.gray300,
                      fontWeight: '800',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {rsvpError ? (
            <Text style={{ color: colors.danger, fontSize: 13, marginTop: spacing.xs }}>
              {rsvpError}
            </Text>
          ) : null}

          {/* Check in */}
          {checkinOpen && !data.checked_in ? (
            <Button
              title={copy.checkin.checkIn}
              onPress={() =>
                navigation
                  .getParent<BottomTabNavigationProp<AppTabsParamList>>()
                  ?.navigate('CheckInTab', { screen: 'CheckInHome' })
              }
              style={{ marginTop: spacing.md }}
            />
          ) : null}

          {/* Description */}
          {data.description ? (
            <Text
              style={{
                color: colors.gray100,
                fontSize: 15,
                lineHeight: 23,
                marginTop: spacing.lg,
              }}
            >
              {data.description}
            </Text>
          ) : null}

          {/* Attendees */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: '900',
                fontSize: 18,
                textTransform: 'uppercase',
              }}
            >
              Who&apos;s in ({data.going_count})
            </Text>
            {data.attendees.length > 0 ? (
              <Pressable
                onPress={() => navigation.navigate('EventAttendees', { eventId })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all attendees"
              >
                <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 13 }}>See all</Text>
              </Pressable>
            ) : null}
          </View>
          {attendees.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate('EventAttendees', { eventId })}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="View attendees"
            >
              {attendees.slice(0, 8).map((attendee, index) => (
                <View key={attendee.rsvp.id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                  <Avatar
                    uri={attendee.profile.avatar_url}
                    name={attendee.profile.full_name}
                    size={40}
                  />
                </View>
              ))}
              {attendees.length > 8 ? (
                <View
                  style={{
                    marginLeft: -10,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.charcoal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.lime, fontWeight: '800', fontSize: 12 }}>
                    +{attendees.length - 8}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <Text style={{ color: colors.gray500, fontSize: 14 }}>
              No one&apos;s in yet. Set the pace.
            </Text>
          )}

          {/* Secondary actions */}
          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Pressable
              onPress={() => handleShare(data)}
              accessibilityRole="button"
              accessibilityLabel="Share event"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Ionicons name="share-outline" size={20} color={colors.lime} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
                Share event
              </Text>
            </Pressable>
            {/* TODO: add-to-calendar via expo-calendar once the dependency is added. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="calendar-number-outline" size={20} color={colors.gray500} />
              <Text style={{ color: colors.gray500, fontWeight: '700', fontSize: 15 }}>
                Add to calendar (coming soon)
              </Text>
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => navigation.navigate('CreateEditEvent', { eventId })}
                accessibilityRole="button"
                accessibilityLabel="Edit event"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Ionicons name="create-outline" size={20} color={colors.warning} />
                <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 15 }}>
                  Edit event (admin)
                </Text>
              </Pressable>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '900',
            fontSize: 17,
            textTransform: 'uppercase',
          }}
        >
          Event
        </Text>
      </View>

      <View style={{ flex: 1 }}>{body}</View>
    </SafeAreaView>
  );
}
