import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAllBadges, useMyBadges } from '@/hooks/useBadges';
import { formatFullDate } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { Badge as BadgeModel } from '@/types/models';
import type { ProfileStackScreenProps } from '@/types/navigation';

type BadgeTile = {
  badge: BadgeModel;
  earned: boolean;
  awardedAt: string | null;
};

function badgeIcon(badge: BadgeModel): keyof typeof Ionicons.glyphMap {
  if (badge.icon_name && badge.icon_name in Ionicons.glyphMap) {
    return badge.icon_name as keyof typeof Ionicons.glyphMap;
  }
  return 'ribbon';
}

export default function MyBadgesScreen({ navigation }: ProfileStackScreenProps<'MyBadges'>) {
  const { colors } = useTheme();

  const allBadgesQuery = useAllBadges();
  const myBadgesQuery = useMyBadges();

  const tiles = useMemo<BadgeTile[]>(() => {
    const earnedById = new Map(
      (myBadgesQuery.data ?? []).map((memberBadge) => [memberBadge.badge_id, memberBadge.awarded_at])
    );

    return (allBadgesQuery.data ?? []).map((badge) => ({
      badge,
      earned: earnedById.has(badge.id),
      awardedAt: earnedById.get(badge.id) ?? null,
    }));
  }, [allBadgesQuery.data, myBadgesQuery.data]);

  const earnedCount = tiles.filter((tile) => tile.earned).length;

  return (
    <Screen noPadding>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={{ marginLeft: spacing.xs }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 20,
              fontWeight: '900',
              textTransform: 'uppercase',
            }}
          >
            My Badges
          </Text>
          {tiles.length > 0 ? (
            <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '600' }}>
              {earnedCount} of {tiles.length} earned
            </Text>
          ) : null}
        </View>
      </View>

      {allBadgesQuery.isLoading || myBadgesQuery.isLoading ? (
        <LoadingState />
      ) : allBadgesQuery.isError ? (
        <ErrorState error={allBadgesQuery.error} onRetry={() => allBadgesQuery.refetch()} />
      ) : tiles.length === 0 ? (
        <EmptyState
          icon="ribbon-outline"
          title="No badges yet"
          message="Badges land automatically as you check in, log PRs, and show up for the club."
        />
      ) : (
        <FlatList
          data={tiles}
          keyExtractor={(item) => item.badge.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120, gap: spacing.sm }}
          renderItem={({ item }) => (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.darkCard,
                borderRadius: radius.lg,
                padding: spacing.md,
                alignItems: 'center',
                borderWidth: item.earned ? 1.5 : 0,
                borderColor: colors.lime,
                opacity: item.earned ? 1 : 0.45,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: item.earned ? colors.lime : colors.charcoal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons
                  name={item.earned ? badgeIcon(item.badge) : 'lock-closed'}
                  size={26}
                  color={item.earned ? colors.black : colors.gray500}
                />
              </View>
              <Text
                style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14, textAlign: 'center' }}
                numberOfLines={2}
              >
                {item.badge.name}
              </Text>
              {item.badge.description ? (
                <Text
                  style={{
                    color: colors.gray500,
                    fontSize: 11,
                    textAlign: 'center',
                    marginTop: 4,
                    lineHeight: 15,
                  }}
                  numberOfLines={3}
                >
                  {item.badge.description}
                </Text>
              ) : null}
              {item.earned && item.awardedAt ? (
                <Text
                  style={{
                    color: colors.lime,
                    fontSize: 11,
                    fontWeight: '700',
                    marginTop: spacing.xs,
                  }}
                >
                  Earned {formatFullDate(item.awardedAt)}
                </Text>
              ) : (
                <Text style={{ color: colors.gray500, fontSize: 11, fontWeight: '700', marginTop: spacing.xs }}>
                  Locked
                </Text>
              )}
            </View>
          )}
        />
      )}
    </Screen>
  );
}
