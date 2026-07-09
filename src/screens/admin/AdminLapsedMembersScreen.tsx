import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, FlatList, Linking, Pressable, Text, View } from 'react-native';

import { Avatar, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useLapsedMembers } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { radius, spacing, useTheme, type Palette } from '@/theme';
import type { LapsedMember } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

const DAY_MS = 86_400_000;

/** Whole days since the ISO timestamp; null when the member never checked in. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
}

function lapsedLabel(days: number | null): string {
  if (days === null) return 'Never checked in';
  if (days === 0) return 'Checked in today';
  if (days === 1) return '1 day since last check-in';
  if (days < 14) return `${days} days since last check-in`;
  return `${Math.floor(days / 7)} weeks since last check-in`;
}

/** danger: never checked in or 21+ days lapsed; warning: 14+ days. */
function severityColor(days: number | null, colors: Palette): string {
  if (days === null || days >= 21) return colors.danger;
  if (days >= 14) return colors.warning;
  return colors.gray500;
}

export default function AdminLapsedMembersScreen({
  navigation,
}: MoreStackScreenProps<'AdminLapsedMembers'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const lapsedQuery = useLapsedMembers();

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Link failed', 'Could not open that link.'));
  };

  const renderMember = ({ item }: { item: LapsedMember }) => {
    const days = daysSince(item.last_checkin_at);
    const accent = severityColor(days, colors);
    const flagged = days === null || days >= 21;

    return (
      <View
        style={{
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar uri={item.avatar_url} name={item.full_name} size={42} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {flagged ? <Ionicons name="flag" size={14} color={accent} /> : null}
              <Text
                style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15, flexShrink: 1 }}
                numberOfLines={1}
              >
                {item.full_name}
              </Text>
            </View>
            <Text style={{ color: accent, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
              {lapsedLabel(days)}
            </Text>
            <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 1 }}>
              {item.checkins_total} check-in{item.checkins_total === 1 ? '' : 's'} total
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Pressable
              onPress={() => openLink(`mailto:${item.email}`)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Email ${item.full_name}`}
              style={({ pressed }) => ({
                backgroundColor: colors.charcoal,
                borderRadius: radius.pill,
                padding: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="mail-outline" size={18} color={colors.lime} />
            </Pressable>
            {item.phone ? (
              <Pressable
                onPress={() => openLink(`tel:${item.phone}`)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Call ${item.full_name}`}
                style={({ pressed }) => ({
                  backgroundColor: colors.charcoal,
                  borderRadius: radius.pill,
                  padding: 10,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="call-outline" size={18} color={colors.lime} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

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
            }}
          >
            Needs Follow-Up
          </Text>
        </View>
        <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 4 }}>
          Approved members sorted by longest time since last check-in.
        </Text>
      </View>

      {lapsedQuery.isLoading ? (
        <LoadingState />
      ) : lapsedQuery.isError ? (
        <ErrorState error={lapsedQuery.error} onRetry={() => lapsedQuery.refetch()} />
      ) : (lapsedQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="walk-outline"
          title="No members to follow up"
          message="Approved members will show up here sorted by last check-in."
        />
      ) : (
        <FlatList
          data={lapsedQuery.data}
          keyExtractor={(item) => item.profile_id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={renderMember}
        />
      )}
    </Screen>
  );
}
