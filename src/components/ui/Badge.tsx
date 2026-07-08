import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type Tone = 'lime' | 'neutral' | 'warning' | 'danger' | 'success';

type Props = {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
};

const TONES: Record<Tone, { bg: string; text: string }> = {
  lime: { bg: colors.lime, text: colors.black },
  neutral: { bg: colors.gray700, text: colors.white },
  warning: { bg: colors.warning, text: colors.black },
  danger: { bg: colors.danger, text: colors.white },
  success: { bg: colors.success, text: colors.black },
};

/** Small pill label ("GOING", "PENDING", "NEW PR"...). */
export function Badge({ label, tone = 'neutral', style }: Props) {
  const { bg, text } = TONES[tone];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: text,
          fontSize: 11,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
