import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Alert, Linking, Pressable, Text, useWindowDimensions, View } from 'react-native';

import {
  Avatar,
  Badge,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  StatCard,
} from '@/components/ui';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useCheckinStats } from '@/hooks/useCheckIn';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useUnreadCount } from '@/hooks/useNotifications';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { radius, shadows, spacing, useTheme } from '@/theme';
import type { AppTabsParamList, ProfileStackScreenProps } from '@/types/navigation';

type GridItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badgeCount?: number;
  /** Requires an active membership; locks behind the paywall for non-members. */
  paid?: boolean;
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

  const { signOut, hasFullAccess } = useAuth();
  const profileQuery = useMyProfile();
  const statsQuery = useCheckinStats();
  const unreadQuery = useUnreadCount();
  const settingsQuery = useAppSettings();

  const unread = unreadQuery.data ?? 0;
  const locked = (settingsQuery.data?.paywall_enabled ?? false) && !hasFullAccess;

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  // 3-column grid: exact tile width edge-to-edge (screen padding = spacing.md each side).
  const { width } = useWindowDimensions();
  const gridGap = spacing.sm;
  const tileWidth = (width - spacing.md * 2 - gridGap * 2) / 3;

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

  const handleSignOut = () => {
    Alert.alert(copy.actions.signOut, 'Sign out of Pinellas Run Club?', [
      { text: copy.actions.cancel, style: 'cancel' },
      { text: copy.actions.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const gridItems: GridItem[] = [
    { icon: 'create-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'card-outline', label: 'Member Pass', onPress: () => navigation.navigate('MemberPass'), paid: true },
    { icon: 'ribbon-outline', label: 'My Badges', onPress: () => navigation.navigate('MyBadges'), paid: true },
    {
      icon: 'footsteps-outline',
      label: 'Check-In History',
      onPress: () => tabNav?.navigate('CheckInTab', { screen: 'CheckInHistory' }),
      paid: true,
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
      badgeCount: unread,
    },
    { icon: 'pricetags-outline', label: 'Partner Perks', onPress: () => navigation.navigate('PartnerPerks'), paid: true },
    { icon: 'stopwatch-outline', label: 'Courses', onPress: () => navigation.navigate('Courses'), paid: true },
    { icon: 'person-add-outline', label: 'Invite a Friend', onPress: () => navigation.navigate('InviteFriend') },
    { icon: 'megaphone-outline', label: 'Sponsorships', onPress: () => navigation.navigate('Sponsorship') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
    { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
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

      {locked ? (
        <Pressable
          onPress={() => {
            hapticLight();
            navigation.navigate('Subscribe');
          }}
          accessibilityRole="button"
          accessibilityLabel="Become a member"
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.lime,
            backgroundColor: colors.darkCard,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            opacity: pressed ? 0.9 : 1,
            ...shadows.card,
          })}
        >
          <Ionicons name="lock-open-outline" size={24} color={colors.lime} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '900' }}>
              Unlock the full club
            </Text>
            <Text style={{ color: colors.gray300, fontSize: 13, marginTop: 2 }}>
              Events, check-ins, perks, courses & more.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.lime} />
        </Pressable>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: gridGap,
          marginTop: spacing.lg,
        }}
      >
        {gridItems.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => {
              hapticLight();
              if (item.paid && locked) navigation.navigate('Subscribe');
              else item.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              item.paid && locked
                ? `${item.label}, members only`
                : item.badgeCount
                  ? `${item.label}, ${item.badgeCount} unread`
                  : item.label
            }
            style={({ pressed }) => ({
              width: tileWidth,
              height: tileWidth,
              backgroundColor: colors.darkCard,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xs,
              gap: spacing.xs,
              opacity: pressed ? 0.85 : 1,
              ...shadows.card,
            })}
          >
            {item.badgeCount ? (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ color: colors.black, fontSize: 11, fontWeight: '900' }}>
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </Text>
              </View>
            ) : null}
            {item.paid && locked ? (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                }}
              >
                <Ionicons name="lock-closed" size={14} color={colors.gray500} />
              </View>
            ) : null}
            <Ionicons
              name={item.icon}
              size={28}
              color={item.paid && locked ? colors.gray500 : colors.lime}
            />
            <Text
              numberOfLines={2}
              style={{
                color: item.paid && locked ? colors.gray500 : colors.textPrimary,
                fontSize: 12.5,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => {
          hapticLight();
          handleSignOut();
        }}
        accessibilityRole="button"
        accessibilityLabel={copy.actions.signOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          marginTop: spacing.lg,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '700' }}>
          {copy.actions.signOut}
        </Text>
      </Pressable>
    </Screen>
  );
}
