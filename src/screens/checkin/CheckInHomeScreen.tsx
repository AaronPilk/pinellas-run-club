import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, ErrorState, LoadingState, SectionHeader, StatCard } from '@/components/ui';
import { useCheckInGps, useCheckinStats, useCurrentCheckinableEvent, useMyCheckins } from '@/hooks/useCheckIn';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { formatEventDateTime, formatFullDate } from '@/lib/timeUtils';
import { spacing, useTheme } from '@/theme';
import type { CheckinWithEvent } from '@/types/models';
import type { CheckInStackScreenProps } from '@/types/navigation';

const METHOD_LABELS: Record<string, string> = {
  gps: 'GPS',
  qr: 'QR',
  gps_or_qr: 'GPS/QR',
  admin_manual: 'Admin',
};

function RecentCheckinRow({ checkin }: { checkin: CheckinWithEvent }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.charcoal,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.charcoal,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        }}
      >
        <Ionicons name="checkmark" size={18} color={colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {checkin.event?.title ?? 'Club run'}
        </Text>
        <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {formatFullDate(checkin.checked_in_at)}
          {checkin.event?.location_name ? ` · ${checkin.event.location_name}` : ''}
        </Text>
      </View>
      <Text style={{ color: colors.gray500, fontSize: 11, fontWeight: '700' }}>
        {METHOD_LABELS[checkin.method] ?? checkin.method}
      </Text>
    </View>
  );
}

export default function CheckInHomeScreen({ navigation }: CheckInStackScreenProps<'CheckInHome'>) {
  const { colors } = useTheme();

  const eventQuery = useCurrentCheckinableEvent();
  const statsQuery = useCheckinStats();
  const checkinsQuery = useMyCheckins();
  const gpsCheckIn = useCheckInGps();

  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const event = eventQuery.data;
  const stats = statsQuery.data;
  const alreadyCheckedIn = Boolean(event?.checked_in) || justCheckedIn;
  const locationDenied = checkinError === copy.errors.locationDenied;

  const handleCheckIn = () => {
    if (!event) return;
    setCheckinError(null);

    gpsCheckIn.mutate(event.id, {
      onSuccess: () => {
        hapticSuccess();
        setJustCheckedIn(true);
      },
      onError: (error) => {
        hapticError();
        setCheckinError(getErrorMessage(error));
      },
    });
  };

  if (eventQuery.isLoading || statsQuery.isLoading || checkinsQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (eventQuery.isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
        <ErrorState error={eventQuery.error} onRetry={() => eventQuery.refetch()} />
      </SafeAreaView>
    );
  }

  const recent = (checkinsQuery.data ?? []).slice(0, 5);
  const streak = stats?.current_week_streak ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={eventQuery.isRefetching}
            onRefresh={() => {
              eventQuery.refetch();
              statsQuery.refetch();
              checkinsQuery.refetch();
            }}
            tintColor={colors.lime}
          />
        }
      >
        <Text
          style={{
            color: colors.lime,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Show up. Check in. Keep the streak.
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 32,
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: -0.5,
            marginTop: spacing.xxs,
            marginBottom: spacing.md,
          }}
        >
          Check-In
        </Text>

        {event ? (
          <Card
            style={{
              padding: spacing.lg,
              borderWidth: alreadyCheckedIn ? 2 : 0,
              borderColor: colors.lime,
            }}
          >
            <Text
              style={{
                color: colors.gray500,
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {alreadyCheckedIn ? 'Tonight' : 'Happening now'}
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: spacing.xxs }}>
              {event.title}
            </Text>
            <Text style={{ color: colors.gray300, fontSize: 14, marginTop: spacing.xxs }}>
              {formatEventDateTime(event.starts_at)}
              {event.location_name ? ` · ${event.location_name}` : ''}
            </Text>

            {alreadyCheckedIn ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    backgroundColor: colors.lime,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.md,
                  }}
                >
                  <Ionicons name="checkmark" size={48} color={colors.black} />
                </View>
                <Text
                  style={{
                    color: colors.lime,
                    fontSize: 28,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                  }}
                >
                  {copy.checkin.checkedIn}
                </Text>
                <Text style={{ color: colors.gray300, fontSize: 14, marginTop: spacing.xxs }}>
                  {copy.checkin.thanks} {copy.checkin.streak}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 18,
                    fontWeight: '800',
                    marginTop: spacing.md,
                  }}
                >
                  Ready to check in?
                </Text>
                <Button
                  title="Check In Now"
                  onPress={handleCheckIn}
                  loading={gpsCheckIn.isPending}
                  style={{ marginTop: spacing.md }}
                />
                {checkinError ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: colors.danger, fontSize: 13, textAlign: 'center' }}>
                      {checkinError}
                    </Text>
                    {locationDenied ? (
                      <Pressable
                        onPress={() => Linking.openSettings()}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Open device settings"
                        style={{ marginTop: spacing.xs }}
                      >
                        <Text
                          style={{
                            color: colors.lime,
                            fontSize: 13,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}
                        >
                          Enable location in Settings
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="moon-outline" size={36} color={colors.gray500} style={{ marginBottom: spacing.sm }} />
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>
              {copy.checkin.nothingNow}
            </Text>
            <Text
              style={{
                color: colors.gray500,
                fontSize: 14,
                textAlign: 'center',
                marginTop: spacing.xs,
                lineHeight: 20,
              }}
            >
              No run happening right now. Check the Events tab.
            </Text>
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <StatCard label="This Week" value={stats?.checkins_this_week ?? 0} />
          <StatCard label="This Month" value={stats?.checkins_this_month ?? 0} />
          <StatCard label="All Time" value={stats?.checkins_total ?? 0} accent />
        </View>

        <Card
          style={{
            marginTop: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 26, marginRight: spacing.sm }}>🔥</Text>
            <View>
              <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 20 }}>
                {streak} week{streak === 1 ? '' : 's'}
              </Text>
              <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '600' }}>
                Current streak
              </Text>
            </View>
          </View>
          {streak > 0 ? <Badge label={copy.checkin.streak} tone="lime" /> : null}
        </Card>

        <SectionHeader
          title="Recent Check-Ins"
          actionLabel="View History"
          onAction={() => navigation.navigate('CheckInHistory')}
        />
        {recent.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Text style={{ color: colors.gray500, fontSize: 14, textAlign: 'center' }}>
              No check-ins yet. {copy.checkin.seeYouAtTheNext}
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: spacing.xxs }}>
            {recent.map((checkin) => (
              <RecentCheckinRow key={checkin.id} checkin={checkin} />
            ))}
          </Card>
        )}

        <Button
          title="View Full History"
          variant="secondary"
          onPress={() => navigation.navigate('CheckInHistory')}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
