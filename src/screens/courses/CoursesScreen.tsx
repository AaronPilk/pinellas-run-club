import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Badge, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useCourses } from '@/hooks/useCourses';
import { copy } from '@/lib/copy';
import { formatSecondsToTime } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { CourseWithBestTime } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

function TimeStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: colors.gray500,
          fontSize: 10,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function isNewPr(course: CourseWithBestTime): boolean {
  return (
    course.my_entry_count > 1 &&
    course.my_last_seconds != null &&
    course.my_best_seconds != null &&
    course.my_last_seconds <= course.my_best_seconds
  );
}

export default function CoursesScreen({ navigation }: MoreStackScreenProps<'Courses'>) {
  const coursesQuery = useCourses();

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
        <View style={{ marginLeft: spacing.xs }}>
          <Text
            style={{
              color: colors.white,
              fontSize: 20,
              fontWeight: '900',
              textTransform: 'uppercase',
            }}
          >
            Courses
          </Text>
          <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '600' }}>
            Official club routes. Chase the PR.
          </Text>
        </View>
      </View>

      {coursesQuery.isLoading ? (
        <LoadingState />
      ) : coursesQuery.isError ? (
        <ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} />
      ) : (coursesQuery.data ?? []).length === 0 ? (
        <EmptyState icon="stopwatch-outline" title="No courses yet" message={copy.courses.empty} />
      ) : (
        <FlatList
          data={coursesQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`Course ${item.name}`}
              style={({ pressed }) => ({
                backgroundColor: colors.darkCard,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.gray500, fontSize: 13, marginTop: 2 }}>
                    {item.distance_miles} mi
                    {item.location_name ? ` · ${item.location_name}` : ''}
                  </Text>
                </View>
                {isNewPr(item) ? <Badge label={copy.courses.newPr} tone="lime" /> : null}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  marginTop: spacing.md,
                  backgroundColor: colors.charcoal,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                }}
              >
                <TimeStat
                  label="Best"
                  value={item.my_best_seconds != null ? formatSecondsToTime(item.my_best_seconds) : '--'}
                />
                <TimeStat
                  label="Last"
                  value={item.my_last_seconds != null ? formatSecondsToTime(item.my_last_seconds) : '--'}
                />
                <TimeStat label="Runs" value={String(item.my_entry_count)} />
              </View>

              <Button
                title={copy.courses.logTime}
                variant="secondary"
                noHaptic
                onPress={() => navigation.navigate('TimeEntry', { courseId: item.id })}
                style={{ marginTop: spacing.sm, height: 44 }}
              />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
