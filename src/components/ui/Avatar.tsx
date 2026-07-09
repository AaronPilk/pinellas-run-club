import React from 'react';
import { Image, Text, View } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  /** Avatar image URL; falls back to initials when missing. */
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ uri, name, size = 40 }: Props) {
  const { colors } = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.charcoal }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.gray700,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.lime, fontWeight: '800', fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}
