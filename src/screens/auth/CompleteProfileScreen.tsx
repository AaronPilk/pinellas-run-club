import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useUpdateMyProfile, useUploadAvatar } from '@/hooks/useMyProfile';
import { Avatar, Button, TextField } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { pickImage } from '@/services/mediaService';
import { radius, spacing, useTheme } from '@/theme';

const RUNNING_LEVELS = ['beginner', 'casual', 'intermediate', 'advanced'] as const;

const INTERESTS = [
  'social runs',
  '5K',
  '10K',
  'half marathon',
  'trails',
  'beach runs',
  'recovery runs',
  'beer runs',
  'networking',
  'volunteering',
] as const;

export default function CompleteProfileScreen() {
  const { colors } = useTheme();

  const { profile, refetchProfile } = useAuth();
  const uploadAvatar = useUploadAvatar();
  const updateProfile = useUpdateMyProfile();

  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [favoriteRunSpot, setFavoriteRunSpot] = useState(profile?.favorite_run_spot ?? '');
  const [runningLevel, setRunningLevel] = useState<string | null>(profile?.running_level ?? null);
  const [typicalPace, setTypicalPace] = useState(profile?.typical_pace ?? '');
  const [instagramHandle, setInstagramHandle] = useState(profile?.instagram_handle ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [notifyEvents, setNotifyEvents] = useState(profile?.notification_events ?? true);
  const [notifyPerks, setNotifyPerks] = useState(profile?.notification_perks ?? true);
  const [notifySocial, setNotifySocial] = useState(profile?.notification_social ?? true);
  const [notifyBadges, setNotifyBadges] = useState(profile?.notification_badges ?? true);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handlePickAvatar = async () => {
    setError(null);
    try {
      const uri = await pickImage({ allowsEditing: true, aspect: [1, 1] });
      if (uri) {
        setLocalAvatarUri(uri);
        setAvatarUri(uri);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      if (localAvatarUri) {
        await uploadAvatar.mutateAsync(localAvatarUri);
      }
      await updateProfile.mutateAsync({
        bio: bio.trim() || null,
        favorite_run_spot: favoriteRunSpot.trim() || null,
        running_level: runningLevel,
        typical_pace: typicalPace.trim() || null,
        instagram_handle: instagramHandle.trim().replace(/^@/, '') || null,
        interests,
        notification_events: notifyEvents,
        notification_perks: notifyPerks,
        notification_social: notifySocial,
        notification_badges: notifyBadges,
      });
      hapticSuccess();
      await refetchProfile(); // RootNavigator routes onward based on status.
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    try {
      await refetchProfile();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const notificationRows: { label: string; value: boolean; onChange: (v: boolean) => void }[] = [
    { label: 'Event reminders', value: notifyEvents, onChange: setNotifyEvents },
    { label: 'Partner perks', value: notifyPerks, onChange: setNotifyPerks },
    { label: 'Social activity', value: notifySocial, onChange: setNotifySocial },
    { label: 'Badges + streaks', value: notifyBadges, onChange: setNotifyBadges },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 30,
              textTransform: 'uppercase',
            }}
            accessibilityRole="header"
          >
            Make it yours
          </Text>
          <Text
            style={{ color: colors.gray300, fontSize: 15, marginTop: 6, marginBottom: spacing.lg }}
          >
            A quick profile helps the club know who&apos;s showing up. Everything here is optional.
          </Text>

          {/* Avatar */}
          <Pressable
            onPress={handlePickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
            style={{ alignItems: 'center', marginBottom: spacing.lg }}
          >
            <Avatar uri={avatarUri} name={profile?.full_name} size={96} />
            <Text
              style={{ color: colors.lime, fontWeight: '800', fontSize: 14, marginTop: spacing.xs }}
            >
              {avatarUri ? 'Change photo' : 'Add a photo'}
            </Text>
          </Pressable>

          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            maxLength={280}
            placeholder="Weekend warrior. Post-run coffee enthusiast."
            style={{ minHeight: 84, textAlignVertical: 'top' }}
          />
          <TextField
            label="Favorite run spot"
            value={favoriteRunSpot}
            onChangeText={setFavoriteRunSpot}
            placeholder="The Pier, Coffee Pot Blvd..."
          />

          {/* Running level */}
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
            Running level
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginBottom: spacing.md,
            }}
          >
            {RUNNING_LEVELS.map((level) => {
              const active = runningLevel === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setRunningLevel(active ? null : level)}
                  accessibilityRole="button"
                  accessibilityLabel={`Running level ${level}`}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
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
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Typical pace"
            value={typicalPace}
            onChangeText={setTypicalPace}
            placeholder="9:30 / mi"
          />
          <TextField
            label="Instagram"
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            autoCapitalize="none"
            placeholder="@yourhandle"
          />

          {/* Interests */}
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
            What are you into?
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginBottom: spacing.lg,
            }}
          >
            {INTERESTS.map((interest) => {
              const active = interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={interest}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    backgroundColor: active ? colors.lime : colors.charcoal,
                    borderWidth: 1,
                    borderColor: active ? colors.lime : colors.gray700,
                  }}
                >
                  {active ? <Ionicons name="checkmark" size={14} color={colors.black} /> : null}
                  <Text
                    style={{
                      color: active ? colors.black : colors.gray300,
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

          {/* Notifications */}
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
              marginBottom: spacing.lg,
            }}
          >
            {notificationRows.map((row, index) => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.charcoal,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                  {row.label}
                </Text>
                <Switch
                  value={row.value}
                  onValueChange={row.onChange}
                  trackColor={{ true: colors.limeDark, false: colors.gray700 }}
                  thumbColor={colors.white}
                  accessibilityLabel={row.label}
                />
              </View>
            ))}
          </View>

          {error ? (
            <Text style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
              {error}
            </Text>
          ) : null}

          <Button title="Save Profile" onPress={handleSave} loading={saving} />
          <Button
            title="Skip for now"
            variant="ghost"
            onPress={handleSkip}
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
