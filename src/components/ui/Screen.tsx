import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. Don't combine with FlatList screens. */
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  /** Default true: near-black background. Pass false for off-white screens. */
  dark?: boolean;
  /** Remove default padding (e.g. full-bleed lists). */
  noPadding?: boolean;
};

export function Screen({
  children,
  scroll,
  style,
  contentContainerStyle,
  dark = true,
  noPadding = false,
}: Props) {
  const backgroundColor = dark ? colors.black : colors.offWhite;
  const padding = noPadding ? 0 : spacing.md;

  if (scroll) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[{ padding, paddingBottom: 120 }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={['top', 'left', 'right']}>
      <View style={[{ flex: 1, padding }, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}
