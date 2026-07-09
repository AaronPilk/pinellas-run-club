import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useEventAttendees } from '@/hooks/useEvents';
import { spacing, useTheme } from '@/theme';
import type { EventAttendee } from '@/types/models';
import type { EventsStackScreenProps } from '@/types/navigation';

function AttendeeRow({ attendee }: { attendee: EventAttendee }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <Avatar uri={attendee.profile.avatar_url} name={attendee.profile.full_name} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
          {attendee.profile.full_name}
        </Text>
        {attendee.profile.username ? (
          <Text style={{ color: colors.gray500, fontSize: 13 }}>@{attendee.profile.username}</Text>
        ) : null}
      </View>
      {attendee.checked_in ? (
        <Badge label="Checked In" tone="success" />
      ) : (
        <Badge
          label={attendee.rsvp.status === 'going' ? "I'm In" : 'Maybe'}
          tone={attendee.rsvp.status === 'going' ? 'lime' : 'neutral'}
        />
      )}
    </View>
  );
}

export default function EventAttendeesScreen({
  navigation,
  route,
}: EventsStackScreenProps<'EventAttendees'>) {
  const { colors } = useTheme();

  const { eventId } = route.params;
  const attendees = useEventAttendees(eventId);

  let body: React.ReactNode;

  if (attendees.isPending) {
    body = <LoadingState />;
  } else if (attendees.isError) {
    body = <ErrorState error={attendees.error} onRetry={() => void attendees.refetch()} />;
  } else if ((attendees.data?.length ?? 0) === 0) {
    body = (
      <EmptyState
        icon="people-outline"
        title="No RSVPs yet"
        message="Be the first to say I'm In."
      />
    );
  } else {
    // Going first, then maybe; checked-in members float to the top of each group.
    const sorted = [...attendees.data!].sort((a, b) => {
      if (a.rsvp.status !== b.rsvp.status) return a.rsvp.status === 'going' ? -1 : 1;
      if (a.checked_in !== b.checked_in) return a.checked_in ? -1 : 1;
      return a.profile.full_name.localeCompare(b.profile.full_name);
    });

    const goingCount = sorted.filter((a) => a.rsvp.status === 'going').length;
    const checkedInCount = sorted.filter((a) => a.checked_in).length;

    body = (
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.rsvp.id}
        renderItem={({ item }) => <AttendeeRow attendee={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={attendees.isRefetching}
            onRefresh={() => void attendees.refetch()}
            tintColor={colors.lime}
          />
        }
        ListHeaderComponent={
          <Text
            style={{
              color: colors.gray500,
              fontSize: 13,
              fontWeight: '600',
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.xs,
            }}
          >
            {goingCount} going · {checkedInCount} checked in
          </Text>
        }
      />
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
          Attendees
        </Text>
      </View>

      <View style={{ flex: 1 }}>{body}</View>
    </SafeAreaView>
  );
}
