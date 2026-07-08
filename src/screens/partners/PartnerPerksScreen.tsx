import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { usePartners } from '@/hooks/usePartners';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { Partner, PartnerCategory } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

export const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  food_drink: 'Food & Drink',
  fitness: 'Fitness',
  retail: 'Retail',
  recovery: 'Recovery',
  wellness: 'Wellness',
  events: 'Events',
  other: 'Other',
};

const FILTERS: { value: PartnerCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
];

function PartnerLogo({ partner, size = 52 }: { partner: Partner; size?: number }) {
  if (partner.logo_url) {
    return (
      <Image
        source={{ uri: partner.logo_url }}
        style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: colors.charcoal }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        backgroundColor: colors.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="storefront-outline" size={size * 0.45} color={colors.lime} />
    </View>
  );
}

function PartnerCard({ partner, onPress }: { partner: Partner; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${partner.name}: ${partner.short_offer}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.darkCard,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.xs,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <PartnerLogo partner={partner} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
            {partner.name}
          </Text>
          {partner.featured ? <Badge label="Featured" tone="lime" /> : null}
        </View>
        <Text style={{ color: colors.lime, fontSize: 13, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
          {partner.short_offer}
        </Text>
        <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }}>
          {CATEGORY_LABELS[partner.category] ?? partner.category}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
    </Pressable>
  );
}

export default function PartnerPerksScreen({ navigation }: MoreStackScreenProps<'PartnerPerks'>) {
  const partnersQuery = usePartners();
  const [filter, setFilter] = useState<PartnerCategory | 'all'>('all');

  const partners = partnersQuery.data ?? [];

  const filtered = useMemo(
    () => (filter === 'all' ? partners : partners.filter((partner) => partner.category === filter)),
    [partners, filter]
  );

  const featured = filter === 'all' ? filtered.filter((partner) => partner.featured) : [];
  const rest = filter === 'all' ? filtered.filter((partner) => !partner.featured) : filtered;

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
          <View style={{ marginLeft: spacing.xs }}>
            <Text
              style={{
                color: colors.white,
                fontSize: 20,
                fontWeight: '900',
                textTransform: 'uppercase',
              }}
            >
              Partner Perks
            </Text>
            <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '600' }}>
              {copy.partners.showYourCard}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.sm }}
          contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.sm }}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  hapticLight();
                  setFilter(item.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${item.label}`}
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
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {partnersQuery.isLoading ? (
        <LoadingState />
      ) : partnersQuery.isError ? (
        <ErrorState error={partnersQuery.error} onRetry={() => partnersQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title={copy.partners.empty}
          message={filter === 'all' ? undefined : 'No partners in this category yet.'}
        />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          ListHeaderComponent={
            featured.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Text
                  style={{
                    color: colors.gray500,
                    fontSize: 12,
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: spacing.xs,
                  }}
                >
                  Featured
                </Text>
                {featured.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onPress={() => navigation.navigate('PartnerDetail', { partnerId: partner.id })}
                  />
                ))}
                {rest.length > 0 ? (
                  <Text
                    style={{
                      color: colors.gray500,
                      fontSize: 12,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginTop: spacing.sm,
                      marginBottom: spacing.xs,
                    }}
                  >
                    All Partners
                  </Text>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PartnerCard
              partner={item}
              onPress={() => navigation.navigate('PartnerDetail', { partnerId: item.id })}
            />
          )}
        />
      )}
    </Screen>
  );
}
