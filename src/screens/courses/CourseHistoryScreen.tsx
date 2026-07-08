import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Badge, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useMyCourseEntries } from '@/hooks/useCourses';
import { formatFullDate, formatPace, formatSecondsToTime } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

export default function CourseHistoryScreen({
  navigation,
  route,
}: MoreStackScreenProps<'CourseHistory'>) {
  const courseId = route.params?.courseId;
  const entriesQuery = useMyCourseEntries(courseId);

  const entries = entriesQuery.data ?? [];

  /** Best time per course, so the PR marker is correct in mixed lists too. */
  const bestByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const current = map.get(entry.course_id);
      if (current === undefined || entry.time_seconds < current) {
        map.set(entry.course_id, entry.time_seconds);
      }
    }
    return map;
  }, [entries]);

  const title = courseId && entries[0]?.course ? entries[0].course.name : 'Course History';

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
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text
          style={{
            color: colors.white,
            fontSize: 20,
            fontWeight: '900',
            textTransform: 'uppercase',
            marginLeft: spacing.xs,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {entriesQuery.isLoading ? (
        <LoadingState />
      ) : entriesQuery.isError ? (
        <ErrorState error={entriesQuery.error} onRetry={() => entriesQuery.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="stopwatch-outline"
          title="No times logged"
          message="Run an official course and log your time to start tracking progress."
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const isPr = bestByCourse.get(item.course_id) === item.time_seconds;
            return (
              <View
                style={{
                  backgroundColor: colors.darkCard,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.white, fontWeight: '800', fontSize: 16 }}>
                      {formatSecondsToTime(item.time_seconds)}
                      <Text style={{ color: colors.gray500, fontSize: 13, fontWeight: '600' }}>
                        {'  '}
                        {item.pace_seconds_per_mile != null
                          ? `${formatSecondsToTime(item.pace_seconds_per_mile)} / mi`
                          : formatPace(item.time_seconds, item.course.distance_miles)}
                      </Text>
                    </Text>
                    <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {formatFullDate(item.run_date)}
                      {!courseId ? ` · ${item.course.name}` : ''}
                      {item.event ? ` · ${item.event.title}` : ''}
                    </Text>
                    {item.notes ? (
                      <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {isPr ? <Badge label="PR" tone="lime" /> : null}
                    {item.verified ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="shield-checkmark" size={13} color={colors.lime} />
                        <Text style={{ color: colors.lime, fontSize: 11, fontWeight: '700', marginLeft: 3 }}>
                          Verified
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
