import React from 'react';
import { View } from 'react-native';

import { spacing } from '@/theme';

/** Vertical gap between FlatList rows. */
export function ListSeparator({ height = spacing.sm }: { height?: number }) {
  return <View style={{ height }} />;
}
