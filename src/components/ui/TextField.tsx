import React from 'react';
import { Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export function TextField({ label, error, containerStyle, style, ...inputProps }: Props) {
  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: colors.gray300,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.gray500}
        style={[
          {
            backgroundColor: colors.charcoal,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.gray700,
            color: colors.white,
            paddingHorizontal: spacing.md,
            paddingVertical: 14,
            fontSize: 15,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 13, marginTop: spacing.xxs }}>{error}</Text>
      ) : null}
    </View>
  );
}
