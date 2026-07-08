import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import { useCourses, useSubmitTime } from '@/hooks/useCourses';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { formatSecondsToTime, parseTimeToSeconds, toDateOnlyString } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function TimeEntryScreen({ navigation, route }: MoreStackScreenProps<'TimeEntry'>) {
  const coursesQuery = useCourses();
  const submitTime = useSubmitTime();

  const [courseId, setCourseId] = useState(route.params.courseId);
  const [runDate, setRunDate] = useState(() => toDateOnlyString(new Date()));
  const [timeText, setTimeText] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ date?: string; time?: string }>({});
  const [result, setResult] = useState<{ seconds: number; isPr: boolean } | null>(null);

  const courses = coursesQuery.data ?? [];
  const selectedCourse = courses.find((course) => course.id === courseId);

  const handleSubmit = async () => {
    const nextErrors: { date?: string; time?: string } = {};

    if (!DATE_PATTERN.test(runDate.trim()) || Number.isNaN(Date.parse(runDate.trim()))) {
      nextErrors.date = 'Use YYYY-MM-DD, like 2026-07-08';
    } else if (Date.parse(runDate.trim()) > Date.now()) {
      nextErrors.date = "Run date can't be in the future";
    }

    let timeSeconds = 0;
    try {
      timeSeconds = parseTimeToSeconds(timeText);
      if (timeSeconds <= 0) nextErrors.time = 'Time must be positive';

      if (selectedCourse && !nextErrors.time) {
        const paceSeconds = timeSeconds / selectedCourse.distance_miles;
        if (paceSeconds < 180) nextErrors.time = 'That pace looks too fast. Double-check your time.';
        if (paceSeconds > 30 * 60) nextErrors.time = 'That pace looks too slow. Double-check your time.';
      }
    } catch (error) {
      nextErrors.time = error instanceof Error ? error.message : 'Enter a valid time';
    }

    if (nextErrors.date || nextErrors.time) {
      setErrors(nextErrors);
      hapticError();
      return;
    }
    setErrors({});

    const previousBest = selectedCourse?.my_best_seconds ?? null;
    const isPr = previousBest == null || timeSeconds < previousBest;

    try {
      await submitTime.mutateAsync({
        courseId,
        runDate: runDate.trim(),
        timeSeconds,
        notes: notes.trim() || undefined,
        eventId: route.params.eventId,
      });
      hapticSuccess();
      setResult({ seconds: timeSeconds, isPr });
    } catch (error) {
      hapticError();
      Alert.alert('Could not save time', getErrorMessage(error));
    }
  };

  if (coursesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (coursesQuery.isError) {
    return (
      <Screen>
        <ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} />
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.lime,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name={result.isPr ? 'trophy' : 'checkmark'} size={48} color={colors.black} />
          </View>
          <Text
            style={{
              color: result.isPr ? colors.lime : colors.white,
              fontSize: 28,
              fontWeight: '900',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {result.isPr ? copy.courses.newPr + '!' : 'Time Logged'}
          </Text>
          <Text style={{ color: colors.white, fontSize: 40, fontWeight: '900', marginTop: spacing.sm }}>
            {formatSecondsToTime(result.seconds)}
          </Text>
          <Text style={{ color: colors.gray300, fontSize: 15, textAlign: 'center', marginTop: spacing.xs }}>
            {selectedCourse ? `${selectedCourse.name} · ${selectedCourse.distance_miles} mi` : ''}
          </Text>
          {result.isPr ? (
            <Text style={{ color: colors.gray300, fontSize: 14, textAlign: 'center', marginTop: spacing.xs }}>
              Fastest you've ever run this course. Keep going.
            </Text>
          ) : null}
          <Button
            title="Done"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>
        <Text
          style={{
            color: colors.white,
            fontSize: 20,
            fontWeight: '900',
            textTransform: 'uppercase',
            marginLeft: spacing.xs,
          }}
        >
          {copy.courses.logTime}
        </Text>
      </View>

      <Text
        style={{
          color: colors.gray300,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
        }}
      >
        Course
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.md }}
      >
        {courses.map((course) => {
          const selected = course.id === courseId;
          return (
            <Pressable
              key={course.id}
              onPress={() => setCourseId(course.id)}
              accessibilityRole="button"
              accessibilityLabel={`Select course ${course.name}`}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: selected ? colors.lime : colors.charcoal,
                borderWidth: 1,
                borderColor: selected ? colors.lime : colors.gray700,
              }}
            >
              <Text style={{ color: selected ? colors.black : colors.white, fontWeight: '800', fontSize: 13 }}>
                {course.name}
              </Text>
              <Text style={{ color: selected ? colors.gray700 : colors.gray500, fontSize: 11, marginTop: 1 }}>
                {course.distance_miles} mi
                {course.my_best_seconds != null
                  ? ` · PR ${formatSecondsToTime(course.my_best_seconds)}`
                  : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextField
        label="Run Date"
        value={runDate}
        onChangeText={setRunDate}
        error={errors.date}
        placeholder="2026-07-08"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label="Time (mm:ss or h:mm:ss)"
        value={timeText}
        onChangeText={setTimeText}
        error={errors.time}
        placeholder="27:45"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
        placeholder="Humid night, negative split…"
      />

      {selectedCourse?.my_best_seconds != null ? (
        <Text style={{ color: colors.gray500, fontSize: 13, marginBottom: spacing.sm }}>
          Your current PR on {selectedCourse.name}: {formatSecondsToTime(selectedCourse.my_best_seconds)}
        </Text>
      ) : null}

      <Button title={copy.actions.save} onPress={() => void handleSubmit()} loading={submitTime.isPending} />
    </Screen>
  );
}
