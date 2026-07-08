import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontWeight: '900',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 13 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
