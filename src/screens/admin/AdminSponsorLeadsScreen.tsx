import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, Text, View } from 'react-native';

import { Badge, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useSponsorLeads, useUpdateLeadStatus } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatFullDate } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { SponsorLead } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
] as const;

const STATUS_TONES: Record<string, 'lime' | 'neutral' | 'warning' | 'danger' | 'success'> = {
  new: 'lime',
  contacted: 'warning',
  won: 'success',
  lost: 'danger',
};

const NEXT_STATUSES: Record<string, string[]> = {
  new: ['contacted', 'won', 'lost'],
  contacted: ['won', 'lost', 'new'],
  won: ['contacted'],
  lost: ['contacted'],
};

export default function AdminSponsorLeadsScreen({
  navigation,
}: MoreStackScreenProps<'AdminSponsorLeads'>) {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const leadsQuery = useSponsorLeads(statusFilter);
  const updateStatus = useUpdateLeadStatus();

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const handleStatusChange = (lead: SponsorLead, status: string) => {
    updateStatus.mutate(
      { leadId: lead.id, status },
      {
        onSuccess: hapticSuccess,
        onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
      }
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Link failed', 'Could not open that link.'));
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
            Sponsor Leads
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.value;
            return (
              <Pressable
                key={filter.label}
                onPress={() => {
                  hapticLight();
                  setStatusFilter(filter.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${filter.label}`}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.lime : colors.charcoal,
                  borderWidth: 1,
                  borderColor: selected ? colors.lime : colors.gray700,
                }}
              >
                <Text style={{ color: selected ? colors.black : colors.gray300, fontWeight: '700', fontSize: 13 }}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {leadsQuery.isLoading ? (
        <LoadingState />
      ) : leadsQuery.isError ? (
        <ErrorState error={leadsQuery.error} onRetry={() => leadsQuery.refetch()} />
      ) : (leadsQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No leads here"
          message="Sponsorship inquiries from the app land in this list."
        />
      ) : (
        <FlatList
          data={leadsQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setExpandedId(expanded ? null : item.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Lead from ${item.business_name}`}
                style={{
                  backgroundColor: colors.darkCard,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.white, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                      {item.business_name}
                    </Text>
                    <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {item.contact_name} · {formatFullDate(item.created_at)}
                    </Text>
                  </View>
                  <Badge label={String(item.status)} tone={STATUS_TONES[String(item.status)] ?? 'neutral'} />
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.gray500}
                    style={{ marginLeft: spacing.xs }}
                  />
                </View>

                {expanded ? (
                  <View style={{ marginTop: spacing.sm }}>
                    {item.category ? (
                      <Text style={{ color: colors.gray300, fontSize: 13, marginBottom: 4 }}>
                        Category: <Text style={{ color: colors.white }}>{item.category}</Text>
                      </Text>
                    ) : null}
                    {item.proposed_offer ? (
                      <Text style={{ color: colors.gray300, fontSize: 13, marginBottom: 4 }}>
                        Offer: <Text style={{ color: colors.white }}>{item.proposed_offer}</Text>
                      </Text>
                    ) : null}
                    {item.message ? (
                      <Text style={{ color: colors.gray300, fontSize: 13, lineHeight: 19, marginBottom: spacing.xs }}>
                        “{item.message}”
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                      <Pressable
                        onPress={() => openLink(`mailto:${item.email}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Email ${item.contact_name}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.charcoal,
                          borderRadius: radius.pill,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 8,
                        }}
                      >
                        <Ionicons name="mail-outline" size={14} color={colors.lime} />
                        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                          Email
                        </Text>
                      </Pressable>
                      {item.phone ? (
                        <Pressable
                          onPress={() => openLink(`tel:${item.phone}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Call ${item.contact_name}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.charcoal,
                            borderRadius: radius.pill,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 8,
                          }}
                        >
                          <Ionicons name="call-outline" size={14} color={colors.lime} />
                          <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                            Call
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <Text
                      style={{
                        color: colors.gray500,
                        fontSize: 11,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        marginTop: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Move to
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {(NEXT_STATUSES[String(item.status)] ?? ['contacted', 'won', 'lost']).map(
                        (status) => (
                          <Pressable
                            key={status}
                            onPress={() => handleStatusChange(item, status)}
                            accessibilityRole="button"
                            accessibilityLabel={`Mark as ${status}`}
                            style={{
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 8,
                              borderRadius: radius.pill,
                              borderWidth: 1,
                              borderColor: colors.lime,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.lime,
                                fontWeight: '800',
                                fontSize: 12,
                                textTransform: 'capitalize',
                              }}
                            >
                              {status}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
