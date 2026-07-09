import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Badge, Button, Card, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useCourseDetail, useMyCourseEntries } from '@/hooks/useCourses';
import { copy } from '@/lib/copy';
import { formatFullDate, formatPace, formatSecondsToTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { CourseTimeEntryWithCourse } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

const CHART_HEIGHT = 140;
const CHART_PADDING = 16;

/**
 * Minimal progress line chart: x = run date order, y = time (lower is better,
 * so faster times sit higher). PR point highlighted in lime.
 */
function ProgressChart({ entries, width }: { entries: CourseTimeEntryWithCourse[]; width: number }) {
  const { colors } = useTheme();

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => parseISO(a.run_date).getTime() - parseISO(b.run_date).getTime()
      ),
    [entries]
  );

  if (sorted.length < 2) return null;

  const times = sorted.map((entry) => entry.time_seconds);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);

  const innerWidth = width - CHART_PADDING * 2;
  const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const points = sorted.map((entry, index) => {
    const x = CHART_PADDING + (index / (sorted.length - 1)) * innerWidth;
    // Faster (lower seconds) plots toward the top.
    const y = CHART_PADDING + ((entry.time_seconds - min) / span) * innerHeight;
    return { x, y, isPr: entry.time_seconds === min };
  });

  return (
    <Card style={{ marginTop: spacing.sm }}>
      <Text
        style={{
          color: colors.gray500,
          fontSize: 11,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
        }}
      >
        Progress · lower is better
      </Text>
      <Svg width={width} height={CHART_HEIGHT}>
        <Polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={colors.lime}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={point.isPr ? 6 : 3.5}
            fill={point.isPr ? colors.lime : colors.darkCard}
            stroke={colors.lime}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.gray500, fontSize: 11 }}>
          {formatFullDate(sorted[0].run_date)}
        </Text>
        <Text style={{ color: colors.gray500, fontSize: 11 }}>
          {formatFullDate(sorted[sorted.length - 1].run_date)}
        </Text>
      </View>
    </Card>
  );
}

export default function CourseDetailScreen({
  navigation,
  route,
}: MoreStackScreenProps<'CourseDetail'>) {
  const { colors } = useTheme();

  const { courseId } = route.params;
  const courseQuery = useCourseDetail(courseId);
  const entriesQuery = useMyCourseEntries(courseId);
  const { width } = useWindowDimensions();

  const course = courseQuery.data;
  const entries = entriesQuery.data ?? [];

  const best = entries.length
    ? entries.reduce((acc, entry) => Math.min(acc, entry.time_seconds), Number.POSITIVE_INFINITY)
    : null;

  if (courseQuery.isLoading || entriesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (courseQuery.isError || !course) {
    return (
      <Screen>
        <ErrorState error={courseQuery.error ?? undefined} onRetry={() => courseQuery.refetch()} />
      </Screen>
    );
  }

  const chartWidth = width - spacing.md * 2 - spacing.md * 2; // screen padding + card padding

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
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
          numberOfLines={1}
        >
          {course.name}
        </Text>
      </View>

      <Card>
        <Text style={{ color: colors.lime, fontSize: 26, fontWeight: '900' }}>
          {course.distance_miles} mi
        </Text>
        {course.location_name ? (
          <Text style={{ color: colors.gray300, fontSize: 14, marginTop: 2 }}>
            {course.location_name}
          </Text>
        ) : null}
        {course.description ? (
          <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21, marginTop: spacing.xs }}>
            {course.description}
          </Text>
        ) : null}
      </Card>

      {course.route_image_url ? (
        <Image
          source={{ uri: course.route_image_url }}
          style={{
            width: '100%',
            height: 160,
            borderRadius: radius.lg,
            marginTop: spacing.sm,
            backgroundColor: colors.charcoal,
          }}
        />
      ) : course.latitude != null && course.longitude != null ? (
        <View style={{ borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.sm }}>
          <MapView
            style={{ width: '100%', height: 160 }}
            initialRegion={{
              latitude: course.latitude,
              longitude: course.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            pointerEvents="none"
          >
            <Marker coordinate={{ latitude: course.latitude, longitude: course.longitude }} />
          </MapView>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text
            style={{
              color: colors.gray500,
              fontSize: 10,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            My Best
          </Text>
          <Text style={{ color: colors.lime, fontSize: 24, fontWeight: '900', marginTop: 2 }}>
            {best != null && Number.isFinite(best) ? formatSecondsToTime(best) : '--'}
          </Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text
            style={{
              color: colors.gray500,
              fontSize: 10,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Runs Logged
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 2 }}>
            {entries.length}
          </Text>
        </Card>
      </View>

      <ProgressChart entries={entries} width={chartWidth} />

      {entries.length > 0 ? (
        <Card style={{ marginTop: spacing.sm }}>
          <Text
            style={{
              color: colors.gray500,
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: spacing.xs,
            }}
          >
            Recent Times
          </Text>
          {entries.slice(0, 5).map((entry) => (
            <View
              key={entry.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.xs,
                borderBottomWidth: 1,
                borderBottomColor: colors.charcoal,
              }}
            >
              <Text style={{ color: colors.gray300, fontSize: 13, flex: 1 }}>
                {formatFullDate(entry.run_date)}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>
                {formatSecondsToTime(entry.time_seconds)}
              </Text>
              {entry.time_seconds === best ? (
                <Badge label="PR" tone="lime" style={{ marginLeft: spacing.xs }} />
              ) : null}
              <Text style={{ color: colors.gray500, fontSize: 12, marginLeft: spacing.sm, width: 84, textAlign: 'right' }}>
                {formatPace(entry.time_seconds, course.distance_miles)}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.sm, alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ color: colors.gray500, fontSize: 14, textAlign: 'center' }}>
            No times yet. Run it, log it, chase the PR.
          </Text>
        </Card>
      )}

      <Button
        title={copy.courses.logTime}
        onPress={() => navigation.navigate('TimeEntry', { courseId })}
        style={{ marginTop: spacing.lg }}
      />
      <Button
        title={copy.courses.viewHistory}
        variant="secondary"
        onPress={() => navigation.navigate('CourseHistory', { courseId })}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
