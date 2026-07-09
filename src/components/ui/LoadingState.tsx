import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';

export function LoadingState() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.lime} size="large" />
    </View>
  );
}
