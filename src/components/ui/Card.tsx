import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Card({ children, onPress, style }: Props) {
  const base: ViewStyle = {
    backgroundColor: colors.darkCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
