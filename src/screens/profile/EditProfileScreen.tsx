import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import { Avatar, Button, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile, useUpdateMyProfile, useUploadAvatar } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { profileEditSchema } from '@/lib/validation';
import { pickImage } from '@/services/mediaService';
import { colors, radius, spacing } from '@/theme';
import type { ProfileStackScreenProps } from '@/types/navigation';

const INTEREST_OPTIONS = [
  '5K',
  '10K',
  'Half Marathon',
  'Marathon',
  'Trail Runs',
  'Track',
  'Sunrise Runs',
  'Beach Runs',
  'Social Runs',
  'Race Training',
];

const NOTIFICATION_PREFS = [
  { key: 'notification_events', label: 'Events & runs' },
  { key: 'notification_perks', label: 'Partner perks' },
  { key: 'notification_social', label: 'Social activity' },
  { key: 'notification_badges', label: 'Badges & streaks' },
] as const;

export default function EditProfileScreen({ navigation }: ProfileStackScreenProps<'EditProfile'>) {
  const { refetchProfile } = useAuth();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const uploadAvatar = useUploadAvatar();

  const profile = profileQuery.data;

  const [form, setForm] = useState(() => ({
    fullName: profile?.full_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    phone: profile?.phone ?? '',
    instagramHandle: profile?.instagram_handle ?? '',
    favoriteRunSpot: profile?.favorite_run_spot ?? '',
    runningLevel: profile?.running_level ?? '',
    typicalPace: profile?.typical_pace ?? '',
    favoriteDistance: profile?.favorite_distance ?? '',
  }));
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [notifications, setNotifications] = useState(() => ({
    notification_events: profile?.notification_events ?? true,
    notification_perks: profile?.notification_perks ?? true,
    notification_social: profile?.notification_social ?? true,
    notification_badges: profile?.notification_badges ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(Boolean(profile));

  // The profile can resolve after first render; hydrate the form once it does.
  useEffect(() => {
    if (!profile || hydrated) return;
    setForm({
      fullName: profile.full_name,
      username: profile.username ?? '',
      bio: profile.bio ?? '',
      phone: profile.phone ?? '',
      instagramHandle: profile.instagram_handle ?? '',
      favoriteRunSpot: profile.favorite_run_spot ?? '',
      runningLevel: profile.running_level ?? '',
      typicalPace: profile.typical_pace ?? '',
      favoriteDistance: profile.favorite_distance ?? '',
    });
    setInterests(profile.interests ?? []);
    setNotifications({
      notification_events: profile.notification_events,
      notification_perks: profile.notification_perks,
      notification_social: profile.notification_social,
      notification_badges: profile.notification_badges,
    });
    setHydrated(true);
  }, [profile, hydrated]);

  if (profileQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Screen>
        <ErrorState error={profileQuery.error ?? undefined} onRetry={() => profileQuery.refetch()} />
      </Screen>
    );
  }

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInterest = (interest: string) => {
    hapticLight();
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  const handleChangeAvatar = async () => {
    try {
      const uri = await pickImage({ allowsEditing: true, aspect: [1, 1] });
      if (!uri) return;
      await uploadAvatar.mutateAsync(uri);
      hapticSuccess();
    } catch (error) {
      Alert.alert('Upload failed', getErrorMessage(error));
    }
  };

  const handleSave = async () => {
    const parsed = profileEditSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    try {
      await updateProfile.mutateAsync({
        full_name: parsed.data.fullName.trim(),
        username: parsed.data.username?.trim() || null,
        bio: parsed.data.bio?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        instagram_handle: parsed.data.instagramHandle?.trim().replace(/^@/, '') || null,
        favorite_run_spot: parsed.data.favoriteRunSpot?.trim() || null,
        running_level: parsed.data.runningLevel?.trim() || null,
        typical_pace: parsed.data.typicalPace?.trim() || null,
        favorite_distance: parsed.data.favoriteDistance?.trim() || null,
        interests,
        ...notifications,
      });
      await refetchProfile();
      hapticSuccess();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', getErrorMessage(error));
    }
  };

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
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
          }}
        >
          Edit Profile
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={96} />
        <Pressable
          onPress={() => void handleChangeAvatar()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          style={{ marginTop: spacing.xs }}
        >
          <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 14 }}>
            {uploadAvatar.isPending ? 'Uploading…' : 'Change Photo'}
          </Text>
        </Pressable>
      </View>

      <TextField
        label="Full Name"
        value={form.fullName}
        onChangeText={(value) => setField('fullName', value)}
        error={errors.fullName}
        autoCapitalize="words"
      />
      <TextField
        label="Username"
        value={form.username}
        onChangeText={(value) => setField('username', value.toLowerCase())}
        error={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="runner_ray"
      />
      <TextField
        label="Bio"
        value={form.bio}
        onChangeText={(value) => setField('bio', value)}
        error={errors.bio}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
        placeholder="Tell the club a little about you"
      />
      <TextField
        label="Phone"
        value={form.phone}
        onChangeText={(value) => setField('phone', value)}
        keyboardType="phone-pad"
        placeholder="(727) 555-0100"
      />
      <TextField
        label="Instagram"
        value={form.instagramHandle}
        onChangeText={(value) => setField('instagramHandle', value)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="@yourhandle"
      />
      <TextField
        label="Favorite Run Spot"
        value={form.favoriteRunSpot}
        onChangeText={(value) => setField('favoriteRunSpot', value)}
        placeholder="North Shore Park"
      />
      <TextField
        label="Running Level"
        value={form.runningLevel}
        onChangeText={(value) => setField('runningLevel', value)}
        placeholder="Beginner / Intermediate / Advanced"
      />
      <TextField
        label="Typical Pace"
        value={form.typicalPace}
        onChangeText={(value) => setField('typicalPace', value)}
        placeholder="9:30 / mi"
      />
      <TextField
        label="Favorite Distance"
        value={form.favoriteDistance}
        onChangeText={(value) => setField('favoriteDistance', value)}
        placeholder="5K"
      />

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
        Interests
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
        {INTEREST_OPTIONS.map((interest) => {
          const selected = interests.includes(interest);
          return (
            <Pressable
              key={interest}
              onPress={() => toggleInterest(interest)}
              accessibilityRole="button"
              accessibilityLabel={`Toggle interest ${interest}`}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.lime : colors.charcoal,
                borderWidth: 1,
                borderColor: selected ? colors.lime : colors.gray700,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.black : colors.gray300,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {interest}
              </Text>
            </Pressable>
          );
        })}
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
        Notifications
      </Text>
      <View
        style={{
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        {NOTIFICATION_PREFS.map((pref, index) => (
          <View
            key={pref.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.sm,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.charcoal,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>{pref.label}</Text>
            <Switch
              value={notifications[pref.key]}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, [pref.key]: value }))
              }
              trackColor={{ false: colors.gray700, true: colors.limeDark }}
              thumbColor={colors.white}
            />
          </View>
        ))}
      </View>

      <Button title={copy.actions.save} onPress={() => void handleSave()} loading={updateProfile.isPending} />
    </Screen>
  );
}
