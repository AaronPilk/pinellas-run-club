import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { copy } from '@/lib/copy';
import { colors, spacing } from '@/theme';
import type { AuthStackScreenProps } from '@/types/navigation';

const BULLETS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'people-outline', label: 'Build community' },
  { icon: 'chatbubbles-outline', label: 'Stay connected' },
  { icon: 'stopwatch-outline', label: 'Track your progress' },
  { icon: 'pricetag-outline', label: 'Exclusive perks' },
  { icon: 'storefront-outline', label: 'Support local' },
];

export default function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: spacing.lg }}>
        {/* Brand block */}
        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={{
              color: colors.white,
              fontWeight: '900',
              fontSize: 44,
              lineHeight: 46,
              textTransform: 'uppercase',
              letterSpacing: -1,
            }}
            accessibilityRole="header"
          >
            Pinellas{'\n'}Run Club
          </Text>
          <Text
            style={{
              color: colors.lime,
              fontWeight: '800',
              fontSize: 20,
              marginTop: spacing.sm,
              fontStyle: 'italic',
            }}
          >
            {copy.brand.tagline}
          </Text>
          <Text
            style={{
              color: colors.gray300,
              fontSize: 16,
              lineHeight: 23,
              marginTop: spacing.md,
            }}
          >
            {copy.brand.short}
          </Text>
        </View>

        {/* Value bullets */}
        <View style={{ gap: spacing.sm }}>
          {BULLETS.map((bullet) => (
            <View
              key={bullet.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.charcoal,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={bullet.icon} size={17} color={colors.lime} />
              </View>
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>
                {bullet.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={{ gap: spacing.sm }}>
          <Button title={copy.auth.signUp} onPress={() => navigation.navigate('SignUp')} />
          <Button
            title={copy.auth.signIn}
            variant="secondary"
            onPress={() => navigation.navigate('SignIn')}
          />
          <Text
            style={{
              color: colors.gray500,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: '600',
              marginTop: spacing.xs,
            }}
          >
            {copy.brand.together}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
