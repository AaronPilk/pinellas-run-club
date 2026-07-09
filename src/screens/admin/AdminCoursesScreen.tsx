import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Avatar, Badge, Button, EmptyState, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import {
  useAdminCourses,
  useAdminCreateCourse,
  useAdminDeleteCourse,
  useAdminUpdateCourse,
  useCourseTimes,
  useVerifyTime,
} from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatFullDate, formatSecondsToTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { Course } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

type FormState = {
  name: string;
  distanceMiles: string;
  description: string;
  locationName: string;
  address: string;
  active: boolean;
  featured: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  distanceMiles: '',
  description: '',
  locationName: '',
  address: '',
  active: true,
  featured: false,
};

export default function AdminCoursesScreen({ navigation }: MoreStackScreenProps<'AdminCourses'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'courses' | 'times'>('courses');
  const [unverifiedOnly, setUnverifiedOnly] = useState(true);

  const coursesQuery = useAdminCourses();
  const timesQuery = useCourseTimes(unverifiedOnly ? { verified: false } : undefined);
  const createCourse = useAdminCreateCourse();
  const updateCourse = useAdminUpdateCourse();
  const deleteCourse = useAdminDeleteCourse();
  const verifyTime = useVerifyTime();

  const [editing, setEditing] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      name: course.name,
      distanceMiles: String(course.distance_miles),
      description: course.description ?? '',
      locationName: course.location_name ?? '',
      address: course.address ?? '',
      active: course.active,
      featured: course.featured,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const distance = Number(form.distanceMiles);
    if (form.name.trim().length < 2) {
      Alert.alert('Missing info', 'Give the course a name.');
      return;
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      Alert.alert('Missing info', 'Enter the distance in miles (e.g. 3.1).');
      return;
    }

    const input = {
      name: form.name.trim(),
      distance_miles: distance,
      description: form.description.trim() || null,
      location_name: form.locationName.trim() || null,
      address: form.address.trim() || null,
      active: form.active,
      featured: form.featured,
    };

    try {
      if (editing) {
        await updateCourse.mutateAsync({ courseId: editing.id, input });
      } else {
        await createCourse.mutateAsync(input);
      }
      hapticSuccess();
      setShowForm(false);
    } catch (error) {
      Alert.alert('Save failed', getErrorMessage(error));
    }
  };

  const handleDelete = (course: Course) => {
    Alert.alert('Delete Course', `Remove "${course.name}"? Existing times are kept but hidden.`, [
      { text: copy.actions.cancel, style: 'cancel' },
      {
        text: copy.actions.delete,
        style: 'destructive',
        onPress: () =>
          deleteCourse.mutate(course.id, {
            onSuccess: hapticSuccess,
            onError: (error) => Alert.alert('Delete failed', getErrorMessage(error)),
          }),
      },
    ]);
  };

  const handleVerify = (entryId: string) => {
    verifyTime.mutate(entryId, {
      onSuccess: hapticSuccess,
      onError: (error) => Alert.alert('Verify failed', getErrorMessage(error)),
    });
  };

  const flaggedTimes = (timesQuery.data ?? []).filter((entry) => entry.flagged);
  const regularTimes = (timesQuery.data ?? []).filter((entry) => !entry.flagged);

  return (
    <Screen noPadding>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            Courses & Times
          </Text>
          {tab === 'courses' ? (
            <Pressable
              onPress={() => {
                hapticLight();
                openCreate();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add Course"
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
                Add Course
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
          {(
            [
              { value: 'courses', label: 'Courses' },
              { value: 'times', label: 'Submitted Times' },
            ] as const
          ).map((item) => {
            const selected = tab === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  hapticLight();
                  setTab(item.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.lime : colors.charcoal,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: selected ? colors.black : colors.gray300, fontWeight: '800', fontSize: 13 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'times' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.sm,
            }}
          >
            <Text style={{ color: colors.gray300, fontSize: 13, fontWeight: '600' }}>
              Unverified only
            </Text>
            <Switch
              value={unverifiedOnly}
              onValueChange={setUnverifiedOnly}
              trackColor={{ false: colors.gray700, true: colors.limeDark }}
              thumbColor={colors.white}
            />
          </View>
        ) : null}
      </View>

      {tab === 'courses' ? (
        coursesQuery.isLoading ? (
          <LoadingState />
        ) : coursesQuery.isError ? (
          <ErrorState error={coursesQuery.error} onRetry={() => coursesQuery.refetch()} />
        ) : (coursesQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon="stopwatch-outline"
            title="No courses yet"
            message="Create the first official club course."
            actionLabel="Add Course"
            onAction={openCreate}
          />
        ) : (
          <FlatList
            data={coursesQuery.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.darkCard,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!item.active ? <Badge label="Inactive" tone="warning" /> : null}
                    {item.featured ? <Badge label="Featured" tone="lime" /> : null}
                  </View>
                  <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {item.distance_miles} mi{item.location_name ? ` · ${item.location_name}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    openEdit(item);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                  style={{ marginRight: spacing.sm }}
                >
                  <Ionicons name="create-outline" size={22} color={colors.lime} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            )}
          />
        )
      ) : timesQuery.isLoading ? (
        <LoadingState />
      ) : timesQuery.isError ? (
        <ErrorState error={timesQuery.error} onRetry={() => timesQuery.refetch()} />
      ) : (timesQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="Nothing to review"
          message={unverifiedOnly ? 'All submitted times are verified.' : 'No times submitted yet.'}
        />
      ) : (
        <FlatList
          data={[...flaggedTimes, ...regularTimes]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.darkCard,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.xs,
                borderWidth: item.flagged ? 1 : 0,
                borderColor: colors.danger,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar uri={item.profile.avatar_url} name={item.profile.full_name} size={38} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
                    {item.profile.full_name}
                  </Text>
                  <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                    {item.course.name} · {formatFullDate(item.run_date)}
                  </Text>
                </View>
                <Text style={{ color: colors.lime, fontWeight: '900', fontSize: 18 }}>
                  {formatSecondsToTime(item.time_seconds)}
                </Text>
              </View>

              {item.flagged ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                  <Ionicons name="flag" size={13} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                    Flagged{item.flag_reason ? `: ${item.flag_reason}` : ' for review'}
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                {item.verified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark" size={15} color={colors.lime} />
                    <Text style={{ color: colors.lime, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>
                      Verified
                    </Text>
                  </View>
                ) : (
                  <Button
                    title={copy.admin.verify}
                    noHaptic
                    onPress={() => handleVerify(item.id)}
                    loading={verifyTime.isPending}
                    style={{ height: 38, flex: 1 }}
                  />
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
            <Pressable
              onPress={() => setShowForm(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </Pressable>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: '900',
                textTransform: 'uppercase',
                marginLeft: spacing.xs,
              }}
            >
              {editing ? 'Edit Course' : 'Add Course'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >
            <TextField
              label="Name"
              value={form.name}
              onChangeText={(value) => setField('name', value)}
              placeholder="North Shore 5K Loop"
            />
            <TextField
              label="Distance (miles)"
              value={form.distanceMiles}
              onChangeText={(value) => setField('distanceMiles', value)}
              keyboardType="decimal-pad"
              placeholder="3.1"
            />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChangeText={(value) => setField('description', value)}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <TextField
              label="Location Name (optional)"
              value={form.locationName}
              onChangeText={(value) => setField('locationName', value)}
              placeholder="North Shore Park"
            />
            <TextField
              label="Address (optional)"
              value={form.address}
              onChangeText={(value) => setField('address', value)}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Active</Text>
              <Switch
                value={form.active}
                onValueChange={(value) => setField('active', value)}
                trackColor={{ false: colors.gray700, true: colors.limeDark }}
                thumbColor={colors.white}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Featured</Text>
              <Switch
                value={form.featured}
                onValueChange={(value) => setField('featured', value)}
                trackColor={{ false: colors.gray700, true: colors.limeDark }}
                thumbColor={colors.white}
              />
            </View>

            <Button
              title={copy.actions.save}
              onPress={() => void handleSave()}
              loading={createCourse.isPending || updateCourse.isPending}
            />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
