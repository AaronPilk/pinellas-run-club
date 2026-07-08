import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useMyCheckins } from '@/hooks/useCheckIn';
import { formatEventTime, formatFullDate } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { CheckinWithEvent } from '@/types/models';
import type { CheckInStackScreenProps } from '@/types/navigation';

const METHOD_LABELS: Record<string, string> = {
  gps: 'GPS',
  qr: 'QR',
  gps_or_qr: 'GPS/QR',
  admin_manual: 'Admin',
};

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'checkin'; key: string; checkin: CheckinWithEvent };

export default function CheckInHistoryScreen({ navigation }: CheckInStackScreenProps<'CheckInHistory'>) {
  const checkinsQuery = useMyCheckins();

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    let currentMonth = '';

    for (const checkin of checkinsQuery.data ?? []) {
      const month = format(parseISO(checkin.checked_in_at), 'MMMM yyyy');
      if (month !== currentMonth) {
        currentMonth = month;
        result.push({ kind: 'header', key: `header-${month}`, label: month });
      }
      result.push({ kind: 'checkin', key: checkin.id, checkin });
    }

    return result;
  }, [checkinsQuery.data]);

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
          Check-In History
        </Text>
      </View>

      {checkinsQuery.isLoading ? (
        <LoadingState />
      ) : checkinsQuery.isError ? (
        <ErrorState error={checkinsQuery.error} onRetry={() => checkinsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="footsteps-outline"
          title="No check-ins yet"
          message="Show up to a run and check in. Your history lives here."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <Text
                  style={{
                    color: colors.gray500,
                    fontSize: 12,
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginTop: spacing.md,
                    marginBottom: spacing.xs,
                  }}
                >
                  {item.label}
                </Text>
              );
            }

            const { checkin } = item;
            return (
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
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.charcoal,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.sm,
                  }}
                >
                  <Ionicons name="checkmark" size={20} color={colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                    {checkin.event?.title ?? 'Club run'}
                  </Text>
                  <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {formatFullDate(checkin.checked_in_at)} · {formatEventTime(checkin.checked_in_at)}
                    {checkin.event?.location_name ? ` · ${checkin.event.location_name}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.gray300, fontSize: 11, fontWeight: '800' }}>
                    {METHOD_LABELS[checkin.method] ?? checkin.method}
                  </Text>
                  {checkin.verified ? (
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color={colors.lime}
                      style={{ marginTop: 4 }}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}
