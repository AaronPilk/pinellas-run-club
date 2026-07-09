import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { spacing, useTheme } from '@/theme';

const PERKS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'calendar', label: 'RSVP to every run & event' },
  { icon: 'location', label: 'GPS check-ins, streaks & badges' },
  { icon: 'card', label: 'Member pass & partner perks' },
  { icon: 'stopwatch', label: 'Courses & the time keeper' },
  { icon: 'chatbubbles', label: 'Direct messages with members' },
];

type Props = {
  /** Optional headline hint, e.g. "Events" or "Check-In". */
  feature?: string;
};

/**
 * Full-screen upsell shown when a non-subscriber hits gated content.
 * Subscription is a real-world club membership paid via Stripe — the button
 * links OUT to a Stripe-hosted checkout (Apple-compliant, ~0% fees). The
 * member's profile id + email ride along so the webhook can map the payment.
 */
export default function PaywallScreen({ feature }: Props) {
  const { colors } = useTheme();
  const { profile, refetchProfile } = useAuth();
  const settingsQuery = useAppSettings();
  const [refreshing, setRefreshing] = useState(false);

  const checkoutUrl = settingsQuery.data?.stripe_checkout_url ?? null;
  const priceLabel = settingsQuery.data?.subscription_price_label ?? null;

  const openCheckout = () => {
    if (!checkoutUrl || !profile) {
      Alert.alert(
        'Almost ready',
        'Membership checkout isn’t switched on yet. Please check back shortly.'
      );
      return;
    }
    const sep = checkoutUrl.includes('?') ? '&' : '?';
    const url =
      `${checkoutUrl}${sep}client_reference_id=${encodeURIComponent(profile.id)}` +
      `&prefilled_email=${encodeURIComponent(profile.email)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open checkout', 'Please try again in a moment.')
    );
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refetchProfile();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.darkCard,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name="lock-closed" size={34} color={colors.lime} />
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 26,
            fontWeight: '900',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: -0.3,
          }}
        >
          {feature ? `${feature} is for members` : 'Join the club'}
        </Text>
        <Text
          style={{
            color: colors.gray300,
            fontSize: 15,
            textAlign: 'center',
            marginTop: spacing.xs,
            lineHeight: 21,
            paddingHorizontal: spacing.md,
          }}
        >
          The feed is free. A membership unlocks everything else the club has to offer.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {PERKS.map((perk) => (
          <View key={perk.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.darkCard,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={perk.icon} size={20} color={colors.lime} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 }}>
              {perk.label}
            </Text>
          </View>
        ))}
      </View>

      {priceLabel ? (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: spacing.xl,
          }}
        >
          {priceLabel}
        </Text>
      ) : null}

      <Button
        title="Become a Member"
        onPress={openCheckout}
        style={{ marginTop: priceLabel ? spacing.md : spacing.xl }}
      />

      <Button
        title={refreshing ? 'Checking…' : 'I already joined — refresh'}
        onPress={refresh}
        variant="ghost"
        loading={refreshing}
        style={{ marginTop: spacing.sm }}
      />

      <Text
        style={{
          color: colors.gray500,
          fontSize: 12,
          textAlign: 'center',
          marginTop: spacing.md,
          lineHeight: 18,
          paddingHorizontal: spacing.md,
        }}
      >
        Checkout opens securely in your browser. Your membership activates here
        automatically once payment is confirmed.
      </Text>
    </Screen>
  );
}
