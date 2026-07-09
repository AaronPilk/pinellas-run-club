import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Alert, Image, Linking, Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, ErrorState, LoadingState, Screen } from '@/components/ui';
import { usePartner } from '@/hooks/usePartners';
import { hapticLight } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { SponsorLevel } from '@/types/models';
import type { AppTabsParamList, MoreStackScreenProps } from '@/types/navigation';

const SPONSOR_LABELS: Record<SponsorLevel, string> = {
  community: 'Community Partner',
  bronze: 'Bronze Sponsor',
  silver: 'Silver Sponsor',
  gold: 'Gold Sponsor',
  title: 'Title Sponsor',
};

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <Card style={{ marginTop: spacing.sm }}>
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
        {label}
      </Text>
      {children}
    </Card>
  );
}

export default function PartnerDetailScreen({
  navigation,
  route,
}: MoreStackScreenProps<'PartnerDetail'>) {
  const { colors } = useTheme();

  const partnerQuery = usePartner(route.params.partnerId);
  const partner = partnerQuery.data;

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  const openLink = (url: string) => {
    hapticLight();
    Linking.openURL(url).catch(() => Alert.alert('Link failed', 'Could not open that link.'));
  };

  const handleDirections = () => {
    if (!partner) return;
    const query =
      partner.latitude != null && partner.longitude != null
        ? `${partner.latitude},${partner.longitude}`
        : (partner.address ?? partner.name);
    openLink(`https://maps.google.com/?q=${encodeURIComponent(query)}`);
  };

  if (partnerQuery.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (partnerQuery.isError || !partner) {
    return (
      <Screen>
        <ErrorState error={partnerQuery.error ?? undefined} onRetry={() => partnerQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll noPadding contentContainerStyle={{ padding: 0, paddingBottom: 120 }}>
      <View>
        {partner.cover_image_url ? (
          <Image
            source={{ uri: partner.cover_image_url }}
            style={{ width: '100%', height: 180, backgroundColor: colors.charcoal }}
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 140,
              backgroundColor: colors.charcoal,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="storefront-outline" size={44} color={colors.lime} />
          </View>
        )}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            position: 'absolute',
            top: spacing.sm,
            left: spacing.sm,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {partner.logo_url ? (
            <Image
              source={{ uri: partner.logo_url }}
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.sm,
                backgroundColor: colors.charcoal,
                marginRight: spacing.sm,
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900' }}>{partner.name}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs }}>
              <Badge label={SPONSOR_LABELS[partner.sponsor_level] ?? partner.sponsor_level} tone="lime" />
              {partner.featured ? <Badge label="Featured" tone="neutral" /> : null}
            </View>
          </View>
        </View>

        <Card style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.lime }}>
          <Text
            style={{
              color: colors.lime,
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: spacing.xs,
            }}
          >
            Member Offer
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}>
            {partner.short_offer}
          </Text>
          {partner.offer_details ? (
            <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21, marginTop: spacing.xs }}>
              {partner.offer_details}
            </Text>
          ) : null}
        </Card>

        {partner.redeem_instructions ? (
          <DetailSection label="How to redeem">
            <Text style={{ color: colors.gray200, fontSize: 14, lineHeight: 21 }}>
              {partner.redeem_instructions}
            </Text>
          </DetailSection>
        ) : null}

        {partner.address ? (
          <DetailSection label="Location">
            <Text style={{ color: colors.gray200, fontSize: 14, lineHeight: 21 }}>{partner.address}</Text>
          </DetailSection>
        ) : null}

        {partner.terms ? (
          <DetailSection label="Terms">
            <Text style={{ color: colors.gray500, fontSize: 13, lineHeight: 19 }}>{partner.terms}</Text>
          </DetailSection>
        ) : null}

        <Button
          title="Show Member Pass"
          onPress={() => tabNav?.navigate('ProfileTab', { screen: 'MemberPass' })}
          style={{ marginTop: spacing.lg }}
        />
        {partner.address || (partner.latitude != null && partner.longitude != null) ? (
          <Button
            title="Get Directions"
            variant="secondary"
            onPress={handleDirections}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          {partner.website_url ? (
            <Button
              title="Website"
              variant="ghost"
              onPress={() => openLink(partner.website_url as string)}
              style={{ flex: 1 }}
            />
          ) : null}
          {partner.instagram_url ? (
            <Button
              title="Instagram"
              variant="ghost"
              onPress={() => openLink(partner.instagram_url as string)}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
