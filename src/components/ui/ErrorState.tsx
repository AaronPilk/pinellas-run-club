import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { spacing, useTheme } from '@/theme';

import { Button } from './Button';

type Props = {
  /** Raw error — converted to a friendly message internally. */
  error?: unknown;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ error, message, onRetry }: Props) {
  const { colors } = useTheme();

  const text = message ?? (error !== undefined ? getErrorMessage(error) : copy.errors.generic);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
      <Ionicons
        name="alert-circle-outline"
        size={44}
        color={colors.danger}
        style={{ marginBottom: spacing.md }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '700',
          fontSize: 16,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}
      >
        {text}
      </Text>
      {onRetry ? <Button title={copy.actions.retry} onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
