import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, Card, ErrorState, LoadingState, StatCard } from '@/components/ui';
import { useStartDm } from '@/hooks/useDms';
import { useMemberProfile, useMyProfile } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { formatFullDate } from '@/lib/timeUtils';
import { spacing, useTheme } from '@/theme';
import type { AppTabsParamList, FeedStackScreenProps } from '@/types/navigation';

export default function MemberProfileScreen({
  navigation,
  route,
}: FeedStackScreenProps<'MemberProfile'>) {
  const { colors } = useTheme();

  const { profileId } = route.params;
  const member = useMemberProfile(profileId);
  const myProfile = useMyProfile();
  const startDm = useStartDm();

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();
  const isMe = myProfile.data?.id === profileId;

  let body: React.ReactNode;

  if (member.isPending) {
    body = <LoadingState />;
  } else if (member.isError) {
    body = <ErrorState error={member.error} onRetry={() => void member.refetch()} />;
  } else {
    const { profile, stats, badges } = member.data;
    const instagram = profile.instagram_handle?.replace(/^@/, '');

    body = (
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={96} />
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 24,
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
            accessibilityRole="header"
          >
            {profile.full_name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.xs,
              marginTop: spacing.xs,
              alignItems: 'center',
            }}
          >
            <Badge label={`Member #${profile.member_number}`} tone="lime" />
            {profile.role === 'admin' || profile.role === 'super_admin' ? (
              <Badge label="Organizer" tone="neutral" />
            ) : null}
          </View>
          <Text style={{ color: colors.gray500, fontSize: 13, marginTop: spacing.xs }}>
            Member since {formatFullDate(profile.created_at)}
          </Text>
          {!isMe ? (
            <Button
              title={copy.dms.messageButton}
              loading={startDm.isPending}
              onPress={() => {
                startDm.mutate(profile.id, {
                  onSuccess: (conversationId) => {
                    tabNav?.navigate('ProfileTab', {
                      screen: 'ChatThread',
                      params: {
                        conversationId,
                        otherName: profile.full_name,
                        otherProfileId: profile.id,
                      },
                    });
                  },
                });
              }}
              style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
            />
          ) : null}
        </View>

        {/* Bio + details (public fields only — phone/email stay hidden) */}
        {profile.bio ? (
          <Card style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.gray100, fontSize: 15, lineHeight: 22 }}>
              {profile.bio}
            </Text>
          </Card>
        ) : null}

        <Card style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
          {profile.favorite_run_spot ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="location-outline" size={18} color={colors.lime} />
              <Text style={{ color: colors.gray100, fontSize: 14, flex: 1 }}>
                Favorite spot: {profile.favorite_run_spot}
              </Text>
            </View>
          ) : null}
          {profile.running_level ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="speedometer-outline" size={18} color={colors.lime} />
              <Text
                style={{
                  color: colors.gray100,
                  fontSize: 14,
                  flex: 1,
                  textTransform: 'capitalize',
                }}
              >
                {profile.running_level} runner
                {profile.typical_pace ? ` · ${profile.typical_pace}` : ''}
              </Text>
            </View>
          ) : null}
          {instagram ? (
            <Pressable
              onPress={() => void Linking.openURL(`https://instagram.com/${instagram}`)}
              accessibilityRole="link"
              accessibilityLabel={`Open Instagram profile @${instagram}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Ionicons name="logo-instagram" size={18} color={colors.lime} />
              <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 14 }}>
                @{instagram}
              </Text>
            </Pressable>
          ) : null}
          {!profile.favorite_run_spot && !profile.running_level && !instagram ? (
            <Text style={{ color: colors.gray500, fontSize: 14 }}>
              This member keeps it mysterious.
            </Text>
          ) : null}
        </Card>

        {/* Public stats */}
        {profile.allow_public_stats && stats ? (
          <>
            <Text
              style={{
                color: colors.gray300,
                fontSize: 12,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginTop: spacing.sm,
                marginBottom: spacing.xs,
              }}
            >
              Stats
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs }}>
              <StatCard label="Check-ins" value={stats.checkins_total} accent />
              <StatCard label="Points" value={stats.points_total} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <StatCard label="Week streak" value={stats.current_week_streak} />
              <StatCard label="Badges" value={stats.badges_total} />
            </View>
          </>
        ) : null}

        {/* Badges */}
        {badges.length > 0 ? (
          <>
            <Text
              style={{
                color: colors.gray300,
                fontSize: 12,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              Badges
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {badges.map((memberBadge) => (
                <Badge key={memberBadge.id} label={memberBadge.badge.name} tone="neutral" />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '900',
            fontSize: 17,
            textTransform: 'uppercase',
          }}
        >
          Member
        </Text>
      </View>

      <View style={{ flex: 1 }}>{body}</View>
    </SafeAreaView>
  );
}
