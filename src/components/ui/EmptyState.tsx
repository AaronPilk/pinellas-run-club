import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Button } from './Button';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = 'trail-sign-outline', title, message, actionLabel, onAction }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <Ionicons name={icon} size={44} color={colors.gray500} style={{ marginBottom: spacing.md }} />
      <Text
        style={{
          color: colors.white,
          fontWeight: '800',
          fontSize: 18,
          textAlign: 'center',
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text style={{ color: colors.gray500, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}
