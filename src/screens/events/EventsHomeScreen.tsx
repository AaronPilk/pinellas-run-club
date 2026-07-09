import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { EventCard } from '@/components/EventCard';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyEvents, usePastEvents, useRsvp, useUpcomingEvents } from '@/hooks/useEvents';
import { copy } from '@/lib/copy';
import { hapticSuccess } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { EventWithRsvp } from '@/types/models';
import type { EventsStackScreenProps } from '@/types/navigation';

type Filter = 'upcoming' | 'mine' | 'past';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'mine', label: 'My Events' },
  { key: 'past', label: 'Past' },
];

/** Event card + one-tap RSVP for upcoming events you haven't answered yet. */
function EventListItem({
  event,
  showQuickRsvp,
  onPress,
}: {
  event: EventWithRsvp;
  showQuickRsvp: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  const rsvp = useRsvp(event.id);

  return (
    <View>
      <EventCard event={event} onPress={onPress} />
      {showQuickRsvp && !event.my_rsvp ? (
        <Pressable
          onPress={() => rsvp.mutate('going', { onSuccess: hapticSuccess })}
          disabled={rsvp.isPending}
          accessibilityRole="button"
          accessibilityLabel={`RSVP I'm in for ${event.title}`}
          style={{
            marginTop: -spacing.xs,
            marginBottom: spacing.md,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.lime,
            borderRadius: radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: rsvp.isPending ? 0.6 : 1,
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.black} />
          <Text style={{ color: colors.black, fontWeight: '800', fontSize: 13 }}>
            {copy.events.imIn}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function EventsHomeScreen({ navigation }: EventsStackScreenProps<'EventsHome'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const upcoming = useUpcomingEvents();
  const mine = useMyEvents();
  const past = usePastEvents();

  const active = filter === 'upcoming' ? upcoming : filter === 'mine' ? mine : past;

  const emptyProps =
    filter === 'upcoming'
      ? { title: 'Nothing on the calendar', message: copy.events.emptyUpcoming }
      : filter === 'mine'
        ? {
            title: 'No RSVPs yet',
            message: "Tap into an upcoming run and hit I'm In.",
          }
        : { title: 'No past events', message: copy.events.emptyPast };

  let body: React.ReactNode;

  if (active.isPending) {
    body = <LoadingState />;
  } else if (active.isError) {
    body = <ErrorState error={active.error} onRetry={() => void active.refetch()} />;
  } else if ((active.data?.length ?? 0) === 0) {
    body = <EmptyState icon="calendar-outline" {...emptyProps} />;
  } else {
    body = (
      <FlatList
        data={active.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventListItem
            event={item}
            showQuickRsvp={filter !== 'past'}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={() => void active.refetch()}
            tintColor={colors.lime}
          />
        }
      />
    );
  }

  return (
    <Screen noPadding>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '900',
            fontSize: 26,
            textTransform: 'uppercase',
          }}
          accessibilityRole="header"
        >
          Events
        </Text>

        {/* Filter tabs */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.sm }}>
          {FILTERS.map((item) => {
            const activeTab = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: activeTab ? colors.lime : colors.charcoal,
                }}
              >
                <Text
                  style={{
                    color: activeTab ? colors.black : colors.gray300,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }}>{body}</View>

      {/* Admin create FAB */}
      {isAdmin ? (
        <Pressable
          onPress={() => navigation.navigate('CreateEditEvent', undefined)}
          accessibilityRole="button"
          accessibilityLabel="Create event"
          style={({ pressed }) => ({
            position: 'absolute',
            right: spacing.md,
            bottom: spacing.lg,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: colors.lime,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          })}
        >
          <Ionicons name="add" size={30} color={colors.black} />
        </Pressable>
      ) : null}
    </Screen>
  );
}
