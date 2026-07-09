import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Alert, Linking, Pressable, Share, Text, View } from 'react-native';

import { Avatar, Badge, Card, ErrorState, LoadingState, Screen, StatCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCheckinStats } from '@/hooks/useCheckIn';
import { useMyProfile } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { AppTabsParamList, ProfileStackScreenProps } from '@/types/navigation';

type ActionRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function ProfileFact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
      <Ionicons name={icon} size={16} color={colors.lime} style={{ width: 24 }} />
      <Text style={{ color: colors.gray500, fontSize: 13, width: 110 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function MyProfileScreen({ navigation }: ProfileStackScreenProps<'MyProfile'>) {
  const { colors } = useTheme();

  const { signOut } = useAuth();
  const profileQuery = useMyProfile();
  const statsQuery = useCheckinStats();

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

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

  const handleInvite = async () => {
    hapticLight();
    try {
      await Share.share({
        message: `Come run with us. Join Pinellas Run Club with my invite code ${profile.invite_code}: prc://invite/${profile.invite_code}`,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleSignOut = () => {
    Alert.alert(copy.actions.signOut, 'Sign out of Pinellas Run Club?', [
      { text: copy.actions.cancel, style: 'cancel' },
      { text: copy.actions.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const actions: ActionRow[] = [
    { icon: 'create-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'card-outline', label: 'Member Pass', onPress: () => navigation.navigate('MemberPass') },
    { icon: 'ribbon-outline', label: 'My Badges', onPress: () => navigation.navigate('MyBadges') },
    {
      icon: 'stopwatch-outline',
      label: 'Course Times',
      onPress: () => tabNav?.navigate('MoreTab', { screen: 'Courses' }),
    },
    {
      icon: 'footsteps-outline',
      label: 'Check-In History',
      onPress: () => tabNav?.navigate('CheckInTab', { screen: 'CheckInHistory' }),
    },
    { icon: 'person-add-outline', label: 'Invite a Friend', onPress: () => void handleInvite() },
    { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
    { icon: 'log-out-outline', label: copy.actions.signOut, onPress: handleSignOut, danger: true },
  ];

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={96} />
        <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: spacing.sm }}>
          {profile.full_name}
        </Text>
        {profile.username ? (
          <Text style={{ color: colors.gray500, fontSize: 14, marginTop: 2 }}>@{profile.username}</Text>
        ) : null}
        <Badge
          label={`Member #${profile.member_number}`}
          tone="lime"
          style={{ marginTop: spacing.xs }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <StatCard label="Check-Ins" value={stats?.checkins_total ?? 0} />
        <StatCard label="Events" value={stats?.events_rsvped_total ?? 0} />
        <StatCard label="Badges" value={stats?.badges_total ?? 0} />
      </View>

      {profile.bio ? (
        <Card style={{ marginTop: spacing.md }}>
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
            About
          </Text>
          <Text style={{ color: colors.gray200, fontSize: 14, lineHeight: 21 }}>{profile.bio}</Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        {profile.favorite_run_spot ? (
          <ProfileFact icon="location-outline" label="Favorite spot" value={profile.favorite_run_spot} />
        ) : null}
        {profile.running_level ? (
          <ProfileFact icon="speedometer-outline" label="Level" value={profile.running_level} />
        ) : null}
        {profile.typical_pace ? (
          <ProfileFact icon="stopwatch-outline" label="Typical pace" value={profile.typical_pace} />
        ) : null}
        {profile.favorite_distance ? (
          <ProfileFact icon="trail-sign-outline" label="Go-to distance" value={profile.favorite_distance} />
        ) : null}
        <ProfileFact
          icon="calendar-outline"
          label="Member since"
          value={format(parseISO(profile.created_at), 'MMMM yyyy')}
        />
        {profile.instagram_handle ? (
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://instagram.com/${profile.instagram_handle?.replace(/^@/, '')}`
              ).catch(() => undefined)
            }
            accessibilityRole="link"
            accessibilityLabel="Open Instagram profile"
          >
            <ProfileFact
              icon="logo-instagram"
              label="Instagram"
              value={`@${profile.instagram_handle.replace(/^@/, '')}`}
            />
          </Pressable>
        ) : null}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              hapticLight();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.darkCard,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.xs,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={action.danger ? colors.danger : colors.lime}
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                color: action.danger ? colors.danger : colors.textPrimary,
                fontSize: 15,
                fontWeight: '700',
                flex: 1,
              }}
            >
              {action.label}
            </Text>
            {!action.danger ? <Ionicons name="chevron-forward" size={18} color={colors.gray500} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
