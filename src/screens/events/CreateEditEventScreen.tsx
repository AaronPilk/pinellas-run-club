import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, LoadingState, TextField } from '@/components/ui';
import { useAdminCreateEvent, useAdminUpdateEvent } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { uploadEventImage, type AdminEventInput } from '@/services/adminService';
import { pickImage } from '@/services/mediaService';
import { colors, radius, spacing } from '@/theme';
import type { CheckinMethod, EventType } from '@/types/models';
import type { EventsStackScreenProps } from '@/types/navigation';

const EVENT_TYPES: EventType[] = [
  'weekly_run',
  'social_run',
  'race',
  'challenge',
  'after_party',
  'sponsor_event',
  'volunteer',
  'other',
];

const CHECKIN_METHODS: { key: CheckinMethod; label: string }[] = [
  { key: 'gps', label: 'GPS' },
  { key: 'qr', label: 'QR' },
  { key: 'gps_or_qr', label: 'GPS or QR' },
  { key: 'admin_manual', label: 'Manual' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Combine YYYY-MM-DD + HH:mm (device-local) into an ISO string. */
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: T[];
  value: T;
  onChange: (next: T) => void;
  labelOf?: (option: T) => string;
}) {
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}
    >
      {options.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.lime : colors.charcoal,
              borderWidth: 1,
              borderColor: active ? colors.lime : colors.gray700,
            }}
          >
            <Text
              style={{
                color: active ? colors.black : colors.gray300,
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              {labelOf ? labelOf(option) : option.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
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
      {children}
    </Text>
  );
}

export default function CreateEditEventScreen({
  navigation,
  route,
}: EventsStackScreenProps<'CreateEditEvent'>) {
  const eventId = route.params?.eventId;
  const isEdit = Boolean(eventId);
  const { isAdmin, profile } = useAuth();

  const existing = useEvent(eventId ?? '');
  const createEvent = useAdminCreateEvent();
  const updateEvent = useAdminUpdateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [eventType, setEventType] = useState<EventType>('weekly_run');
  const [checkinMethod, setCheckinMethod] = useState<CheckinMethod>('gps');
  const [checkinOpens, setCheckinOpens] = useState('');
  const [checkinCloses, setCheckinCloses] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('');
  const [featured, setFeatured] = useState(false);
  const [publish, setPublish] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  const [prefilled, setPrefilled] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill once when editing.
  useEffect(() => {
    if (!isEdit || prefilled || !existing.data) return;
    const e = existing.data;
    setTitle(e.title);
    setDescription(e.description ?? '');
    setDate(e.event_date);
    setStartTime(format(parseISO(e.starts_at), 'HH:mm'));
    setEndTime(e.ends_at ? format(parseISO(e.ends_at), 'HH:mm') : '');
    setLocationName(e.location_name ?? '');
    setAddress(e.address ?? '');
    setLatitude(e.latitude != null ? String(e.latitude) : '');
    setLongitude(e.longitude != null ? String(e.longitude) : '');
    setEventType(e.event_type);
    setCheckinMethod(e.checkin_method);
    setCheckinOpens(e.checkin_opens_at ? format(parseISO(e.checkin_opens_at), 'HH:mm') : '');
    setCheckinCloses(e.checkin_closes_at ? format(parseISO(e.checkin_closes_at), 'HH:mm') : '');
    setRadiusMeters(e.checkin_radius_meters != null ? String(e.checkin_radius_meters) : '');
    setFeatured(e.featured);
    setPublish(e.status === 'published');
    setImageUrl(e.image_url);
    setPrefilled(true);
  }, [isEdit, prefilled, existing.data]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Admins only"
          message="You need organizer access to manage events."
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (isEdit && (existing.isPending || !prefilled) && !existing.isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isEdit && existing.isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load event"
          message={getErrorMessage(existing.error)}
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const handlePickImage = async () => {
    try {
      const uri = await pickImage({ allowsEditing: true, aspect: [16, 9] });
      if (uri) setLocalImageUri(uri);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = 'Give the event a title';
    if (!DATE_RE.test(date.trim())) next.date = 'Use YYYY-MM-DD';
    if (!TIME_RE.test(startTime.trim())) next.startTime = 'Use 24h HH:mm, like 18:30';
    if (endTime.trim() && !TIME_RE.test(endTime.trim())) next.endTime = 'Use 24h HH:mm';
    if (checkinOpens.trim() && !TIME_RE.test(checkinOpens.trim())) next.checkinOpens = 'Use 24h HH:mm';
    if (checkinCloses.trim() && !TIME_RE.test(checkinCloses.trim())) next.checkinCloses = 'Use 24h HH:mm';
    if (latitude.trim() && Number.isNaN(Number(latitude))) next.latitude = 'Numbers only';
    if (longitude.trim() && Number.isNaN(Number(longitude))) next.longitude = 'Numbers only';
    if (radiusMeters.trim() && (!Number.isInteger(Number(radiusMeters)) || Number(radiusMeters) <= 0)) {
      next.radiusMeters = 'Whole meters, like 150';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate() || saving) return;
    if (!profile) {
      setSubmitError('Your profile has not loaded yet. Try again.');
      return;
    }

    const d = date.trim();
    const input: AdminEventInput & { title: string; event_date: string; starts_at: string } = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      status: publish ? 'published' : 'draft',
      event_date: d,
      starts_at: toIso(d, startTime.trim()),
      ends_at: endTime.trim() ? toIso(d, endTime.trim()) : null,
      location_name: locationName.trim() || null,
      address: address.trim() || null,
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      featured,
      checkin_method: checkinMethod,
      checkin_radius_meters: radiusMeters.trim() ? Number(radiusMeters) : null,
      checkin_opens_at: checkinOpens.trim() ? toIso(d, checkinOpens.trim()) : null,
      checkin_closes_at: checkinCloses.trim() ? toIso(d, checkinCloses.trim()) : null,
    };

    setSaving(true);
    try {
      if (isEdit && eventId) {
        let nextImageUrl = imageUrl;
        if (localImageUri) nextImageUrl = await uploadEventImage(localImageUri, eventId);
        await updateEvent.mutateAsync({
          eventId,
          input: { ...input, image_url: nextImageUrl },
        });
      } else {
        const created = await createEvent.mutateAsync({
          input,
          createdByProfileId: profile.id,
        });
        if (localImageUri) {
          const url = await uploadEventImage(localImageUri, created.id);
          await updateEvent.mutateAsync({ eventId: created.id, input: { image_url: url } });
        }
      }
      hapticSuccess();
      navigation.goBack();
    } catch (err) {
      hapticError();
      setSubmitError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const previewUri = localImageUri ?? imageUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
          <Text
            style={{
              color: colors.white,
              fontWeight: '900',
              fontSize: 17,
              textTransform: 'uppercase',
            }}
          >
            {isEdit ? 'Edit Event' : 'Create Event'}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Tuesday Night Run"
            error={errors.title}
          />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="What should members expect?"
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />

          <FieldLabel>Event type</FieldLabel>
          <ChipRow options={EVENT_TYPES} value={eventType} onChange={setEventType} />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextField
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-15"
              autoCapitalize="none"
              containerStyle={{ flex: 1 }}
              error={errors.date}
            />
            <TextField
              label="Start (24h)"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="18:30"
              containerStyle={{ flex: 1 }}
              error={errors.startTime}
            />
            <TextField
              label="End (24h)"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="20:00"
              containerStyle={{ flex: 1 }}
              error={errors.endTime}
            />
          </View>

          <TextField
            label="Location name"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="North Shore Park"
          />
          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="901 N Shore Dr NE, St. Petersburg"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextField
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="27.7842"
              keyboardType="numbers-and-punctuation"
              containerStyle={{ flex: 1 }}
              error={errors.latitude}
            />
            <TextField
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="-82.6265"
              keyboardType="numbers-and-punctuation"
              containerStyle={{ flex: 1 }}
              error={errors.longitude}
            />
          </View>

          {/* Cover image */}
          <FieldLabel>Cover image</FieldLabel>
          <Pressable
            onPress={handlePickImage}
            accessibilityRole="button"
            accessibilityLabel="Pick cover image"
            style={{
              height: 140,
              borderRadius: radius.lg,
              overflow: 'hidden',
              backgroundColor: colors.charcoal,
              borderWidth: previewUri ? 0 : 1,
              borderStyle: 'dashed',
              borderColor: colors.gray700,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <>
                <Ionicons name="image-outline" size={28} color={colors.lime} />
                <Text style={{ color: colors.gray500, fontSize: 13, marginTop: 4 }}>
                  Tap to add a cover image
                </Text>
              </>
            )}
          </Pressable>

          {/* Check-in */}
          <FieldLabel>Check-in method</FieldLabel>
          <ChipRow
            options={CHECKIN_METHODS.map((m) => m.key)}
            value={checkinMethod}
            onChange={setCheckinMethod}
            labelOf={(key) => CHECKIN_METHODS.find((m) => m.key === key)?.label ?? key}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextField
              label="Check-in opens"
              value={checkinOpens}
              onChangeText={setCheckinOpens}
              placeholder="18:00"
              containerStyle={{ flex: 1 }}
              error={errors.checkinOpens}
            />
            <TextField
              label="Closes"
              value={checkinCloses}
              onChangeText={setCheckinCloses}
              placeholder="19:30"
              containerStyle={{ flex: 1 }}
              error={errors.checkinCloses}
            />
            <TextField
              label="Radius (m)"
              value={radiusMeters}
              onChangeText={setRadiusMeters}
              placeholder="150"
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
              error={errors.radiusMeters}
            />
          </View>

          {/* Toggles */}
          <View
            style={{
              backgroundColor: colors.darkCard,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: '600', fontSize: 15 }}>Featured</Text>
              <Switch
                value={featured}
                onValueChange={setFeatured}
                trackColor={{ true: colors.limeDark, false: colors.gray700 }}
                thumbColor={colors.white}
                accessibilityLabel="Featured event"
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.charcoal,
              }}
            >
              <View>
                <Text style={{ color: colors.white, fontWeight: '600', fontSize: 15 }}>
                  {publish ? 'Published' : 'Draft'}
                </Text>
                <Text style={{ color: colors.gray500, fontSize: 12 }}>
                  {publish ? 'Members can see and RSVP.' : 'Only admins can see this event.'}
                </Text>
              </View>
              <Switch
                value={publish}
                onValueChange={setPublish}
                trackColor={{ true: colors.limeDark, false: colors.gray700 }}
                thumbColor={colors.white}
                accessibilityLabel="Publish event"
              />
            </View>
          </View>

          {submitError ? (
            <Text style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
              {submitError}
            </Text>
          ) : null}

          <Button
            title={isEdit ? 'Save Changes' : publish ? 'Publish Event' : 'Save Draft'}
            onPress={handleSave}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
