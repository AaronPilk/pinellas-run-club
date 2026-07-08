import React from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';

import { formatDayOfMonth, formatEventTime, formatMonthShort } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { EventWithRsvp } from '@/types/models';

import { Badge } from './ui/Badge';

type Props = {
  event: EventWithRsvp;
  onPress: () => void;
};

export function EventCard({ event, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={({ pressed }) => ({
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: spacing.md,
        backgroundColor: colors.darkCard,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <ImageBackground
        source={event.image_url ? { uri: event.image_url } : undefined}
        style={{ minHeight: 210, justifyContent: 'flex-end' }}
        imageStyle={{ opacity: 0.65 }}
      >
        <View style={{ padding: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.black,
                padding: 10,
                borderRadius: radius.md,
                marginBottom: spacing.sm,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 18 }}>
                {formatMonthShort(event.starts_at)}
              </Text>
              <Text style={{ color: colors.white, fontWeight: '900', fontSize: 24 }}>
                {formatDayOfMonth(event.starts_at)}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {event.my_rsvp === 'going' ? <Badge label="I'm In" tone="lime" /> : null}
              {event.checked_in ? <Badge label="Checked In" tone="success" /> : null}
              {event.featured ? <Badge label="Featured" tone="warning" /> : null}
            </View>
          </View>

          <Text
            style={{
              color: colors.white,
              fontWeight: '900',
              fontSize: 24,
              textTransform: 'uppercase',
            }}
            numberOfLines={2}
          >
            {event.title}
          </Text>

          <Text style={{ color: colors.white, marginTop: 6, fontWeight: '600' }} numberOfLines={1}>
            {event.location_name ?? 'Location TBD'} • {formatEventTime(event.starts_at)}
          </Text>

          {event.going_count > 0 ? (
            <Text style={{ color: colors.gray300, marginTop: 4, fontWeight: '600', fontSize: 13 }}>
              {event.going_count} going
            </Text>
          ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}
