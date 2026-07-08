import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = {
  label: string;
  value: string | number;
  accent?: boolean;
  style?: ViewStyle;
};

/** Compact stat tile (check-ins, points, streaks). */
export function StatCard({ label, value, accent = false, style }: Props) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: accent ? colors.lime : colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: accent ? colors.black : colors.white,
          fontWeight: '900',
          fontSize: 26,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: accent ? colors.gray700 : colors.gray500,
          fontWeight: '700',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
