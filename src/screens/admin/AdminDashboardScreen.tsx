import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ErrorState, LoadingState, Screen, StatCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardCounts } from '@/hooks/useAdmin';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackParamList, MoreStackScreenProps } from '@/types/navigation';

type SectionRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  screen: keyof MoreStackParamList;
};

export default function AdminDashboardScreen({
  navigation,
}: MoreStackScreenProps<'AdminDashboard'>) {
  const { isAdmin } = useAuth();
  const countsQuery = useDashboardCounts();

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const counts = countsQuery.data;

  const sections: SectionRow[] = [
    {
      icon: 'people-outline',
      label: 'Members',
      detail: counts ? `${counts.pending_members} pending approval` : undefined,
      screen: 'AdminMembers',
    },
    {
      icon: 'calendar-outline',
      label: 'Events',
      detail: counts ? `${counts.upcoming_events} upcoming` : undefined,
      screen: 'AdminEvents',
    },
    { icon: 'pricetags-outline', label: 'Partners', screen: 'AdminPartners' },
    {
      icon: 'stopwatch-outline',
      label: 'Courses & Times',
      detail: counts ? `${counts.unverified_times} times to review` : undefined,
      screen: 'AdminCourses',
    },
    {
      icon: 'briefcase-outline',
      label: 'Sponsor Leads',
      detail: counts ? `${counts.new_sponsor_leads} new` : undefined,
      screen: 'AdminSponsorLeads',
    },
    { icon: 'megaphone-outline', label: 'Announcements', screen: 'AdminNotifications' },
  ];

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
          Admin Dashboard
        </Text>
      </View>

      {countsQuery.isLoading ? (
        <LoadingState />
      ) : countsQuery.isError ? (
        <ErrorState error={countsQuery.error} onRetry={() => countsQuery.refetch()} />
      ) : counts ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard label="Pending Members" value={counts.pending_members} accent={counts.pending_members > 0} />
            <StatCard label="Members" value={counts.total_members} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <StatCard label="Upcoming Events" value={counts.upcoming_events} />
            <StatCard label="New Leads" value={counts.new_sponsor_leads} />
            <StatCard label="Times to Review" value={counts.unverified_times} />
          </View>
        </>
      ) : null}

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
        Manage
      </Text>
      {sections.map((section) => (
        <Pressable
          key={section.label}
          onPress={() => {
            hapticLight();
            // Every admin section route takes no params.
            navigation.navigate(section.screen as never);
          }}
          accessibilityRole="button"
          accessibilityLabel={section.label}
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
          <Ionicons name={section.icon} size={20} color={colors.lime} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>{section.label}</Text>
            {section.detail ? (
              <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 1 }}>{section.detail}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
        </Pressable>
      ))}
    </Screen>
  );
}
