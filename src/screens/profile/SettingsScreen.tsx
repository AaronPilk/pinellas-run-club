import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native';

import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { ProfileStackScreenProps } from '@/types/navigation';

const SUPPORT_EMAIL = 'pinellasrunclub@gmail.com';

const NOTIFICATION_PREFS = [
  { key: 'notification_events', label: 'Events & runs' },
  { key: 'notification_perks', label: 'Partner perks' },
  { key: 'notification_social', label: 'Social activity' },
  { key: 'notification_badges', label: 'Badges & streaks' },
] as const;

type PrefKey = (typeof NOTIFICATION_PREFS)[number]['key'];

const THEME_OPTIONS = [
  { key: 'system', label: 'System' },
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
] as const;

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        color: colors.gray300,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
      }}
    >
      {children}
    </Text>
  );
}

export default function SettingsScreen({ navigation }: ProfileStackScreenProps<'Settings'>) {
  const { colors, preference, setPreference } = useTheme();
  const { signOut } = useAuth();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [overrides, setOverrides] = useState<Partial<Record<PrefKey, boolean>>>({});

  const profile = profileQuery.data;

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

  const prefValue = (key: PrefKey): boolean => overrides[key] ?? profile[key];

  const togglePref = (key: PrefKey, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    updateProfile.mutate(
      { [key]: value },
      {
        onError: (error) => {
          setOverrides((prev) => ({ ...prev, [key]: !value }));
          Alert.alert('Update failed', getErrorMessage(error));
        },
      }
    );
  };

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=PRC App Support`).catch(() =>
      Alert.alert('Support', `Email us at ${SUPPORT_EMAIL}`)
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This sends a deletion request to the club organizers. Your data is removed within 30 days.',
      [
        { text: copy.actions.cancel, style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: () =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=Account Deletion Request&body=Please delete my Pinellas Run Club account (${profile.email}).`
            ).catch(() => Alert.alert('Support', `Email us at ${SUPPORT_EMAIL}`)),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(copy.actions.signOut, 'Sign out of Pinellas Run Club?', [
      { text: copy.actions.cancel, style: 'cancel' },
      { text: copy.actions.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
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
          }}
        >
          Settings
        </Text>
      </View>

      <SectionLabel>Appearance</SectionLabel>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => {
                hapticLight();
                setPreference(option.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: active ? colors.lime : colors.darkCard,
              }}
            >
              <Text
                style={{
                  color: active ? colors.black : colors.gray300,
                  fontWeight: '800',
                  fontSize: 13,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Notifications</SectionLabel>
      <View style={{ backgroundColor: colors.darkCard, borderRadius: radius.md, paddingHorizontal: spacing.md }}>
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
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{pref.label}</Text>
            <Switch
              value={prefValue(pref.key)}
              onValueChange={(value) => togglePref(pref.key, value)}
              trackColor={{ false: colors.gray700, true: colors.limeDark }}
              thumbColor={colors.white}
            />
          </View>
        ))}
      </View>

      <SectionLabel>Account</SectionLabel>
      <View style={{ backgroundColor: colors.darkCard, borderRadius: radius.md, padding: spacing.md }}>
        <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '700', marginBottom: 2 }}>
          Signed in as
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{profile.email}</Text>
      </View>

      <SectionLabel>Support</SectionLabel>
      <Pressable
        onPress={() => {
          hapticLight();
          handleContactSupport();
        }}
        accessibilityRole="button"
        accessibilityLabel="Contact support"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="mail-outline" size={20} color={colors.lime} style={{ marginRight: spacing.sm }} />
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 }}>
          Contact Support
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
      </Pressable>

      <SectionLabel>Danger Zone</SectionLabel>
      <Pressable
        onPress={handleDeleteAccount}
        accessibilityRole="button"
        accessibilityLabel="Request account deletion"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.danger,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} style={{ marginRight: spacing.sm }} />
        <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '700' }}>Delete Account</Text>
      </Pressable>

      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel={copy.actions.signOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          marginTop: spacing.lg,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.gray300} style={{ marginRight: spacing.xs }} />
        <Text style={{ color: colors.gray300, fontSize: 15, fontWeight: '700' }}>{copy.actions.signOut}</Text>
      </Pressable>

      <Text style={{ color: colors.gray700, fontSize: 12, textAlign: 'center', marginTop: spacing.lg }}>
        Pinellas Run Club v{appVersion}
      </Text>
    </Screen>
  );
}
