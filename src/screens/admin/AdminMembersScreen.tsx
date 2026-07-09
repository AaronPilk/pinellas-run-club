import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { Avatar, Badge, EmptyState, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import {
  useAllMembers,
  useApproveMember,
  useSetMemberRole,
  useSuspendMember,
} from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { Profile, UserRole } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

type MembersTab = 'all' | 'paid';

function isPaidMember(m: Profile): boolean {
  return m.subscription_status === 'active' || m.subscription_status === 'trialing';
}

export default function AdminMembersScreen({ navigation }: MoreStackScreenProps<'AdminMembers'>) {
  const { colors } = useTheme();

  const { isAdmin, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<MembersTab>('all');
  const [search, setSearch] = useState('');

  const allQuery = useAllMembers({ search: search.trim() || undefined });

  const approve = useApproveMember();
  const suspend = useSuspendMember();
  const setRole = useSetMemberRole();

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const allMembers = allQuery.data ?? [];
  const members = tab === 'paid' ? allMembers.filter(isPaidMember) : allMembers;

  const runAction = (action: Promise<void>, successMessage: string) => {
    action
      .then(() => {
        hapticSuccess();
        if (successMessage) Alert.alert(successMessage);
      })
      .catch((error) => Alert.alert('Action failed', getErrorMessage(error)));
  };

  const changeRole = (member: Profile) => {
    const options: { label: string; role: UserRole }[] = [
      { label: 'Member', role: 'member' },
      { label: 'Admin', role: 'admin' },
      { label: 'Super Admin', role: 'super_admin' },
    ];
    Alert.alert('Change role', `Set a new role for ${member.full_name}.`, [
      ...options.map((option) => ({
        text: option.label + (member.role === option.role ? ' (current)' : ''),
        onPress: () =>
          member.role === option.role
            ? undefined
            : runAction(setRole.mutateAsync({ profileId: member.id, role: option.role }), ''),
      })),
      { text: copy.actions.cancel, style: 'cancel' as const },
    ]);
  };

  const memberActions = (member: Profile) => {
    hapticLight();
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];

    if (member.status === 'approved') {
      buttons.push({
        text: copy.admin.suspend,
        style: 'destructive',
        onPress: () =>
          Alert.alert(copy.admin.suspend, `Suspend ${member.full_name}? They lose access immediately.`, [
            { text: copy.actions.cancel, style: 'cancel' },
            {
              text: copy.admin.suspend,
              style: 'destructive',
              onPress: () => runAction(suspend.mutateAsync(member.id), ''),
            },
          ]),
      });
    } else {
      buttons.push({
        text: 'Reactivate',
        onPress: () =>
          Alert.alert('Reactivate', `Restore ${member.full_name}'s access?`, [
            { text: copy.actions.cancel, style: 'cancel' },
            { text: 'Reactivate', onPress: () => runAction(approve.mutateAsync(member.id), '') },
          ]),
      });
    }

    if (isSuperAdmin) {
      buttons.push({ text: 'Change Role', onPress: () => changeRole(member) });
    }

    buttons.push({ text: copy.actions.cancel, style: 'cancel' });

    Alert.alert(member.full_name, member.email, buttons);
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
            Members
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
          {(
            [
              { value: 'all', label: 'All Members' },
              { value: 'paid', label: 'Paid Members' },
            ] as const
          ).map((item) => {
            const selected = tab === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  hapticLight();
                  setTab(item.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.lime : colors.charcoal,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: selected ? colors.black : colors.gray300, fontWeight: '800', fontSize: 13 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          placeholder="Search name, email, username"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }}
        />
      </View>

      {allQuery.isLoading ? (
        <LoadingState />
      ) : allQuery.isError ? (
        <ErrorState error={allQuery.error} onRetry={() => allQuery.refetch()} />
      ) : members.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={tab === 'paid' ? 'No paid members yet' : 'No members found'}
          message={
            tab === 'paid'
              ? 'Members with an active subscription will show here.'
              : 'Try a different search.'
          }
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const paid = isPaidMember(item);
            return (
              <Pressable
                onPress={() => memberActions(item)}
                accessibilityRole="button"
                accessibilityLabel={`Member ${item.full_name}`}
                style={({ pressed }) => ({
                  backgroundColor: colors.darkCard,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar uri={item.avatar_url} name={item.full_name} size={42} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text
                        style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15, flexShrink: 1 }}
                        numberOfLines={1}
                      >
                        {item.full_name}
                      </Text>
                      {item.role !== 'member' ? (
                        <Badge label={item.role === 'super_admin' ? 'Super' : 'Admin'} tone="neutral" />
                      ) : null}
                    </View>
                    <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  {item.status !== 'approved' ? (
                    <Badge label="Suspended" tone="danger" />
                  ) : paid ? (
                    <Badge label="Paid" tone="success" />
                  ) : (
                    <Badge label="Free" tone="neutral" />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
